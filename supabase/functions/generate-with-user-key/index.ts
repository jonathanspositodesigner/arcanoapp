import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * BYOK (Bring Your Own Key) - Proxy para RunningHub
 * 
 * Usuários com chave Google API própria usam esta função.
 * Em vez de chamar Gemini diretamente (instável com 429/503),
 * agora delega para o RunningHub via runninghub-image-generator.
 * 
 * O custo é rastreado em user_google_api_keys.used_credits (BRL)
 * sem consumir créditos da plataforma.
 * 
 * Fluxo IMAGE:
 * 1. Autentica e valida chave do usuário
 * 2. Upload base64 refs para Storage
 * 3. Cria job em image_generator_jobs (credits_charged=true para pular cobrança)
 * 4. Chama runninghub-image-generator/run com byok=true
 * 5. Faz polling até completar (max 120s)
 * 6. Atualiza used_credits na tabela do usuário
 * 
 * Fluxo VIDEO: mantido via Veo API (sem mudança)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Real Google API costs in USD
const IMAGE_COST_USD = 0.039; // RunningHub cost per image (approximate)

// Video costs per second (USD) - Veo 3.1 Standard pricing
const VEO_COST_PER_SECOND_USD = 0.40;

// BRL exchange rate
const USD_TO_BRL = 5.80;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    const { type, prompt, aspect_ratio, reference_images, duration_seconds, start_frame } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Prompt é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user's API key (validates BYOK user exists)
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

    if (type === "image") {
      // ========== IMAGE GENERATION VIA RUNNINGHUB ==========
      const costBrl = Number((IMAGE_COST_USD * USD_TO_BRL).toFixed(2));
      const finalAspectRatio = aspect_ratio || "1:1";

      // Upload base64 reference images to Storage
      const storageImageUrls: string[] = [];
      if (reference_images && Array.isArray(reference_images)) {
        for (let i = 0; i < Math.min(reference_images.length, 5); i++) {
          const refImg = reference_images[i];
          if (!refImg.base64 || !refImg.mimeType) continue;

          const ext = refImg.mimeType.includes("png") ? "png" : "jpg";
          const fileName = `image-generator/${userId}/byok-ref-${Date.now()}-${i}.${ext}`;
          const binaryData = Uint8Array.from(atob(refImg.base64), c => c.charCodeAt(0));

          const { error: uploadError } = await serviceClient.storage
            .from("artes-cloudinary")
            .upload(fileName, binaryData, { contentType: refImg.mimeType, upsert: true });

          if (uploadError) {
            console.error(`[BYOK] Upload ref ${i} error:`, uploadError);
            continue;
          }

          const { data: publicUrlData } = serviceClient.storage
            .from("artes-cloudinary")
            .getPublicUrl(fileName);

          if (publicUrlData?.publicUrl) {
            storageImageUrls.push(publicUrlData.publicUrl);
          }
        }
      }

      // Create job in image_generator_jobs
      // credits_charged=true + user_credit_cost=0 → runninghub-image-generator skips platform credit consumption
      const sessionId = `byok-${Date.now()}`;
      const { data: jobData, error: jobError } = await serviceClient
        .from("image_generator_jobs")
        .insert({
          user_id: userId,
          prompt: prompt.trim(),
          model: "byok",
          aspect_ratio: finalAspectRatio,
          reference_images: reference_images || [],
          status: "pending",
          user_credit_cost: 0,
          credits_charged: true, // Skip platform credit consumption in RH
          session_id: sessionId,
        })
        .select("id")
        .single();

      if (jobError) {
        console.error("[BYOK] Job insert error:", jobError);
        return new Response(JSON.stringify({ error: "Erro ao criar job" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const jobId = jobData.id;
      console.log(`[BYOK] Job created: ${jobId}, delegating to RunningHub`);

      // Call runninghub-image-generator/run with byok flag
      const rhUrl = `${supabaseUrl}/functions/v1/runninghub-image-generator/run`;
      const rhResponse = await fetch(rhUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`, // Service role for byok bypass
        },
        body: JSON.stringify({
          jobId,
          referenceImageUrls: storageImageUrls,
          aspectRatio: finalAspectRatio,
          creditCost: 0,
          prompt: prompt.trim(),
          source: "byok",
          byok: true,
          byokUserId: userId,
        }),
      });

      const rhResult = await rhResponse.json();

      if (!rhResponse.ok && !rhResult.queued) {
        console.error("[BYOK] RunningHub call failed:", rhResult);
        return new Response(JSON.stringify({
          error: rhResult.error || "Erro na geração. Tente novamente.",
        }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Poll for completion (max 120s)
      const FAST_POLL_TIME = 30_000;
      const MAX_POLL_TIME = 120_000;
      const FAST_INTERVAL = 3_000;
      const SLOW_INTERVAL = 5_000;
      const startTime = Date.now();

      while (Date.now() - startTime < MAX_POLL_TIME) {
        const elapsed = Date.now() - startTime;
        const interval = elapsed < FAST_POLL_TIME ? FAST_INTERVAL : SLOW_INTERVAL;
        await sleep(interval);

        const { data: job } = await serviceClient
          .from("image_generator_jobs")
          .select("status, output_url, error_message")
          .eq("id", jobId)
          .maybeSingle();

        if (!job) break;

        if (job.status === "completed" && job.output_url) {
          console.log(`[BYOK] Job ${jobId} completed in ${Math.round(elapsed / 1000)}s`);

          // Track cost in user_google_api_keys
          await serviceClient.from("user_google_api_keys").update({
            used_credits: (keyData.used_credits || 0) + costBrl,
            updated_at: new Date().toISOString(),
          }).eq("user_id", userId);

          return new Response(JSON.stringify({
            success: true, job_id: jobId, output_url: job.output_url,
            mime_type: "image/png", cost_brl: costBrl,
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (job.status === "failed") {
          console.log(`[BYOK] Job ${jobId} failed: ${job.error_message}`);
          return new Response(JSON.stringify({
            error: job.error_message || "Erro na geração. Tente novamente.",
          }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Timeout
      console.log(`[BYOK] Job ${jobId} still processing after 120s`);
      return new Response(JSON.stringify({
        error: "A geração está demorando. Atualize o app para acompanhar o resultado.",
        job_id: jobId,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (type === "video") {
      // ========== VIDEO GENERATION VIA VEO (unchanged) ==========
      const ratio = ["16:9", "9:16"].includes(aspect_ratio) ? aspect_ratio : "16:9";
      const validDurations = [4, 6, 8];
      const duration = validDurations.includes(duration_seconds) ? duration_seconds : 8;
      const costBrl = Number((VEO_COST_PER_SECOND_USD * duration * USD_TO_BRL).toFixed(2));

      const userApiKey = keyData.api_key;
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
        console.error(`[BYOK] Veo error ${veoResponse.status}:`, errText);
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

      // Create video job
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
    console.error("[BYOK] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
