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

function buildWelcomeMessage(locale?: string): string {
  if (locale === 'es') {
    return `🎉 *¡Felicidades por tu compra!*

¡Hola! ¡Bienvenido(a) a *ArcanoApp*! 🚀

¡Tu acceso ya está habilitado! Para comenzar a usar la plataforma, sigue estos pasos:

1️⃣ Accede a: https://arcanoapp-es.voxvisual.com.br/
2️⃣ Ingresa el *correo electrónico usado en la compra*
3️⃣ Registra una *nueva contraseña*

¡Listo! Tendrás acceso completo a la plataforma. 💜

Si necesitas ayuda, ¡solo responde este mensaje!`
  }

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
    const { phone, name, email, order_id, locale } = await req.json()

    const zapiInstanceId = Deno.env.get("ZAPI_ID_DA_INSTANCIA")
    const zapiInstanceToken = Deno.env.get("ZAPI_TOKEN_DA_INSTANCIA")
    const zapiAccountSecurityToken = Deno.env.get("ZAPI_TOKEN_DE_SEGURANCA_DA_CONTA")

    if (!zapiInstanceId || !zapiInstanceToken) {
      console.error("[WhatsApp] Z-API credentials not configured")
      return new Response(
        JSON.stringify({
          error: "Z-API not configured",
          missing: ["ZAPI_ID_DA_INSTANCIA", "ZAPI_TOKEN_DA_INSTANCIA"],
          sent: false,
        }),
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
    const zapiUrl = `https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiInstanceToken}/send-text`

    const zapiHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (zapiAccountSecurityToken) {
      zapiHeaders["Client-Token"] = zapiAccountSecurityToken
    }

    console.log(
      `[WhatsApp] Sending welcome to ${normalizedPhone} (order: ${order_id}), URL: ${zapiUrl}, hasAccountSecurityToken: ${!!zapiAccountSecurityToken}, accountSecurityTokenLength: ${zapiAccountSecurityToken?.length}`
    )

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
      const zapiErrorMessage =
        typeof zapiData?.error === "string" ? zapiData.error.toLowerCase() : ""

      if (zapiErrorMessage.includes("client-token")) {
        console.error(
          `[WhatsApp] Z-API account security token required [${zapiResponse.status}]:`,
          JSON.stringify(zapiData)
        )

        return new Response(
          JSON.stringify({
            error: "Z-API account security token required",
            credential_name: "ZAPI_TOKEN_DE_SEGURANCA_DA_CONTA",
            zapi_message: zapiData?.error,
            sent: false,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

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
