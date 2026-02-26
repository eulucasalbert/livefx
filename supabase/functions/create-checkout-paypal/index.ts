import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BRL_TO_USD = 0.18;

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_SECRET");
  if (!clientId || !secret) throw new Error("PayPal credentials not configured");

  const res = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("PayPal token error:", text);
    throw new Error(`PayPal auth failed: ${res.status}`);
  }

  const data = await res.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const body = await req.json();
    const { productId, bundleId } = body;

    if (!productId && !bundleId) throw new Error("productId or bundleId is required");

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const SITE_URL = "https://livefx.lovable.app";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

    // Get PayPal access token
    const paypalToken = await getPayPalAccessToken();

    // ── BUNDLE checkout ──
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
          JSON.stringify({ error: "You already own all effects in this combo!" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create pending purchases
      const purchaseIds: string[] = [];
      for (const pid of productIds) {
        if (alreadyOwned.includes(pid)) continue;
        const { data: existing } = await adminClient
          .from("purchases")
          .select("id")
          .eq("user_id", userId)
          .eq("product_id", pid)
          .single();

        if (existing) {
          await adminClient.from("purchases").update({ status: "pending" }).eq("id", existing.id);
          purchaseIds.push(existing.id);
        } else {
          const { data: purchase, error: purchaseError } = await adminClient
            .from("purchases")
            .insert({ user_id: userId, product_id: pid, status: "pending" })
            .select("id")
            .single();
          if (purchaseError) throw new Error(`Failed to create purchase: ${purchaseError.message}`);
          purchaseIds.push(purchase.id);
        }
      }

      const externalRef = purchaseIds.join(",");
      const priceUSD = (Number(bundle.price) * BRL_TO_USD).toFixed(2);

      const orderPayload = {
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: externalRef,
            description: `Combo: ${bundle.name}`,
            amount: {
              currency_code: "USD",
              value: priceUSD,
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: "LiveFX",
              landing_page: "LOGIN",
              user_action: "PAY_NOW",
              return_url: `${SITE_URL}/?purchase=success`,
              cancel_url: `${SITE_URL}/?purchase=failure`,
            },
          },
        },
      };

      const ppRes = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${paypalToken}`,
        },
        body: JSON.stringify(orderPayload),
      });

      const ppData = await ppRes.json();
      if (!ppRes.ok) {
        console.error("PayPal Error:", JSON.stringify(ppData));
        throw new Error(`PayPal error: ${ppRes.status}`);
      }

      const approveLink = ppData.links?.find((l: any) => l.rel === "payer-action")?.href;
      if (!approveLink) throw new Error("PayPal approve link not found");

      return new Response(
        JSON.stringify({ approve_url: approveLink, purchase_ids: purchaseIds, order_id: ppData.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── SINGLE PRODUCT checkout ──
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (productError || !product) throw new Error("Product not found");

    const { data: existing } = await adminClient
      .from("purchases")
      .select("id, status")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .single();

    if (existing?.status === "completed") {
      return new Response(
        JSON.stringify({ error: "You already purchased this effect!" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let purchaseId: string;
    if (existing) {
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

    const priceUSD = (Number(product.price) * BRL_TO_USD).toFixed(2);

    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: purchaseId,
          description: product.name,
          amount: {
            currency_code: "USD",
            value: priceUSD,
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "LiveFX",
            landing_page: "LOGIN",
            user_action: "PAY_NOW",
            return_url: `${SITE_URL}/?purchase=success&paypal_order_id={order_id}`,
            cancel_url: `${SITE_URL}/?purchase=failure`,
          },
        },
      },
    };

    const ppRes = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${paypalToken}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const ppData = await ppRes.json();
    if (!ppRes.ok) {
      console.error("PayPal Error:", JSON.stringify(ppData));
      throw new Error(`PayPal error: ${ppRes.status}`);
    }

    const approveLink = ppData.links?.find((l: any) => l.rel === "payer-action")?.href;
    if (!approveLink) throw new Error("PayPal approve link not found");

    return new Response(
      JSON.stringify({ approve_url: approveLink, purchase_id: purchaseId, order_id: ppData.id }),
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
