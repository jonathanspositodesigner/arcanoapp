import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async () => {
  const hashCode = (s: string) => {
    let h = 0
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0
    }
    return Math.abs(h)
  }

  const fakeOrderId = 'test-mp-' + Date.now()
  const numericId = hashCode(fakeOrderId)
  const numericProductId = 999001

  const payload = {
    event: 'sale_status_updated',
    currentStatus: 'paid',
    contract: { id: numericId },
    client: { name: 'Teste Lovable', email: 'teste-lovable@voxvisual.com.br' },
    product: { name: 'Upscaler Arcano Vitalício', id: numericProductId },
    offer: { name: 'Upscaler Arcano Vitalício', id: numericProductId },
    sale: {
      id: numericId,
      amount: 3990,
      currency: 'BRL',
      created_at: new Date().toISOString()
    },
    saleMetas: [
      { meta_key: 'utm_source', meta_value: 'FB' },
      { meta_key: 'utm_campaign', meta_value: 'teste-mp-greenn-format' },
      { meta_key: 'xcod', meta_value: 'FBhQwK21wXxRteste456' }
    ]
  }

  console.log('Sending payload:', JSON.stringify(payload, null, 2))

  const res = await fetch(
    'https://api.utmify.com.br/webhooks/greenn?id=677eeb043df9ee8a68e6995b',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  )

  const body = await res.text()
  console.log(`UTMify response: ${res.status} - ${body}`)

  return new Response(JSON.stringify({ status: res.status, body, payload_sent: payload }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
