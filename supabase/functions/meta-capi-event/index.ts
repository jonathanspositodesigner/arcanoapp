/**
 * Edge Function: meta-capi-event
 * Sends events to Meta Conversions API (CAPI) for server-side tracking.
 * Supports deduplication with browser Pixel via event_id.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const PIXEL_ID = '1162356848586894'
const API_VERSION = 'v21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sha256Hash(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const {
      event_name,
      email,
      value,
      currency = 'BRL',
      utm_data,
      fbp,
      fbc,
      event_id,
      event_source_url,
      client_ip_address,
      client_user_agent,
    } = await req.json()

    if (!event_name) {
      return new Response(JSON.stringify({ error: 'event_name required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const accessToken = Deno.env.get('META_ACCESS_TOKEN')
    if (!accessToken) {
      console.error('META_ACCESS_TOKEN not configured')
      return new Response(JSON.stringify({ error: 'Meta not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Build user_data with hashed PII
    const userData: Record<string, unknown> = {}
    if (email) {
      userData.em = [await sha256Hash(email)]
    }
    if (fbp) userData.fbp = fbp
    if (fbc) userData.fbc = fbc
    if (client_ip_address) userData.client_ip_address = client_ip_address
    if (client_user_agent) userData.client_user_agent = client_user_agent
    if (email) {
      userData.external_id = [await sha256Hash(email)]
    }

    // Build event
    const event: Record<string, unknown> = {
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      user_data: userData,
    }

    if (event_id) event.event_id = event_id
    if (event_source_url) event.event_source_url = event_source_url

    if (value !== undefined && value !== null) {
      event.custom_data = {
        value: Number(value),
        currency,
        ...(utm_data?.utm_content ? { content_ids: [utm_data.utm_content] } : {}),
        ...(utm_data?.utm_campaign ? { content_category: utm_data.utm_campaign } : {}),
      }
    }

    const payload = {
      data: [event],
    }

    console.log(`📊 Meta CAPI: ${event_name} | email: ${email ? email.substring(0, 5) + '***' : 'N/A'} | value: ${value || 'N/A'} | event_id: ${event_id || 'N/A'}`)

    const response = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )

    const responseText = await response.text()

    if (!response.ok) {
      console.error(`❌ Meta CAPI error: ${response.status} - ${responseText.substring(0, 500)}`)
      return new Response(JSON.stringify({ error: 'Meta API error', details: responseText.substring(0, 200) }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`✅ Meta CAPI sent: ${event_name} — response: ${responseText.substring(0, 200)}`)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('Meta CAPI error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
