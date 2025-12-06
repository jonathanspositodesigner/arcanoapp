import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushNotificationRequest {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

// Base64URL utilities
function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Generate VAPID JWT
async function generateVapidJwt(
  audience: string,
  subject: string,
  publicKey: string,
  privateKey: string
): Promise<{ jwt: string; publicKeyB64: string }> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: subject,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Decode raw private key (32 bytes)
  const privateKeyBytes = base64UrlDecode(privateKey);
  
  // Decode public key (65 bytes uncompressed)
  const publicKeyBytes = base64UrlDecode(publicKey);
  
  // Extract X and Y from uncompressed public key (skip 0x04 prefix)
  const x = base64UrlEncode(publicKeyBytes.slice(1, 33));
  const y = base64UrlEncode(publicKeyBytes.slice(33, 65));
  const d = base64UrlEncode(privateKeyBytes);

  // Import as JWK
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x, y, d },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER to raw if needed
  const sigBytes = new Uint8Array(signature);
  let rawSig: Uint8Array;

  if (sigBytes.length === 64) {
    rawSig = sigBytes;
  } else {
    // DER format - extract r and s
    rawSig = new Uint8Array(64);
    let offset = 2;
    const rLen = sigBytes[offset + 1];
    offset += 2;
    const rStart = rLen > 32 ? offset + (rLen - 32) : offset;
    const rEnd = offset + rLen;
    rawSig.set(sigBytes.slice(rStart, Math.min(rEnd, rStart + 32)), 32 - Math.min(32, rEnd - rStart));
    offset = rEnd;
    offset += 2;
    const sLen = sigBytes[offset - 1];
    const sStart = sLen > 32 ? offset + (sLen - 32) : offset;
    const sEnd = offset + sLen;
    rawSig.set(sigBytes.slice(sStart, Math.min(sEnd, sStart + 32)), 64 - Math.min(32, sEnd - sStart));
  }

  return {
    jwt: `${unsignedToken}.${base64UrlEncode(rawSig)}`,
    publicKeyB64: publicKey
  };
}

// HKDF implementation
async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', 
    ikm.buffer as ArrayBuffer, 
    'HKDF', 
    false, 
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { 
      name: 'HKDF', 
      salt: salt.buffer as ArrayBuffer, 
      info: info.buffer as ArrayBuffer, 
      hash: 'SHA-256' 
    },
    keyMaterial,
    length * 8
  );
  return new Uint8Array(bits);
}

// Create encryption info for aesgcm
function createInfo(type: string, clientPublicKey: Uint8Array, serverPublicKey: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const prefix = new TextEncoder().encode('Content-Encoding: ');
  const curve = new TextEncoder().encode('P-256');
  
  // Calculate total size dynamically
  const totalSize = prefix.length + typeBytes.length + 1 + curve.length + 1 + 2 + clientPublicKey.length + 2 + serverPublicKey.length;
  const info = new Uint8Array(totalSize);
  let offset = 0;

  // "Content-Encoding: " + type + "\0"
  info.set(prefix, offset);
  offset += prefix.length;
  info.set(typeBytes, offset);
  offset += typeBytes.length;
  info[offset++] = 0;

  // "P-256" + "\0"
  info.set(curve, offset);
  offset += curve.length;
  info[offset++] = 0;

  // Client public key length (2 bytes big-endian) + key
  info[offset++] = 0;
  info[offset++] = clientPublicKey.length;
  info.set(clientPublicKey, offset);
  offset += clientPublicKey.length;

  // Server public key length (2 bytes big-endian) + key
  info[offset++] = 0;
  info[offset++] = serverPublicKey.length;
  info.set(serverPublicKey, offset);

  return info;
}

// Encrypt payload for Web Push
async function encryptPayload(
  payload: string,
  subscription: { p256dh: string; auth: string }
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const clientPublicKey = base64UrlDecode(subscription.p256dh);
  const authSecret = base64UrlDecode(subscription.auth);
  
  // Generate server ECDH key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Export server public key
  const serverPublicKeyRaw = await crypto.subtle.exportKey('raw', serverKeyPair.publicKey);
  const serverPublicKey = new Uint8Array(serverPublicKeyRaw);

  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKey.buffer as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // ECDH shared secret
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientKey },
    serverKeyPair.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive PRK using auth secret
  const authInfo = new TextEncoder().encode('Content-Encoding: auth\0');
  const prk = await hkdf(authSecret, sharedSecret, authInfo, 32);

  // Derive content encryption key
  const cekInfo = createInfo('aesgcm', clientPublicKey, serverPublicKey);
  const cek = await hkdf(salt, prk, cekInfo, 16);

  // Derive nonce
  const nonceInfo = createInfo('nonce', clientPublicKey, serverPublicKey);
  const nonce = await hkdf(salt, prk, nonceInfo, 12);

  // Prepare payload with padding
  const payloadBytes = new TextEncoder().encode(payload);
  const paddingLength = 0;
  const paddedPayload = new Uint8Array(2 + paddingLength + payloadBytes.length);
  paddedPayload[0] = (paddingLength >> 8) & 0xff;
  paddedPayload[1] = paddingLength & 0xff;
  paddedPayload.set(payloadBytes, 2 + paddingLength);

  // Encrypt with AES-GCM
  const key = await crypto.subtle.importKey(
    'raw', 
    cek.buffer as ArrayBuffer, 
    'AES-GCM', 
    false, 
    ['encrypt']
  );
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce.buffer as ArrayBuffer },
    key,
    paddedPayload
  );

  return {
    encrypted: new Uint8Array(encrypted),
    salt,
    serverPublicKey
  };
}

// Send Web Push notification
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<Response> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  // Encrypt the payload
  const { encrypted, salt, serverPublicKey } = await encryptPayload(payload, subscription);

  // Generate VAPID JWT
  const { jwt, publicKeyB64 } = await generateVapidJwt(
    audience,
    'mailto:jonathandesigner1993@gmail.com',
    vapidPublicKey,
    vapidPrivateKey
  );

  // Build request body
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt}, k=${publicKeyB64}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aesgcm',
      'Crypto-Key': `dh=${base64UrlEncode(serverPublicKey)}; p256ecdsa=${publicKeyB64}`,
      'Encryption': `salt=${base64UrlEncode(salt)}`,
      'TTL': '86400',
    },
    body: encrypted.buffer as ArrayBuffer,
  });

  return response;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      throw new Error("Admin access required");
    }

    const { title, body, icon, url }: PushNotificationRequest = await req.json();

    if (!title || !body) {
      throw new Error("Title and body are required");
    }

    const { data: subscriptions, error: subError } = await supabaseClient
      .from("push_subscriptions")
      .select("*");

    if (subError) {
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
    }

    console.log(`Sending push notification to ${subscriptions?.length || 0} subscribers`);

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("VAPID keys not configured");
    }

    console.log("VAPID Public Key (first 30 chars):", vapidPublicKey.substring(0, 30));

    const results = { success: 0, failed: 0, errors: [] as string[] };

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || "/icon-192.png",
      url: url || "/biblioteca-prompts",
    });

    for (const subscription of subscriptions || []) {
      try {
        console.log(`Sending to: ${subscription.endpoint.substring(0, 60)}...`);
        
        const response = await sendWebPush(
          subscription,
          payload,
          vapidPublicKey,
          vapidPrivateKey
        );

        if (response.ok || response.status === 201) {
          results.success++;
          console.log(`Push sent successfully`);
        } else if (response.status === 410 || response.status === 404) {
          await supabaseClient
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", subscription.endpoint);
          console.log(`Removed expired subscription`);
          results.failed++;
        } else {
          results.failed++;
          const errorText = await response.text();
          results.errors.push(`${response.status}: ${errorText}`);
          console.error(`Failed: ${response.status} - ${errorText}`);
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push(error.message);
        console.error(`Error:`, error.message);
      }
    }

    console.log(`Results: ${results.success} success, ${results.failed} failed`);

    return new Response(
      JSON.stringify({ message: `Push notification sent`, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending push notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
