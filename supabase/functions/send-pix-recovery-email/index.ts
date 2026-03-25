import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MP_API_URL = "https://api.mercadopago.com";

// ===== SendPulse OAuth =====
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getSendPulseToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 300000) {
    return cachedToken.token;
  }
  const response = await fetch("https://api.sendpulse.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: Deno.env.get("SENDPULSE_CLIENT_ID"),
      client_secret: Deno.env.get("SENDPULSE_CLIENT_SECRET"),
    }),
  });
  if (!response.ok) throw new Error(`SendPulse token error: ${response.status}`);
  const data = await response.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + 3300000 };
  return data.access_token;
}

// ===== Gerar checkout Mercado Pago =====
async function generateCheckoutUrl(
  product: any,
  order: any,
  mpAccessToken: string
): Promise<string | null> {
  const customerName = order.user_name || order.user_email?.split("@")[0] || "Cliente";

  const payload = {
    items: [{
      title: product.title,
      quantity: 1,
      unit_price: Number(product.price),
      currency_id: 'BRL',
    }],
    payer: {
      email: order.user_email,
      name: customerName,
    },
    external_reference: order.id,
    back_urls: {
      success: 'https://arcanoapp.voxvisual.com.br/sucesso-compra',
      failure: 'https://arcanoapp.voxvisual.com.br/planos-2?mp_status=failure',
      pending: 'https://arcanoapp.voxvisual.com.br/planos-2?mp_status=pending',
    },
    auto_return: 'approved',
    expires: true,
    expiration_date_to: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: {
      order_id: order.id,
      recovery_email: true,
    },
  };

  const response = await fetch(`${MP_API_URL}/checkout/preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${mpAccessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  if (!response.ok) {
    console.error(`MP error for order ${order.id}: ${responseText.substring(0, 500)}`);
    return null;
  }

  const data = JSON.parse(responseText);
  return data.init_point || null;
}

// ===== HTML do email =====
function buildRecoveryEmailHtml(
  customerName: string,
  productTitle: string,
  checkoutUrl: string,
  email: string
): string {
  const unsubscribeUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/email-unsubscribe?email=${encodeURIComponent(email)}`;
  const firstName = customerName.split(" ")[0];

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#d4af37;font-size:22px;font-weight:700;letter-spacing:0.5px;">
                ⚠️ Aviso Importante
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 20px;">
              <p style="margin:0 0 18px;color:#1a1a2e;font-size:16px;line-height:1.6;">
                Olá, <strong>${firstName}</strong>!
              </p>
              <p style="margin:0 0 18px;color:#374151;font-size:15px;line-height:1.7;">
                Identificamos que o seu pagamento para o <strong style="color:#1a1a2e;">${productTitle}</strong> ficou pendente devido a uma <strong>instabilidade temporária</strong> no nosso gateway de pagamento (Pix).
              </p>
              <p style="margin:0 0 18px;color:#374151;font-size:15px;line-height:1.7;">
                O problema já foi <strong style="color:#059669;">totalmente resolvido</strong> e todos os métodos de pagamento estão funcionando normalmente.
              </p>
              <p style="margin:0 0 28px;color:#374151;font-size:15px;line-height:1.7;">
                Clique no botão abaixo para concluir sua compra:
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 32px;" align="center">
              <a href="${checkoutUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#d4af37 0%,#c49b2c 100%);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-size:16px;font-weight:700;letter-spacing:0.3px;box-shadow:0 4px 12px rgba(212,175,55,0.35);">
                ✅ Finalizar Minha Compra
              </a>
            </td>
          </tr>

          <!-- Note -->
          <tr>
            <td style="padding:0 40px 36px;">
              <div style="background-color:#f9fafb;border-radius:8px;padding:16px 20px;border-left:3px solid #d4af37;">
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
                  💡 <strong>Dica:</strong> O link acima expira em 3 dias. Se precisar de ajuda, responda este email que nosso suporte vai te auxiliar.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0 0 8px;color:#9ca3af;font-size:12px;">
                Você está recebendo este email porque tentou realizar uma compra em nossa plataforma.
              </p>
              <p style="margin:0;font-size:12px;">
                <a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;">Cancelar inscrição</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ===== Enviar email via SendPulse =====
async function sendEmail(
  token: string,
  toEmail: string,
  toName: string,
  subject: string,
  htmlContent: string
): Promise<boolean> {
  const htmlBase64 = btoa(unescape(encodeURIComponent(htmlContent)));

  const response = await fetch("https://api.sendpulse.com/smtp/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      email: {
        html: htmlBase64,
        text: "",
        subject,
        from: { name: "Vox Visual", email: "contato@voxvisual.com.br" },
        to: [{ name: toName || toEmail, email: toEmail }],
      },
    }),
  });

  const responseText = await response.text();
  console.log(`SendPulse [${toEmail}]: ${response.status} - ${responseText}`);
  return response.ok;
}

// ===== Main =====
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true; // Preview mode: don't send emails

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mpAccessToken) {
      return new Response(JSON.stringify({ error: "MERCADOPAGO_ACCESS_TOKEN missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar ordens pendentes de hoje
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { data: pendingOrders, error: ordersError } = await supabase
      .from("asaas_orders")
      .select("id, user_email, user_name, user_cpf, user_phone, product_id, amount, status")
      .eq("status", "pending")
      .gte("created_at", todayStart.toISOString())
      .not("user_email", "is", null);

    if (ordersError) {
      console.error("Error fetching orders:", ordersError);
      return new Response(JSON.stringify({ error: "Failed to fetch orders" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      return new Response(JSON.stringify({ message: "No pending orders found today", sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${pendingOrders.length} pending orders`);

    // Buscar todos os produtos
    const productIds = [...new Set(pendingOrders.map((o: any) => o.product_id).filter(Boolean))];
    const { data: products } = await supabase
      .from("mp_products")
      .select("id, title, slug, price")
      .in("id", productIds);

    const productMap = new Map((products || []).map((p: any) => [p.id, p]));

    // Check blacklist
    const emails = [...new Set(pendingOrders.map((o: any) => o.user_email?.toLowerCase()).filter(Boolean))];
    const { data: blacklisted } = await supabase
      .from("blacklisted_emails")
      .select("email")
      .in("email", emails);
    const blacklistedSet = new Set((blacklisted || []).map((b: any) => b.email));

    const subject = "⚠️ Seu pagamento não foi processado — já resolvemos!";
    const results: any[] = [];
    let sendPulseToken: string | null = null;

    if (!dryRun) {
      sendPulseToken = await getSendPulseToken();
    }

    for (const order of pendingOrders) {
      const email = order.user_email?.toLowerCase();
      if (!email || blacklistedSet.has(email)) {
        results.push({ email, status: "skipped", reason: "blacklisted" });
        continue;
      }

      const product = productMap.get(order.product_id);
      if (!product) {
        results.push({ email, status: "skipped", reason: "product_not_found" });
        continue;
      }

      if (dryRun) {
        // Return preview HTML for the first order
        const previewHtml = buildRecoveryEmailHtml(
          order.user_name || email,
          product.title,
          "https://example.com/checkout-preview",
          email
        );
        results.push({
          email,
          name: order.user_name,
          product: product.title,
          status: "preview",
          html: previewHtml,
        });
        continue;
      }

      // Generate fresh checkout
      console.log(`Generating checkout for ${email} - ${product.title}`);
      const checkoutUrl = await generateCheckoutUrl(product, order, mpAccessToken);

      if (!checkoutUrl) {
        results.push({ email, status: "failed", reason: "checkout_generation_failed" });
        continue;
      }

      // Build & send email
      const html = buildRecoveryEmailHtml(
        order.user_name || email,
        product.title,
        checkoutUrl,
        email
      );

      const sent = await sendEmail(sendPulseToken!, email, order.user_name || email, subject, html);
      results.push({
        email,
        name: order.user_name,
        product: product.title,
        checkout_url: checkoutUrl,
        status: sent ? "sent" : "failed",
      });

      // Small delay between sends
      await new Promise((r) => setTimeout(r, 500));
    }

    return new Response(
      JSON.stringify({
        total: pendingOrders.length,
        results,
        dry_run: dryRun,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
