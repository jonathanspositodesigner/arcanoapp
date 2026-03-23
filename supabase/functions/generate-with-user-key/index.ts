import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASPECT_RATIO_MAP: Record<string, string> = {
  "1:1":  "square 1:1 aspect ratio",
  "16:9": "wide horizontal landscape 16:9 widescreen aspect ratio",
  "9:16": "tall vertical portrait 9:16 aspect ratio (like a phone screen)",
  "4:3":  "standard horizontal 4:3 aspect ratio",
  "3:4":  "vertical portrait 3:4 aspect ratio",
};

// Real Google API costs in USD (source: ai.google.dev/gemini-api/docs/pricing - March 2026)
// Image costs per image (USD)
const IMAGE_COST_USD: Record<string, number> = {
  "gemini-2.5-flash-image":           0.039,  // $0.039/image (1290 output tokens @ $30/1M)
  "gemini-3-pro-image-preview":       0.134,  // ~$0.134/image (higher quality model)
  "gemini-3.1-flash-image-preview":   0.039,  // same tier as flash image
};

// Video costs per second (USD) - Veo 3.1 Standard pricing
const VEO_COST_PER_SECOND_USD = 0.40; // $0.40/second for 720p/1080p

// BRL exchange rate (approximate, configurable)
const USD_TO_BRL = 5.80;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callGeminiWithRetry(
  apiKey: string,
  model: string,
  parts: any[],
  maxRetries: number
): Promise<Response> {
  let lastErr: Response | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000);
    let resp: Response;
    try {
      resp = await fetch(url, {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
        }),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === "AbortError") {
        lastErr = new Response(JSON.stringify({ error: "Timeout" }), { status: 504 });
        if (attempt === maxRetries) break;
        await sleep(3000);
        continue;
      }
      throw fetchErr;
    }
    clearTimeout(timeoutId);
    if (resp.ok) return resp;
    const isRetryable = resp.status === 503 || resp.status === 429;
    lastErr = resp;
    if (!isRetryable || attempt === maxRetries) break;
    await sleep(3000);
  }
  return lastErr!;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = claimsData.claims.sub as string;

  try {
    const body = await req.json();
    const { type, prompt, model, aspect_ratio, reference_images, duration_seconds, start_frame } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Prompt é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user's API key securely
    const { data: keyData, error: keyError } = await serviceClient
      .from("user_google_api_keys")
      .select("api_key, used_credits, total_credits")
      .eq("user_id", userId)
      .single();

    if (keyError || !keyData?.api_key) {
      return new Response(JSON.stringify({ error: "Chave API não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userApiKey = keyData.api_key;
    // Calculate real cost based on model and type
    let costBrl: number;

    if (type === "image") {
      // ========== IMAGE GENERATION ==========
      const isProModel = model === "pro";
      const isNano2Model = model === "nano2";
      const selectedModel = isNano2Model ? "gemini-3.1-flash-image-preview" : isProModel ? "gemini-3-pro-image-preview" : "gemini-2.5-flash-image";

      // Build parts
      const parts: any[] = [];
      if (reference_images && Array.isArray(reference_images)) {
        for (const refImg of reference_images.slice(0, 5)) {
          if (refImg.base64 && refImg.mimeType) {
            parts.push({ inlineData: { mimeType: refImg.mimeType, data: refImg.base64 } });
          }
        }
      }
      const arLabel = ASPECT_RATIO_MAP[aspect_ratio] || "square 1:1 aspect ratio";
      parts.push({ text: `${prompt.trim()}. Generate this image in ${arLabel}.` });

      // Create job record (no platform credits charged)
      const { data: jobData, error: jobError } = await serviceClient
        .from("image_generator_jobs")
        .insert({
          user_id: userId,
          prompt: prompt.trim(),
          model: isNano2Model ? "nano2" : isProModel ? "pro" : "normal",
          aspect_ratio: aspect_ratio || "1:1",
          reference_images: reference_images || [],
          status: "processing",
          user_credit_cost: 0,
          credits_charged: false,
        })
        .select("id")
        .single();

      if (jobError) {
        return new Response(JSON.stringify({ error: "Erro ao criar job" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const jobId = jobData.id;

      const geminiResponse = await callGeminiWithRetry(userApiKey, selectedModel, parts, 2);

      if (!geminiResponse.ok) {
        const errText = await geminiResponse.text();
        console.error(`[generate-with-user-key] Image failed (${geminiResponse.status}):`, errText);
        await serviceClient.from("image_generator_jobs").update({
          status: "failed", error_message: `API error ${geminiResponse.status}`, completed_at: new Date().toISOString(),
        }).eq("id", jobId);

        // Check if key is invalid
        if (geminiResponse.status === 400 || geminiResponse.status === 403) {
          return new Response(JSON.stringify({ error: "Chave API inválida ou sem permissão. Verifique sua chave.", key_invalid: true }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ error: "Erro na geração. Tente novamente." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const geminiData = await geminiResponse.json();
      let imageBase64: string | null = null;
      let imageMimeType = "image/png";
      const candidates = geminiData?.candidates;
      if (candidates?.[0]?.content?.parts) {
        for (const part of candidates[0].content.parts) {
          if (part.inlineData) {
            imageBase64 = part.inlineData.data;
            imageMimeType = part.inlineData.mimeType || "image/png";
            break;
          }
        }
      }

      if (!imageBase64) {
        const finishReason = candidates?.[0]?.finishReason || "";
        await serviceClient.from("image_generator_jobs").update({
          status: "failed", error_message: finishReason || "Sem imagem", completed_at: new Date().toISOString(),
        }).eq("id", jobId);
        return new Response(JSON.stringify({ error: "Nenhuma imagem gerada. Tente com outro prompt." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Upload
      const ext = imageMimeType.includes("png") ? "png" : "webp";
      const storagePath = `image-generator/${userId}/${jobId}.${ext}`;
      const imageBytes = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));

      await serviceClient.storage.from("artes-cloudinary").upload(storagePath, imageBytes, { contentType: imageMimeType, upsert: true });
      const { data: publicUrlData } = serviceClient.storage.from("artes-cloudinary").getPublicUrl(storagePath);
      const outputUrl = publicUrlData?.publicUrl || null;

      await serviceClient.from("image_generator_jobs").update({
        status: "completed", output_url: outputUrl, completed_at: new Date().toISOString(),
      }).eq("id", jobId);

      // Update used_credits
      await serviceClient.from("user_google_api_keys").update({
        used_credits: (keyData.used_credits || 0) + costBrl,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId);

      return new Response(JSON.stringify({
        success: true, job_id: jobId, output_url: outputUrl, mime_type: imageMimeType, cost_brl: costBrl,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (type === "video") {
      // ========== VIDEO GENERATION ==========
      const ratio = ["16:9", "9:16"].includes(aspect_ratio) ? aspect_ratio : "16:9";
      const validDurations = [4, 6, 8];
      const duration = validDurations.includes(duration_seconds) ? duration_seconds : 8;

      const instance: any = { prompt: prompt.trim() };
      if (start_frame?.base64 && start_frame?.mimeType) {
        instance.image = { bytesBase64Encoded: start_frame.base64, mimeType: start_frame.mimeType };
      }

      const veoUrl = "https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning";

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60_000);

      let veoResponse: Response;
      try {
        veoResponse = await fetch(veoUrl, {
          method: "POST",
          headers: { "x-goog-api-key": userApiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [instance],
            parameters: { aspectRatio: ratio, durationSeconds: duration, resolution: "1080p", sampleCount: 1 },
          }),
          signal: controller.signal,
        });
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        if (fetchErr.name === "AbortError") {
          return new Response(JSON.stringify({ error: "API de vídeo não respondeu. Tente novamente." }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw fetchErr;
      }
      clearTimeout(timeoutId);

      if (!veoResponse.ok) {
        const errText = await veoResponse.text();
        console.error(`[generate-with-user-key] Veo error ${veoResponse.status}:`, errText);
        if (veoResponse.status === 400 || veoResponse.status === 403) {
          return new Response(JSON.stringify({ error: "Chave API inválida ou sem permissão.", key_invalid: true }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "Erro na geração de vídeo." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const veoData = await veoResponse.json();
      const operationName = veoData.name;
      if (!operationName) {
        return new Response(JSON.stringify({ error: "Erro ao iniciar geração de vídeo" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create job
      const { data: jobData, error: jobError } = await serviceClient
        .from("video_generator_jobs")
        .insert({
          user_id: userId,
          prompt: prompt.trim(),
          aspect_ratio: ratio,
          duration_seconds: duration,
          operation_name: operationName,
          status: "processing",
          user_credit_cost: 0,
          credits_charged: false,
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (jobError) {
        return new Response(JSON.stringify({ error: "Erro ao criar job" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update used_credits
      await serviceClient.from("user_google_api_keys").update({
        used_credits: (keyData.used_credits || 0) + costBrl,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId);

      return new Response(JSON.stringify({
        success: true, job_id: jobData.id, operation_name: operationName, cost_brl: costBrl,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else {
      return new Response(JSON.stringify({ error: "Tipo inválido. Use 'image' ou 'video'." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (err) {
    console.error("[generate-with-user-key] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
