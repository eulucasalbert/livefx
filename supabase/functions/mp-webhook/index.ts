import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function verifySignature(req: Request, body: string): Promise<boolean> {
  const secret = Deno.env.get("MP_WEBHOOK_SECRET");
  if (!secret) {
    console.warn("MP_WEBHOOK_SECRET not set, skipping signature validation");
    return true;
  }

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");
  if (!xSignature || !xRequestId) return true;

  const parts: Record<string, string> = {};
  for (const part of xSignature.split(",")) {
    const [key, val] = part.split("=");
    parts[key.trim()] = val.trim();
  }

  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return true;

  const url = new URL(req.url);
  const dataId = url.searchParams.get("data.id") || "";

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  const key = new TextEncoder().encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(manifest));
  const hash = encodeHex(new Uint8Array(sig));

  if (hash !== v1) {
    console.error("Invalid webhook signature");
    return false;
  }
  return true;
}

async function processPayment(dataId: string, mpAccessToken: string) {
  try {
    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      headers: { Authorization: `Bearer ${mpAccessToken}` },
    });

    if (!paymentRes.ok) {
      console.error("Failed to fetch payment:", paymentRes.status);
      return;
    }

    const payment = await paymentRes.json();
    console.log("Payment details:", { status: payment.status, external_reference: payment.external_reference });

    const externalRef = payment.external_reference;
    if (!externalRef) {
      console.error("No external_reference in payment");
      return;
    }

    let purchaseStatus = "pending";
    if (payment.status === "approved") purchaseStatus = "completed";
    else if (payment.status === "rejected" || payment.status === "cancelled") purchaseStatus = "failed";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Handle comma-separated purchase IDs (bundle/combo purchases)
    const purchaseIds = externalRef.split(",").map((id: string) => id.trim()).filter(Boolean);

    for (const purchaseId of purchaseIds) {
      const { error: updateError } = await supabase
        .from("purchases")
        .update({ status: purchaseStatus, stripe_session_id: String(dataId) })
        .eq("id", purchaseId);

      if (updateError) {
        console.error(`Update error for ${purchaseId}:`, updateError);
      } else {
        console.log(`Purchase ${purchaseId} updated to ${purchaseStatus}`);
      }
    }
    console.log(`Purchase ${purchaseId} updated to ${purchaseStatus}`);
  } catch (error) {
    console.error("Async processing error:", error);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MP_ACCESS_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!MP_ACCESS_TOKEN) throw new Error("MERCADO_PAGO_ACCESS_TOKEN not configured");

    const bodyText = await req.text();

    const valid = await verifySignature(req, bodyText);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const topic = url.searchParams.get("topic") || url.searchParams.get("type");
    const id = url.searchParams.get("data.id") || url.searchParams.get("id");

    let body: any = {};
    try { body = JSON.parse(bodyText); } catch { /* query params only */ }

    const actionType = topic || body?.type || body?.action;
    const dataId = id || body?.data?.id;

    console.log("Webhook received:", { actionType, dataId });

    // Return 200 immediately, then process asynchronously
    const isPayment = actionType === "payment" || actionType === "payment.updated" || actionType === "payment.created";

    if (isPayment && dataId) {
      // Fire-and-forget: process in background
      // Process payment inline (EdgeRuntime not available in Deno)
      await processPayment(String(dataId), MP_ACCESS_TOKEN);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
