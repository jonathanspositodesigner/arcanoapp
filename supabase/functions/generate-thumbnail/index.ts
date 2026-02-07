import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * GENERATE-THUMBNAIL
 * 
 * Edge Function para gerar thumbnails das criações de IA.
 * - Recebe URL da imagem original (CDN RunningHub)
 * - Faz fetch server-side (bypassa CORS)
 * - Faz upload para nosso Storage
 * - Atualiza o job com thumbnail_url
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Domínios permitidos para fetch
const ALLOWED_DOMAINS = [
  'rh-images-1252422369.cos.ap-beijing.myqcloud.com',
  'runninghub.cn',
  'runninghub.com',
  'jooojbaljrshgpaxdlou.supabase.co',
]

function isAllowedDomain(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ALLOWED_DOMAINS.some(domain => parsed.hostname.includes(domain))
  } catch {
    return false
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { imageUrl, jobId, table, userId } = await req.json()

    console.log(`[GenerateThumbnail] Starting for job ${jobId} in ${table}`)

    // Validações
    if (!imageUrl || !jobId || !table) {
      console.error('[GenerateThumbnail] Missing required params:', { imageUrl: !!imageUrl, jobId, table })
      return new Response(JSON.stringify({ 
        error: 'Missing required params: imageUrl, jobId, table' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validar domínio
    if (!isAllowedDomain(imageUrl)) {
      console.error('[GenerateThumbnail] Domain not allowed:', imageUrl)
      return new Response(JSON.stringify({ 
        error: 'Domain not allowed' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Fetch da imagem original (server-side, sem CORS)
    console.log(`[GenerateThumbnail] Fetching image from: ${imageUrl}`)
    
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Arcano/1.0)',
      },
    })

    if (!imageResponse.ok) {
      console.error(`[GenerateThumbnail] Failed to fetch image: ${imageResponse.status}`)
      return new Response(JSON.stringify({ 
        error: `Failed to fetch image: ${imageResponse.status}` 
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Ler como ArrayBuffer
    const imageBuffer = await imageResponse.arrayBuffer()
    const contentType = imageResponse.headers.get('content-type') || 'image/png'
    
    console.log(`[GenerateThumbnail] Image fetched: ${imageBuffer.byteLength} bytes, type: ${contentType}`)

    // 3. Determinar extensão
    let extension = 'png'
    if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      extension = 'jpg'
    } else if (contentType.includes('webp')) {
      extension = 'webp'
    }

    // 4. Upload para Storage (sem compressão por enquanto - Deno não tem sharp nativo)
    // A imagem original já está otimizada pelo RunningHub
    const storagePath = `${table}/${jobId}.${extension}`
    
    console.log(`[GenerateThumbnail] Uploading to: ai-thumbnails/${storagePath}`)

    const { error: uploadError } = await supabase.storage
      .from('ai-thumbnails')
      .upload(storagePath, imageBuffer, {
        contentType,
        upsert: true, // Sobrescreve se já existir
      })

    if (uploadError) {
      console.error('[GenerateThumbnail] Upload error:', uploadError)
      return new Response(JSON.stringify({ 
        error: `Upload failed: ${uploadError.message}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 5. Gerar URL pública
    const thumbnailUrl = `${SUPABASE_URL}/storage/v1/object/public/ai-thumbnails/${storagePath}`
    
    console.log(`[GenerateThumbnail] Thumbnail URL: ${thumbnailUrl}`)

    // 6. Atualizar job no banco
    const { error: updateError } = await supabase
      .from(table)
      .update({ thumbnail_url: thumbnailUrl })
      .eq('id', jobId)

    if (updateError) {
      console.error('[GenerateThumbnail] Update error:', updateError)
      // Não falha a request, a thumbnail foi salva
    }

    console.log(`[GenerateThumbnail] Success! Job ${jobId} updated with thumbnail`)

    return new Response(JSON.stringify({
      success: true,
      thumbnailUrl,
      size: imageBuffer.byteLength,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('[GenerateThumbnail] Unexpected error:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
