/**
 * Edge Function: send-whatsapp-welcome
 * Envia mensagem de boas-vindas via Z-API (WhatsApp) após compra confirmada.
 * Recebe: { phone, name, email, order_id }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10) return null

  // Se já começa com 55, usa direto
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits
  }
  // Senão, adiciona 55 (Brasil)
  return `55${digits}`
}

function buildWelcomeMessage(): string {
  return `🎉 *Parabéns pela sua compra!*

Olá! Seja muito bem-vindo(a) ao *ArcanoApp*! 🚀

Seu acesso já está liberado! Para começar a usar a plataforma, siga os passos:

1️⃣ Acesse: https://arcanoapp.voxvisual.com.br/
2️⃣ Digite o *e-mail usado na compra*
3️⃣ Cadastre uma *nova senha*

Pronto! Você terá acesso completo à plataforma. 💜

Se precisar de ajuda, é só responder esta mensagem!`
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { phone, name, email, order_id } = await req.json()

    const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID")
    const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN")
    const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN")

    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
      console.error("[WhatsApp] Z-API credentials not configured")
      return new Response(
        JSON.stringify({ error: "Z-API not configured", sent: false }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const normalizedPhone = normalizePhone(phone)
    if (!normalizedPhone) {
      console.warn(`[WhatsApp] Invalid phone for order ${order_id}: "${phone}"`)
      return new Response(
        JSON.stringify({ error: "Invalid phone number", sent: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const message = buildWelcomeMessage()

    // Z-API send-text endpoint
    const zapiUrl = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`

    const zapiHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    }
    // Client-Token is optional - only add if configured
    // if (ZAPI_CLIENT_TOKEN) {
    //   zapiHeaders["Client-Token"] = ZAPI_CLIENT_TOKEN
    // }

    console.log(`[WhatsApp] Sending welcome to ${normalizedPhone} (order: ${order_id}), URL: ${zapiUrl}, hasClientToken: ${!!ZAPI_CLIENT_TOKEN}, clientTokenLength: ${ZAPI_CLIENT_TOKEN?.length}`)

    const zapiResponse = await fetch(zapiUrl, {
      method: "POST",
      headers: zapiHeaders,
      body: JSON.stringify({
        phone: normalizedPhone,
        message: message,
      }),
    })

    const zapiData = await zapiResponse.json()

    if (!zapiResponse.ok) {
      console.error(`[WhatsApp] Z-API error [${zapiResponse.status}]:`, JSON.stringify(zapiData))
      return new Response(
        JSON.stringify({ error: "Z-API send failed", details: zapiData, sent: false }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    console.log(`[WhatsApp] ✅ Sent successfully to ${normalizedPhone}:`, JSON.stringify(zapiData))

    // Update order with whatsapp status
    if (order_id) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )

      await supabase
        .from("asaas_orders")
        .update({
          whatsapp_welcome_sent: true,
          whatsapp_welcome_sent_at: new Date().toISOString(),
        })
        .eq("id", order_id)
    }

    return new Response(
      JSON.stringify({ success: true, sent: true, zapiResponse: zapiData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err: any) {
    console.error("[WhatsApp] Error:", err)
    return new Response(
      JSON.stringify({ error: err.message || "Internal error", sent: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
