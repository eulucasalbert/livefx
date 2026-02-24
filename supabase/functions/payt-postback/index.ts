import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Payt sends form-urlencoded or JSON
    let body: Record<string, string>;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries()) as Record<string, string>;
    } else {
      body = await req.json();
    }

    console.log("Payt postback received:", JSON.stringify(body));

    const transactionId = body.transaction_id || body.transacao_id;
    const status = body.status;
    const productId = body.product_id || body.produto_id;
    const buyerEmail = body.buyer_email || body.email_comprador || body.email;

    if (!transactionId || !status) {
      return new Response(
        JSON.stringify({ error: "Missing transaction_id or status" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map Payt status to our status
    const statusMap: Record<string, string> = {
      approved: "completed",
      paid: "completed",
      completed: "completed",
      refunded: "refunded",
      cancelled: "cancelled",
      canceled: "cancelled",
      pending: "pending",
      waiting_payment: "pending",
    };

    const mappedStatus = statusMap[status.toLowerCase()] || status.toLowerCase();

    // Find user by email if provided
    let userId: string | null = null;
    if (buyerEmail) {
      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users?.users?.find(
        (u) => u.email?.toLowerCase() === buyerEmail.toLowerCase()
      );
      if (user) userId = user.id;
    }

    // Upsert purchase record
    if (productId && userId) {
      const { error: upsertError } = await supabase
        .from("purchases")
        .upsert(
          {
            user_id: userId,
            product_id: productId,
            status: mappedStatus,
            stripe_session_id: transactionId, // reusing column for payt transaction id
          },
          { onConflict: "user_id,product_id" }
        );

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        return new Response(
          JSON.stringify({ error: "Failed to update purchase" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Postback error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
