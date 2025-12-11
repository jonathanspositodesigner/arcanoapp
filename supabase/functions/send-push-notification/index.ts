import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Base64URL encoding/decoding helpers
function base64UrlEncode(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.byteLength; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

// Generate VAPID JWT for authorization
async function generateVapidJwt(
  audience: string,
  subject: string,
  publicKey: string,
  privateKey: string
): Promise<string> {
  const header = { alg: "ES256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: subject,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Decode public key to get x,y coordinates (65 bytes: 0x04 + 32 + 32)
  const pubKeyBytes = base64UrlDecode(publicKey);
  const x = base64UrlEncode(pubKeyBytes.slice(1, 33));
  const y = base64UrlEncode(pubKeyBytes.slice(33, 65));

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y, d: privateKey },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const sigBytes = new Uint8Array(signature);
  return `${unsignedToken}.${base64UrlEncode(sigBytes)}`;
}

// Encrypt payload using aes128gcm (Web Push encryption)
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const payloadBytes = new TextEncoder().encode(payload);
  
  // Generate local key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  // Export local public key
  const localPublicKeyRaw = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyRaw);

  // Import subscriber's public key
  const subscriberPubKeyBytes = base64UrlDecode(p256dhKey);
  const subscriberPubKey = await crypto.subtle.importKey(
    "raw",
    subscriberPubKeyBytes.buffer as ArrayBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberPubKey },
    localKeyPair.privateKey,
    256
  );

  // Import auth secret
  const authSecretBytes = base64UrlDecode(authSecret);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF to derive encryption key and nonce
  const sharedSecretKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  // Derive PRK using HKDF with auth info
  const ikm = concatUint8Arrays(
    new TextEncoder().encode("WebPush: info\0"),
    subscriberPubKeyBytes,
    localPublicKey
  );

  const prk = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: authSecretBytes.buffer as ArrayBuffer,
      info: ikm.buffer as ArrayBuffer,
    },
    sharedSecretKey,
    256
  );

  const prkImported = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  // Derive CEK (content encryption key)
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const cekBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt.buffer as ArrayBuffer,
      info: cekInfo.buffer as ArrayBuffer,
    },
    prkImported,
    128
  );

  // Derive nonce
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");
  const nonceBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt.buffer as ArrayBuffer,
      info: nonceInfo.buffer as ArrayBuffer,
    },
    prkImported,
    96
  );

  // Import CEK for AES-GCM
  const cek = await crypto.subtle.importKey(
    "raw",
    cekBits,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  // Add padding (record size delimiter)
  const paddedPayload = concatUint8Arrays(payloadBytes, new Uint8Array([2]));

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonceBits },
    cek,
    paddedPayload.buffer as ArrayBuffer
  );

  return {
    encrypted: new Uint8Array(encrypted),
    salt,
    localPublicKey,
  };
}

function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// Build aes128gcm body
function buildAes128gcmBody(
  salt: Uint8Array,
  localPublicKey: Uint8Array,
  encrypted: Uint8Array
): Uint8Array {
  const recordSize = 4096;
  const header = new Uint8Array(21 + localPublicKey.length);
  
  // Salt (16 bytes)
  header.set(salt, 0);
  
  // Record size (4 bytes, big endian)
  const view = new DataView(header.buffer);
  view.setUint32(16, recordSize, false);
  
  // Public key length (1 byte)
  header[20] = localPublicKey.length;
  
  // Public key
  header.set(localPublicKey, 21);
  
  return concatUint8Arrays(header, encrypted);
}

// Send push notification
async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;

    // Generate VAPID JWT
    const jwt = await generateVapidJwt(audience, vapidSubject, vapidPublicKey, vapidPrivateKey);

    // Encrypt payload
    const { encrypted, salt, localPublicKey } = await encryptPayload(
      payload,
      subscription.p256dh,
      subscription.auth
    );

    // Build request body
    const body = buildAes128gcmBody(salt, localPublicKey, encrypted);

    // Send request
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "Content-Length": body.length.toString(),
        "TTL": "86400",
        "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
      },
      body: body.buffer as ArrayBuffer,
    });

    if (response.status === 201 || response.status === 200) {
      return { success: true, statusCode: response.status };
    } else {
      const errorText = await response.text();
      console.error(`Push failed: ${response.status} - ${errorText}`);
      return { success: false, statusCode: response.status, error: errorText };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Push error:", message);
    return { success: false, error: message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, body, url } = await req.json();

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "Title and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.error("Missing VAPID keys");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No subscriptions found", sent: 0, failed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending push to ${subscriptions.length} devices`);
    const notificationPayload = JSON.stringify({ title, body, url });

    let sentCount = 0;
    let failedCount = 0;
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions) {
      const result = await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        notificationPayload,
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY,
        "mailto:contato@voxvisual.com"
      );

      if (result.success) {
        sentCount++;
        console.log(`✓ Sent to: ${sub.endpoint.substring(0, 50)}...`);
      } else {
        console.error(`✗ Failed: ${sub.endpoint.substring(0, 50)}...`, result.error);
        failedCount++;

        if (result.statusCode === 404 || result.statusCode === 410) {
          expiredEndpoints.push(sub.endpoint);
        }
      }
    }

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      console.log(`Cleaning up ${expiredEndpoints.length} expired subscriptions`);
      await supabase.from("push_subscriptions").delete().in("endpoint", expiredEndpoints);
    }

    // Log notification
    await supabase.from("push_notification_logs").insert({
      title,
      body,
      url: url || null,
      sent_count: sentCount,
      failed_count: failedCount,
    });

    console.log(`Push complete: ${sentCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        total: subscriptions.length,
        cleaned: expiredEndpoints.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
