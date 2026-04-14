import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const PAGARME_API_URL = "https://api.pagar.me/core/v5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const buildPagarmeAuthHeader = (secretKey: string) =>
  `Basic ${btoa(`${secretKey}:`)}`;

async function buildWebhookSignature(secretKey: string, rawBody: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(rawBody)
  );

  return `sha256=${Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

function getPaidCharge(gatewayOrder: any) {
  return (gatewayOrder?.charges ?? []).find(
    (charge: any) =>
      charge?.status === "paid" ||
      !!charge?.paid_at ||
      charge?.last_transaction?.status === "paid"
  );
}

async function fetchGatewayOrder(orderGatewayId: string, secretKey: string) {
  const response = await fetch(`${PAGARME_API_URL}/orders/${orderGatewayId}`, {
    method: "GET",
    headers: {
      Authorization: buildPagarmeAuthHeader(secretKey),
      "Content-Type": "application/json",
    },
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`gateway_order_${response.status}: ${responseText.slice(0, 300)}`);
  }

  return JSON.parse(responseText);
}

async function replayPaidWebhook(params: {
  gatewayOrder: any;
  pagarmeSecretKey: string;
  supabaseUrl: string;
  serviceRoleKey: string;
}) {
  const paidCharge = getPaidCharge(params.gatewayOrder);
  if (!paidCharge?.id) return false;

  const payload = {
    id: `reconcile_${paidCharge.id}`,
    type: "charge.paid",
    data: {
      ...paidCharge,
      order: params.gatewayOrder,
      customer: paidCharge.customer ?? params.gatewayOrder.customer ?? null,
      metadata: paidCharge.metadata ?? params.gatewayOrder.metadata ?? null,
    },
  };

  const rawBody = JSON.stringify(payload);
  const signature = await buildWebhookSignature(params.pagarmeSecretKey, rawBody);

  const response = await fetch(`${params.supabaseUrl}/functions/v1/webhook-pagarme`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.serviceRoleKey}`,
      "x-hub-signature": signature,
    },
    body: rawBody,
  });

  const responseText = await response.text();
  console.log(
    `[check-purchase-exists] reconcile ${paidCharge.id}: ${response.status} ${responseText.slice(0, 200)}`
  );

  return response.ok;
}

async function tryReconcilePendingPagarmeOrder(params: {
  email: string;
  orderId?: string;
  isUUID: boolean;
  supabaseAdmin: ReturnType<typeof createClient>;
  supabaseUrl: string;
  serviceRoleKey: string;
  pagarmeSecretKey: string;
}) {
  let pendingQuery = params.supabaseAdmin
    .from("asaas_orders")
    .select("id, asaas_payment_id, status, user_email")
    .eq("user_email", params.email)
    .eq("status", "pending");

  if (params.orderId) {
    if (params.isUUID) {
      pendingQuery = params.supabaseAdmin
        .from("asaas_orders")
        .select("id, asaas_payment_id, status, user_email")
        .eq("user_email", params.email)
        .eq("status", "pending")
        .or(`asaas_payment_id.eq.${params.orderId},id.eq.${params.orderId}`);
    } else {
      pendingQuery = params.supabaseAdmin
        .from("asaas_orders")
        .select("id, asaas_payment_id, status, user_email")
        .eq("user_email", params.email)
        .eq("status", "pending")
        .eq("asaas_payment_id", params.orderId);
    }
  }

  const { data: pendingOrders, error: pendingError } = await pendingQuery.limit(3);
  if (pendingError || !pendingOrders?.length) {
    if (pendingError) {
      console.error("Pending Pagar.me lookup error:", pendingError);
    }
    return false;
  }

  for (const pendingOrder of pendingOrders) {
    if (!pendingOrder.asaas_payment_id?.startsWith("or_")) continue;

    try {
      const gatewayOrder = await fetchGatewayOrder(
        pendingOrder.asaas_payment_id,
        params.pagarmeSecretKey
      );

      if (!getPaidCharge(gatewayOrder)) continue;

      console.log(
        `[check-purchase-exists] paid charge found for pending order ${pendingOrder.id}, replaying webhook`
      );

      const replayed = await replayPaidWebhook({
        gatewayOrder,
        pagarmeSecretKey: params.pagarmeSecretKey,
        supabaseUrl: params.supabaseUrl,
        serviceRoleKey: params.serviceRoleKey,
      });

      if (replayed) return true;
    } catch (reconcileError) {
      console.error(
        `[check-purchase-exists] reconcile failed for ${pendingOrder.id}:`,
        reconcileError
      );
    }
  }

  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, order_id } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ exists: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(order_id);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const pagarmeSecretKey = Deno.env.get("PAGARME_SECRET_KEY") || "";

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let query = supabaseAdmin
      .from("asaas_orders")
      .select("id")
      .eq("user_email", trimmedEmail)
      .eq("status", "paid");

    if (order_id) {
      if (isUUID) {
        query = supabaseAdmin
          .from("asaas_orders")
          .select("id")
          .eq("user_email", trimmedEmail)
          .eq("status", "paid")
          .or(`asaas_payment_id.eq.${order_id},id.eq.${order_id}`);
      } else {
        query = supabaseAdmin
          .from("asaas_orders")
          .select("id")
          .eq("user_email", trimmedEmail)
          .eq("status", "paid")
          .eq("asaas_payment_id", order_id);
      }
    }

    let { data, error } = await query.limit(1);

    if (!error && (!data || data.length === 0) && order_id) {
      const fallback = await supabaseAdmin
        .from("asaas_orders")
        .select("id")
        .eq("user_email", trimmedEmail)
        .eq("status", "paid")
        .limit(1);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error("Check purchase error:", error);
      return new Response(JSON.stringify({ exists: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (data && data.length > 0) {
      return new Response(JSON.stringify({ exists: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (pagarmeSecretKey) {
      const reconciled = await tryReconcilePendingPagarmeOrder({
        email: trimmedEmail,
        orderId: order_id,
        isUUID,
        supabaseAdmin,
        supabaseUrl,
        serviceRoleKey,
        pagarmeSecretKey,
      });

      if (reconciled) {
        const { data: reconciledPaidOrder, error: reconciledError } = await supabaseAdmin
          .from("asaas_orders")
          .select("id")
          .eq("user_email", trimmedEmail)
          .eq("status", "paid")
          .limit(1);

        if (!reconciledError && reconciledPaidOrder && reconciledPaidOrder.length > 0) {
          return new Response(JSON.stringify({ exists: true, reconciled: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const { data: mpData, error: mpError } = await supabaseAdmin
      .from("mp_orders")
      .select("id")
      .eq("user_email", trimmedEmail)
      .eq("status", "paid")
      .limit(1);

    if (mpError) {
      console.error("Check mp_orders error:", mpError);
    }

    return new Response(JSON.stringify({ exists: !!(mpData && mpData.length > 0) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Check purchase error:", err);
    return new Response(JSON.stringify({ exists: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
