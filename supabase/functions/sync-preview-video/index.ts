import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
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

function extractFileId(rawId: string): string {
  let id = rawId.trim();
  const driveUrlMatch = id.match(/\/d\/([a-zA-Z0-9_-]+)|\/files\/([a-zA-Z0-9_-]+)/);
  if (driveUrlMatch) {
    id = driveUrlMatch[1] || driveUrlMatch[2];
  } else {
    id = id.split('/')[0].split('?')[0];
  }
  return id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { googleDriveFileId: rawFileId, productId, format } = body;
    // format: "webm" (default) or "mp4"
    const videoFormat = format === "mp4" ? "mp4" : "webm";

    if (!rawFileId || !productId) {
      return new Response(JSON.stringify({ error: "Missing googleDriveFileId or productId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const googleDriveFileId = extractFileId(rawFileId);

    // Get Google access token
    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON")!;
    const accessToken = await getGoogleAccessToken(serviceAccountJson);

    // Download video from Google Drive
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${googleDriveFileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!driveRes.ok) {
      const errText = await driveRes.text();
      throw new Error(`Google Drive error: ${driveRes.status} ${errText}`);
    }

    const videoBytes = await driveRes.arrayBuffer();
    const fileName = `${productId}.${videoFormat}`;
    const contentType = videoFormat === "mp4" ? "video/mp4" : "video/webm";

    // Upload to Supabase Storage (preview-videos bucket) - upsert
    await adminClient.storage.from("preview-videos").remove([fileName]);
    const { error: uploadError } = await adminClient.storage
      .from("preview-videos")
      .upload(fileName, videoBytes, {
        contentType,
        upsert: true,
      });

    if (uploadError) throw new Error(`Storage upload error: ${uploadError.message}`);

    // Get public URL
    const { data: urlData } = adminClient.storage
      .from("preview-videos")
      .getPublicUrl(fileName);

    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    // Update the correct column based on format
    const updateField = videoFormat === "mp4" ? "preview_video_url_mp4" : "preview_video_url";
    const { error: updateError } = await adminClient
      .from("products")
      .update({ [updateField]: publicUrl })
      .eq("id", productId);

    if (updateError) throw new Error(`DB update error: ${updateError.message}`);

    return new Response(JSON.stringify({ success: true, [updateField]: publicUrl }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("sync-preview-video error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
