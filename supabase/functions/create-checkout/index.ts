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

    // Auth
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

    const { productId } = await req.json();
    if (!productId) throw new Error("productId is required");

    // Fetch product
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (productError || !product) throw new Error("Product not found");

    // Create or reuse pending purchase
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check for existing purchase
    const { data: existing } = await adminClient
      .from("purchases")
      .select("id, status")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .single();

    if (existing?.status === "completed") {
      return new Response(
        JSON.stringify({ error: "Você já comprou este efeito!" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let purchaseId: string;

    if (existing) {
      // Reuse existing pending/failed purchase
      await adminClient.from("purchases").update({ status: "pending" }).eq("id", existing.id);
      purchaseId = existing.id;
    } else {
      const { data: purchase, error: purchaseError } = await adminClient
        .from("purchases")
        .insert({ user_id: userId, product_id: productId, status: "pending" })
        .select("id")
        .single();
      if (purchaseError) throw new Error(`Failed to create purchase: ${purchaseError.message}`);
      purchaseId = purchase.id;
    }

    const SITE_URL = "https://livefx.lovable.app";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

    // Create Mercado Pago preference
    const preference = {
      items: [
        {
          id: product.id,
          title: product.name,
          description: product.description || product.name,
          quantity: 1,
          currency_id: "BRL",
          unit_price: Number(product.price),
        },
      ],
      payer: { email: userEmail },
      payment_methods: {
        excluded_payment_types: [],
        installments: 12,
      },
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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    const mpData = await mpResponse.json();
    if (!mpResponse.ok) {
      console.error("MP Error:", JSON.stringify(mpData));
      throw new Error(`Mercado Pago error: ${mpResponse.status}`);
    }

    const checkoutUrl = mpData.init_point;
    if (!checkoutUrl) throw new Error("Mercado Pago did not return a checkout URL");

    return new Response(
      JSON.stringify({ init_point: checkoutUrl, purchase_id: purchaseId }),
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
