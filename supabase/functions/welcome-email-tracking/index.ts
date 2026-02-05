import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 1x1 transparent GIF pixel
const TRACKING_PIXEL = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 
  0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 
  0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 
  0x01, 0x00, 0x3b
])

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    const url = new URL(req.url)
    const trackingId = url.searchParams.get('id')
    const action = url.searchParams.get('action') // 'open' or 'click'
    const redirect = url.searchParams.get('redirect')

    console.log(`📊 Tracking event: action=${action}, id=${trackingId}`)

    if (!trackingId) {
      return new Response('Missing tracking ID', { status: 400 })
    }

    // Find the log entry
    const { data: log } = await supabase
      .from('welcome_email_logs')
      .select('*')
      .eq('tracking_id', trackingId)
      .maybeSingle()

    if (!log) {
      console.log('Log not found for tracking ID:', trackingId)
      // Still return valid response for pixel/redirect
      if (action === 'open') {
        return new Response(TRACKING_PIXEL, {
          headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-cache, no-store' }
        })
      }
      if (action === 'click' && redirect) {
        return Response.redirect(redirect, 302)
      }
      return new Response('Not found', { status: 404 })
    }

    // Update based on action
    if (action === 'open') {
      const updateData: any = {
        open_count: (log.open_count || 0) + 1,
      }
      if (!log.opened_at) {
        updateData.opened_at = new Date().toISOString()
      }

      await supabase
        .from('welcome_email_logs')
        .update(updateData)
        .eq('id', log.id)

      console.log(`✅ Open tracked for ${log.email}`)

      return new Response(TRACKING_PIXEL, {
        headers: { 
          'Content-Type': 'image/gif', 
          'Cache-Control': 'no-cache, no-store, must-revalidate' 
        }
      })
    }

    if (action === 'click') {
      const updateData: any = {
        click_count: (log.click_count || 0) + 1,
      }
      if (!log.clicked_at) {
        updateData.clicked_at = new Date().toISOString()
      }

      await supabase
        .from('welcome_email_logs')
        .update(updateData)
        .eq('id', log.id)

      console.log(`✅ Click tracked for ${log.email}`)

      if (redirect) {
        return Response.redirect(redirect, 302)
      }

      return new Response('Click tracked', { status: 200 })
    }

    return new Response('Invalid action', { status: 400 })

  } catch (error) {
    console.error('Tracking error:', error)
    
    // Always return something valid for tracking pixel
    return new Response(TRACKING_PIXEL, {
      headers: { 'Content-Type': 'image/gif' }
    })
  }
})
