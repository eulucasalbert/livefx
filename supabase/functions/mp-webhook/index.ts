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
  if (!xSignature || !xRequestId) return true; // old-style notification

  // Parse x-signature: ts=...,v1=...
  const parts: Record<string, string> = {};
  for (const part of xSignature.split(",")) {
    const [key, val] = part.split("=");
    parts[key.trim()] = val.trim();
  }

  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return true;

  // Get data.id from query params
  const url = new URL(req.url);
  const dataId = url.searchParams.get("data.id") || "";

  // Build manifest: id:[data.id];request-id:[x-request-id];ts:[ts];
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MP_ACCESS_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!MP_ACCESS_TOKEN) throw new Error("MERCADO_PAGO_ACCESS_TOKEN not configured");

    const bodyText = await req.text();

    // Verify signature
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

    // Parse body from already-read text
    let body: any = {};
    try {
      body = JSON.parse(bodyText);
    } catch {
      // query params only
    }

    const actionType = topic || body?.type || body?.action;
    const dataId = id || body?.data?.id;

    console.log("Webhook received:", { actionType, dataId, body });

    // We only care about payment notifications
    if (actionType !== "payment" && actionType !== "payment.updated" && actionType !== "payment.created") {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!dataId) {
      return new Response(JSON.stringify({ error: "No payment id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch payment details from Mercado Pago
    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });

    if (!paymentRes.ok) {
      console.error("Failed to fetch payment:", paymentRes.status);
      return new Response(JSON.stringify({ error: "Failed to fetch payment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payment = await paymentRes.json();
    console.log("Payment details:", { status: payment.status, external_reference: payment.external_reference });

    const purchaseId = payment.external_reference;
    if (!purchaseId) {
      return new Response(JSON.stringify({ error: "No external_reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map MP status to our status
    let purchaseStatus = "pending";
    if (payment.status === "approved") purchaseStatus = "completed";
    else if (payment.status === "rejected" || payment.status === "cancelled") purchaseStatus = "failed";

    // Update purchase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: updateError } = await supabase
      .from("purchases")
      .update({ status: purchaseStatus, stripe_session_id: String(dataId) })
      .eq("id", purchaseId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error(`Failed to update purchase: ${updateError.message}`);
    }

    console.log(`Purchase ${purchaseId} updated to ${purchaseStatus}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
