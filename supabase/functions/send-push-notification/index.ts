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

// Base64URL encode/decode utilities
function base64UrlEncode(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str: string): Uint8Array {
  // Add padding if necessary
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Generate VAPID JWT token
async function generateVapidJwt(
  audience: string,
  subject: string,
  vapidPrivateKey: string
): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Decode the raw private key (32 bytes)
  const rawPrivateKey = base64UrlDecode(vapidPrivateKey);
  
  // Import the key as raw EC private key
  const key = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      d: vapidPrivateKey, // Already base64url
      x: '', // Will be derived
      y: '', // Will be derived
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  ).catch(async () => {
    // Alternative: try to construct JWK from raw private key
    // For a 32-byte raw key, we need to construct the full JWK
    const privateKeyBytes = base64UrlDecode(vapidPrivateKey);
    
    // Use PKCS8 format for import
    const pkcs8Header = new Uint8Array([
      0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48,
      0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
      0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20
    ]);
    
    const pkcs8Key = new Uint8Array(pkcs8Header.length + privateKeyBytes.length);
    pkcs8Key.set(pkcs8Header);
    pkcs8Key.set(privateKeyBytes, pkcs8Header.length);
    
    return crypto.subtle.importKey(
      'pkcs8',
      pkcs8Key,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
  });

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw format (64 bytes: r || s)
  const sigBytes = new Uint8Array(signature);
  let rawSig: Uint8Array;
  
  if (sigBytes.length === 64) {
    rawSig = sigBytes;
  } else {
    // DER encoded, need to extract r and s
    rawSig = new Uint8Array(64);
    let offset = 2;
    const rLen = sigBytes[offset + 1];
    offset += 2;
    const rStart = rLen === 33 ? offset + 1 : offset;
    rawSig.set(sigBytes.slice(rStart, rStart + 32), 0);
    offset += rLen;
    const sLen = sigBytes[offset + 1];
    offset += 2;
    const sStart = sLen === 33 ? offset + 1 : offset;
    rawSig.set(sigBytes.slice(sStart, sStart + 32), 32);
  }

  const signatureB64 = base64UrlEncode(rawSig);
  return `${unsignedToken}.${signatureB64}`;
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<Response> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  try {
    const jwt = await generateVapidJwt(
      audience,
      'mailto:admin@arcanolab.com',
      vapidPrivateKey
    );

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
      },
      body: new TextEncoder().encode(payload),
    });

    return response;
  } catch (error) {
    console.error('Error in sendWebPush:', error);
    throw error;
  }
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

    // Check if user is admin
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

    // Get all push subscriptions
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
      console.error("VAPID keys missing - Public:", !!vapidPublicKey, "Private:", !!vapidPrivateKey);
      throw new Error("VAPID keys not configured");
    }

    console.log("VAPID keys loaded successfully");

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

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
          // Subscription expired, remove it
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
      JSON.stringify({
        message: `Push notification sent`,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending push notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
