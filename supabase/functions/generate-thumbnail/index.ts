import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'
import decodePng from 'npm:@jsquash/png@3.0.1/decode.js'
import decodeJpeg from 'npm:@jsquash/jpeg@1.5.0/decode.js'
import decodeWebp from 'npm:@jsquash/webp@1.4.0/decode.js'
import encodeWebp from 'npm:@jsquash/webp@1.4.0/encode.js'
import { resize } from 'npm:@jsquash/resize@2.1.0'

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

const TARGET_WIDTH = 300

/**
 * Decodifica imagem (png/jpeg/webp) → ImageData,
 * redimensiona para 300px de largura mantendo proporção,
 * e re-encoda como WebP com qualidade 75 (~bom balanço size/qualidade).
 */
async function makeThumbnailWebp(buffer: ArrayBuffer, contentType: string): Promise<Uint8Array> {
  // 1. Decodificar conforme o tipo
  let imageData: ImageData
  if (contentType.includes('png')) {
    imageData = await decodePng(buffer)
  } else if (contentType.includes('jpeg') || contentType.includes('jpg')) {
    imageData = await decodeJpeg(buffer)
  } else if (contentType.includes('webp')) {
    imageData = await decodeWebp(buffer)
  } else {
    // Tenta png como fallback
    imageData = await decodePng(buffer)
  }

  // 2. Calcular altura proporcional
  const ratio = imageData.height / imageData.width
  const targetWidth = Math.min(TARGET_WIDTH, imageData.width)
  const targetHeight = Math.round(targetWidth * ratio)

  // 3. Redimensionar
  const resized = await resize(imageData, {
    width: targetWidth,
    height: targetHeight,
    method: 'lanczos3',
  })

  // 4. Encodar como WebP
  const webpBuffer = await encodeWebp(resized, { quality: 75 })
  return new Uint8Array(webpBuffer)
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

    // 3. Gerar thumbnail WebP 300px (com fallback para imagem original em caso de erro)
    let uploadBuffer: Uint8Array | ArrayBuffer = imageBuffer
    let uploadContentType = contentType
    let extension = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg'
      : contentType.includes('webp') ? 'webp' : 'png'

    try {
      const thumb = await makeThumbnailWebp(imageBuffer, contentType)
      uploadBuffer = thumb
      uploadContentType = 'image/webp'
      extension = 'webp'
      const reduction = ((1 - thumb.byteLength / imageBuffer.byteLength) * 100).toFixed(1)
      console.log(`[GenerateThumbnail] Resized to 300px WebP: ${thumb.byteLength} bytes (${reduction}% smaller)`)
    } catch (thumbErr) {
      console.warn('[GenerateThumbnail] Thumbnail generation failed, uploading original:', thumbErr)
    }

    // 4. Upload para Storage
    const storagePath = `${table}/${jobId}.${extension}`
    console.log(`[GenerateThumbnail] Uploading to: ai-thumbnails/${storagePath}`)

    const { error: uploadError } = await supabase.storage
      .from('ai-thumbnails')
      .upload(storagePath, uploadBuffer, {
        contentType: uploadContentType,
        upsert: true,
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
      originalSize: imageBuffer.byteLength,
      thumbnailSize: uploadBuffer instanceof Uint8Array ? uploadBuffer.byteLength : imageBuffer.byteLength,
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
