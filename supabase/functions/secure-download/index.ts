import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);

  // Build JWT
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(String.fromCharCode(...encoder.encode(JSON.stringify(header))))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const payloadB64 = btoa(String.fromCharCode(...encoder.encode(JSON.stringify(payload))))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const signInput = `${headerB64}.${payloadB64}`;

  // Import RSA key
  const pemContent = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "").replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", binaryDer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, encoder.encode(signInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const jwt = `${signInput}.${sigB64}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error("Failed to get Google access token");
  return tokenData.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const productId = url.searchParams.get("productId");
    if (!productId) {
      return new Response(JSON.stringify({ error: "Missing productId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Verify purchase
    const { data: purchase } = await adminClient
      .from("purchases")
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .eq("status", "completed")
      .maybeSingle();

    if (!purchase) {
      return new Response(JSON.stringify({ error: "Purchase not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get product's google_drive_file_id
    const { data: product } = await adminClient
      .from("products")
      .select("google_drive_file_id, name")
      .eq("id", productId)
      .single();

    if (!product?.google_drive_file_id) {
      return new Response(JSON.stringify({ error: "Download not configured" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract pure file ID from various Google Drive URL formats
    let fileId = product.google_drive_file_id.trim();
    const driveUrlMatch = fileId.match(/\/d\/([a-zA-Z0-9_-]+)|\/files\/([a-zA-Z0-9_-]+)/);
    if (driveUrlMatch) {
      fileId = driveUrlMatch[1] || driveUrlMatch[2];
    } else {
      fileId = fileId.split('/')[0].split('?')[0];
    }

    // Get Google access token
    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON")!;
    const accessToken = await getGoogleAccessToken(serviceAccountJson);

    // Get file metadata first to know the real name/extension
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const fileMeta = metaRes.ok ? await metaRes.json() : null;

    // Fetch file from Google Drive
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!driveRes.ok) {
      const errText = await driveRes.text();
      throw new Error(`Google Drive error: ${driveRes.status} ${errText}`);
    }

    // Determine file extension from content type or file metadata
    const contentType = driveRes.headers.get("Content-Type") || "application/octet-stream";
    const extMap: Record<string, string> = {
      "video/webm": ".webm",
      "video/mp4": ".mp4",
      "video/quicktime": ".mov",
      "video/x-msvideo": ".avi",
      "video/x-matroska": ".mkv",
      "audio/mpeg": ".mp3",
      "audio/wav": ".wav",
      "image/png": ".png",
      "image/jpeg": ".jpg",
      "image/gif": ".gif",
      "application/zip": ".zip",
      "application/x-rar-compressed": ".rar",
      "application/pdf": ".pdf",
    };

    // Try to get extension from: 1) Google Drive file name, 2) content-type map
    let fileName = product.name;
    if (fileMeta?.name) {
      const metaExt = fileMeta.name.match(/\.[a-zA-Z0-9]+$/);
      if (metaExt) {
        fileName = product.name + metaExt[0];
      } else {
        fileName = product.name + (extMap[contentType] || "");
      }
    } else {
      fileName = product.name + (extMap[contentType] || "");
    }

    // Stream the file back
    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", `attachment; filename="${fileName}"`);
    if (driveRes.headers.get("Content-Length")) {
      headers.set("Content-Length", driveRes.headers.get("Content-Length")!);
    }

    return new Response(driveRes.body, { status: 200, headers });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
