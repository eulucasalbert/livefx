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

    // Payt sends JSON payload
    const body = await req.json();

    console.log("Payt postback received, status:", body.status, "transaction_id:", body.transaction_id);

    // Extract fields from real Payt payload structure
    const transactionId = body.transaction_id;
    const status = body.status || body.transaction?.payment_status;
    const productCode = body.product?.code;
    const buyerEmail = body.customer?.email;

    if (!transactionId || !status) {
      console.error("Missing transaction_id or status");
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

    if (!userId) {
      console.log("User not found for email:", buyerEmail);
      return new Response(JSON.stringify({ success: true, message: "User not found, skipping" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find product by matching the Payt product code
    // First try exact match on id, then try matching by name or other fields
    let productId: string | null = null;
    if (productCode) {
      // Try to find product - you may need to store payt_product_code in your products table
      const { data: products } = await supabase
        .from("products")
        .select("id")
        .limit(100);

      // For now, if there's only one product or you map codes manually
      // You should add a payt_product_code column to products table for proper mapping
      if (products && products.length > 0) {
        // Use first product as fallback - ideally map by payt code
        productId = products[0].id;
      }
    }

    if (productId && userId) {
      const { error: upsertError } = await supabase
        .from("purchases")
        .upsert(
          {
            user_id: userId,
            product_id: productId,
            status: mappedStatus,
            stripe_session_id: transactionId,
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

      console.log("Purchase upserted successfully for user:", userId, "product:", productId, "status:", mappedStatus);
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
