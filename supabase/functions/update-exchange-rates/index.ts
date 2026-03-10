import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  try {
    console.log("💱 Fetching latest exchange rates (BRL base)...")

    // Fetch rates with BRL as target
    const res = await fetch("https://open.er-api.com/v6/latest/BRL")
    if (!res.ok) throw new Error(`API returned ${res.status}`)

    const data = await res.json()
    if (data.result !== 'success' || !data.rates) {
      throw new Error('Invalid API response')
    }

    // We need rate_to_brl: how many BRL per 1 unit of foreign currency
    // API gives us BRL→X rates, so rate_to_brl = 1 / rate
    const brlRates = data.rates
    const now = new Date().toISOString()
    
    const upserts = Object.entries(brlRates)
      .filter(([currency]) => currency !== 'BRL')
      .map(([currency, rate]) => ({
        currency,
        rate_to_brl: Math.round((1 / (rate as number)) * 1000000) / 1000000,
        updated_at: now,
      }))

    // Add BRL itself
    upserts.push({ currency: 'BRL', rate_to_brl: 1, updated_at: now })

    // Batch upsert
    const { error: upsertError } = await supabase
      .from('exchange_rates')
      .upsert(upserts, { onConflict: 'currency' })

    if (upsertError) throw upsertError

    console.log(`✅ Updated ${upserts.length} exchange rates`)

    // Recalculate all webhook_logs with foreign currencies
    const { data: recalcResult } = await supabase.rpc('recalculate_webhook_amounts_brl')
    const updatedCount = recalcResult?.[0]?.updated_count || 0
    console.log(`✅ Recalculated ${updatedCount} webhook records`)

    return new Response(JSON.stringify({ 
      success: true, 
      rates_updated: upserts.length,
      records_recalculated: updatedCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error("❌ Error updating rates:", error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
