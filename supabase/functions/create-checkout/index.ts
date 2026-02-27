import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MP_ACCESS_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!MP_ACCESS_TOKEN) throw new Error("MERCADO_PAGO_ACCESS_TOKEN not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email as string;

    const body = await req.json();
    const { productId, bundleId, couponCode } = body;

    if (!productId && !bundleId) throw new Error("productId or bundleId is required");

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const SITE_URL = "https://livefx.lovable.app";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

    // Validate coupon if provided
    let discountPercent = 0;
    let couponId: string | null = null;
    if (couponCode) {
      const { data: coupon, error: couponError } = await adminClient
        .from("coupons")
        .select("*")
        .eq("code", couponCode.trim().toUpperCase())
        .eq("used", false)
        .maybeSingle();
      if (couponError || !coupon) {
        return new Response(
          JSON.stringify({ error: "Cupom inválido ou já utilizado" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      discountPercent = coupon.discount_percent;
      couponId = coupon.id;
    }

    const applyDiscount = (price: number) => {
      if (discountPercent <= 0) return price;
      return Math.round(price * (1 - discountPercent / 100) * 100) / 100;
    };

    // Mark coupon as used
    const markCouponUsed = async () => {
      if (couponId) {
        await adminClient.from("coupons").update({ used: true, used_by: userId, used_at: new Date().toISOString() }).eq("id", couponId);
      }
    };

    // ── BUNDLE / COMBO checkout ──
    if (bundleId) {
      const { data: bundle, error: bundleError } = await supabase
        .from("bundles")
        .select("*")
        .eq("id", bundleId)
        .single();
      if (bundleError || !bundle) throw new Error("Bundle not found");

      const { data: bundleProducts } = await supabase
        .from("bundle_products")
        .select("product_id, products(id, name, price)")
        .eq("bundle_id", bundleId);

      if (!bundleProducts || bundleProducts.length === 0) throw new Error("Bundle has no products");

      const productIds = bundleProducts.map((bp: any) => bp.product_id);

      const { data: existingPurchases } = await adminClient
        .from("purchases")
        .select("product_id")
        .eq("user_id", userId)
        .eq("status", "completed")
        .in("product_id", productIds);

      const alreadyOwned = (existingPurchases || []).map((p: any) => p.product_id);
      if (alreadyOwned.length === productIds.length) {
        return new Response(
          JSON.stringify({ error: "Você já possui todos os efeitos deste combo!" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const purchaseIds: string[] = [];
      for (const pid of productIds) {
        if (alreadyOwned.includes(pid)) continue;
        const { data: existing } = await adminClient
          .from("purchases").select("id").eq("user_id", userId).eq("product_id", pid).single();
        if (existing) {
          await adminClient.from("purchases").update({ status: "pending" }).eq("id", existing.id);
          purchaseIds.push(existing.id);
        } else {
          const { data: purchase, error: purchaseError } = await adminClient
            .from("purchases").insert({ user_id: userId, product_id: pid, status: "pending" }).select("id").single();
          if (purchaseError) throw new Error(`Failed to create purchase: ${purchaseError.message}`);
          purchaseIds.push(purchase.id);
        }
      }

      const externalRef = purchaseIds.join(",");
      const finalPrice = applyDiscount(Number(bundle.price));

      // Mark coupon as used before creating payment
      await markCouponUsed();

      const preference = {
        items: [{
          id: bundleId,
          title: `Combo: ${bundle.name}`,
          description: bundle.effects || bundle.name,
          quantity: 1,
          currency_id: "BRL",
          unit_price: finalPrice,
        }],
        payer: { email: userEmail },
        payment_methods: { excluded_payment_types: [], installments: finalPrice < 10 ? 1 : 12 },
        back_urls: {
          success: `${SITE_URL}/?purchase=success`,
          failure: `${SITE_URL}/?purchase=failure`,
          pending: `${SITE_URL}/?purchase=pending`,
        },
        auto_return: "approved",
        external_reference: externalRef,
        notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
      };

      const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
        body: JSON.stringify(preference),
      });

      const mpData = await mpResponse.json();
      if (!mpResponse.ok) {
        console.error("MP Error:", JSON.stringify(mpData));
        throw new Error(`Mercado Pago error: ${mpResponse.status}`);
      }

      return new Response(
        JSON.stringify({ init_point: mpData.init_point, purchase_ids: purchaseIds }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── SINGLE PRODUCT checkout ──
    const { data: product, error: productError } = await supabase
      .from("products").select("*").eq("id", productId).single();
    if (productError || !product) throw new Error("Product not found");

    const { data: existing } = await adminClient
      .from("purchases").select("id, status").eq("user_id", userId).eq("product_id", productId).single();

    if (existing?.status === "completed") {
      return new Response(
        JSON.stringify({ error: "Você já comprou este efeito!" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let purchaseId: string;
    if (existing) {
      await adminClient.from("purchases").update({ status: "pending" }).eq("id", existing.id);
      purchaseId = existing.id;
    } else {
      const { data: purchase, error: purchaseError } = await adminClient
        .from("purchases").insert({ user_id: userId, product_id: productId, status: "pending" }).select("id").single();
      if (purchaseError) throw new Error(`Failed to create purchase: ${purchaseError.message}`);
      purchaseId = purchase.id;
    }

    const finalPrice = applyDiscount(Number(product.price));

    // Mark coupon as used before creating payment
    await markCouponUsed();

    const preference = {
      items: [{
        id: product.id,
        title: product.name,
        description: product.description || product.name,
        quantity: 1,
        currency_id: "BRL",
        unit_price: finalPrice,
      }],
      payer: { email: userEmail },
      payment_methods: { excluded_payment_types: [], installments: finalPrice < 10 ? 1 : 12 },
      back_urls: {
        success: `${SITE_URL}/?purchase=success`,
        failure: `${SITE_URL}/?purchase=failure`,
        pending: `${SITE_URL}/?purchase=pending`,
      },
      auto_return: "approved",
      external_reference: purchaseId,
      notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
    };

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      body: JSON.stringify(preference),
    });

    const mpData = await mpResponse.json();
    if (!mpResponse.ok) {
      console.error("MP Error:", JSON.stringify(mpData));
      throw new Error(`Mercado Pago error: ${mpResponse.status}`);
    }

    return new Response(
      JSON.stringify({ init_point: mpData.init_point, purchase_id: purchaseId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
