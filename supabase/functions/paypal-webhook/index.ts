import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // This endpoint is called from the frontend after PayPal redirect
  // to capture the payment and complete the purchase
  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) throw new Error("orderId is required");

    const paypalToken = await getPayPalAccessToken();

    // Capture the order
    const captureRes = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${paypalToken}`,
      },
    });

    const captureData = await captureRes.json();
    console.log("PayPal capture response:", JSON.stringify(captureData));

    // Handle already captured case - still need to mark purchases as completed
    if (!captureRes.ok) {
      if (captureData.details?.[0]?.issue === "ORDER_ALREADY_CAPTURED") {
        console.log("Order already captured, checking purchase status...");
        // Fetch the original order to get reference_id
        const orderRes = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${paypalToken}` },
        });
        const orderData = await orderRes.json();
        const referenceId = orderData.purchase_units?.[0]?.reference_id;
        if (referenceId) {
          const purchaseIds = referenceId.split(",");
          const adminClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          );
          for (const purchaseId of purchaseIds) {
            const trimmedId = purchaseId.trim();
            if (!trimmedId) continue;
            const { error } = await adminClient
              .from("purchases")
              .update({ status: "completed" })
              .eq("id", trimmedId);
            if (error) {
              console.error(`Failed to update purchase ${trimmedId}:`, error.message);
            } else {
              console.log(`Purchase ${trimmedId} marked as completed (already_captured)`);
            }
          }
        }
        return new Response(JSON.stringify({ status: "already_captured" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("PayPal capture error:", JSON.stringify(captureData));
      throw new Error(`PayPal capture failed: ${captureRes.status}`);
    }

    if (captureData.status !== "COMPLETED") {
      return new Response(JSON.stringify({ status: captureData.status }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract purchase IDs from reference_id
    const referenceId = captureData.purchase_units?.[0]?.reference_id;
    if (!referenceId) throw new Error("No reference_id found in PayPal order");

    const purchaseIds = referenceId.split(",");

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Mark all purchases as completed
    for (const purchaseId of purchaseIds) {
      const trimmedId = purchaseId.trim();
      if (!trimmedId) continue;

      const { error } = await adminClient
        .from("purchases")
        .update({ status: "completed" })
        .eq("id", trimmedId);

      if (error) {
        console.error(`Failed to update purchase ${trimmedId}:`, error.message);
      } else {
        console.log(`Purchase ${trimmedId} marked as completed`);
      }
    }

    return new Response(
      JSON.stringify({ status: "completed", purchase_ids: purchaseIds }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("PayPal webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
