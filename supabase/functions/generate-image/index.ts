import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * LEGACY PROXY: generate-image
 * 
 * Redireciona chamadas da API antiga (Google Gemini) para o sistema RunningHub.
 * Usuários com PWA cacheado ainda chamam esta função esperando resposta síncrona.
 * 
 * Fluxo:
 * 1. Autentica o usuário
 * 2. Cria job em image_generator_jobs
 * 3. Faz upload das imagens de referência (base64) para o Supabase Storage
 * 4. Chama runninghub-image-generator/run para delegar ao queue manager
 * 5. Faz polling do status do job até completar (max ~100s)
 * 6. Retorna output_url no mesmo formato que o frontend antigo espera
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await serviceClient.auth.getUser(token);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = user.id;

  try {
    const { prompt, model, aspect_ratio, reference_images, source } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Prompt é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[generate-image PROXY] Redirecting to RunningHub — user: ${userId}, source: ${source || "legacy"}`);

    // ========== DETERMINE CREDIT COST ==========
    const isProModel = model === "pro";
    const isNano2Model = model === "nano2";

    let creditCost: number;
    let creditDescription: string;
    let skipCredits = false;

    if (source === "arcano_cloner_refine" || source === "flyer_maker_refine") {
      creditCost = 100;
      creditDescription = source === "flyer_maker_refine"
        ? "Refinamento Flyer Maker"
        : "Refinamento Arcano Cloner";
    } else {
      // Check if user is IA Unlimited (Planos2)
      const { data: isUnlimitedResult } = await serviceClient.rpc('is_unlimited_subscriber', { _user_id: userId });
      const isPlanos2Unlimited = !!isUnlimitedResult;

      if (isPlanos2Unlimited) {
        // All image generation tools are FREE for Unlimited users
        skipCredits = true;
        creditCost = 0;
        console.log(`[generate-image PROXY] Unlimited user ${userId}: image generation is FREE`);
      } else {
        creditCost = 100;
      }
      creditDescription = "Gerar Imagem";
    }

    // ========== UPLOAD BASE64 REFERENCE IMAGES TO STORAGE ==========
    const storageImageUrls: string[] = [];

    if (reference_images && Array.isArray(reference_images) && reference_images.length > 0) {
      for (let i = 0; i < Math.min(reference_images.length, 5); i++) {
        const refImg = reference_images[i];
        if (!refImg.base64 || !refImg.mimeType) continue;

        const ext = refImg.mimeType.includes("png") ? "png" : "jpg";
        const fileName = `image-generator/${userId}/legacy-ref-${Date.now()}-${i}.${ext}`;

        // Decode base64 to Uint8Array
        const binaryData = Uint8Array.from(atob(refImg.base64), c => c.charCodeAt(0));

        const { error: uploadError } = await serviceClient.storage
          .from("artes-cloudinary")
          .upload(fileName, binaryData, {
            contentType: refImg.mimeType,
            upsert: true,
          });

        if (uploadError) {
          console.error(`[generate-image PROXY] Upload ref ${i} error:`, uploadError);
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

    // ========== CHECK NANO BANANA LIMIT FOR UNLIMITED USERS ==========
    let useFlux2KleinRedirect = false;
    if (isNano2Model) {
      try {
        const { data: limitData } = await serviceClient.rpc('check_nano_banana_limit', { _user_id: userId });
        if (limitData && typeof limitData === 'object' && (limitData as any).exceeded) {
          // 80% chance redirect to Flux2 Klein, 20% chance stay on Nano Banana
          const roll = Math.random();
          if (roll < 0.8) {
            console.log(`[generate-image PROXY] Nano Banana limit exceeded for ${userId}, roll ${roll.toFixed(3)} < 0.8 → Flux2 Klein`);
            useFlux2KleinRedirect = true;
          } else {
            console.log(`[generate-image PROXY] Nano Banana limit exceeded for ${userId}, roll ${roll.toFixed(3)} >= 0.8 → keeping Nano Banana`);
          }
        }
        // Increment usage counter
        await serviceClient.rpc('increment_nano_banana_usage', { _user_id: userId });
      } catch (err) {
        console.warn('[generate-image PROXY] Failed to check nano banana limit:', err);
      }
    }

    // ========== CREATE JOB IN image_generator_jobs ==========
    const finalAspectRatio = aspect_ratio || "1:1";
    const sessionId = `legacy-${Date.now()}`;

    const { data: jobData, error: jobError } = await serviceClient
      .from("image_generator_jobs")
      .insert({
        user_id: userId,
        prompt: prompt.trim(),
        model: useFlux2KleinRedirect ? "flux2_klein" : (isNano2Model ? "nano2" : isProModel ? "pro" : "normal"),
        aspect_ratio: finalAspectRatio,
        reference_images: reference_images || [],
        status: "pending",
        user_credit_cost: creditCost,
        session_id: sessionId,
        engine: useFlux2KleinRedirect ? "flux2_klein" : (isNano2Model ? "nano_banana" : "nano_banana"),
      })
      .select("id")
      .single();

    if (jobError) {
      console.error("[generate-image PROXY] Job insert error:", jobError);
      return new Response(JSON.stringify({ error: "Erro ao criar job" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jobId = jobData.id;
    console.log(`[generate-image PROXY] Job created: ${jobId}, redirect: ${useFlux2KleinRedirect}`);

    // ========== CALL APPROPRIATE EDGE FUNCTION ==========
    const edgeFunctionPath = useFlux2KleinRedirect ? 'runninghub-flux2-klein/run' : 'runninghub-image-generator/run';
    const rhUrl = `${supabaseUrl}/functions/v1/${edgeFunctionPath}`;
    const rhResponse = await fetch(rhUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        jobId,
        referenceImageUrls: storageImageUrls,
        aspectRatio: finalAspectRatio,
        creditCost,
        prompt: prompt.trim(),
        source: source || "legacy_proxy",
      }),
    });

    const rhResult = await rhResponse.json();

    if (!rhResponse.ok && !rhResult.queued) {
      console.error("[generate-image PROXY] RunningHub call failed:", rhResult);

      // Return user-friendly error with refund info
      return new Response(JSON.stringify({
        error: rhResult.error || "Erro na geração de imagem. Seus créditos foram estornados.",
        refunded: rhResult.refunded || true,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== POLL FOR COMPLETION (30s rápido, depois 5s até 120s) ==========
    const FAST_POLL_TIME = 30_000; // 30s polling rápido (3s interval)
    const MAX_POLL_TIME = 120_000; // 120s total max
    const FAST_INTERVAL = 3_000;
    const SLOW_INTERVAL = 5_000;
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_POLL_TIME) {
      const elapsed = Date.now() - startTime;
      const interval = elapsed < FAST_POLL_TIME ? FAST_INTERVAL : SLOW_INTERVAL;
      await sleep(interval);

      const { data: job } = await serviceClient
        .from("image_generator_jobs")
        .select("status, output_url, error_message, credits_refunded")
        .eq("id", jobId)
        .maybeSingle();

      if (!job) break;

      if (job.status === "completed" && job.output_url) {
        console.log(`[generate-image PROXY] Job ${jobId} completed in ${Math.round(elapsed / 1000)}s`);
        return new Response(JSON.stringify({
          success: true,
          job_id: jobId,
          output_url: job.output_url,
          mime_type: "image/png",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (job.status === "failed") {
        console.log(`[generate-image PROXY] Job ${jobId} failed: ${job.error_message}`);
        return new Response(JSON.stringify({
          error: job.error_message || "Erro na geração de imagem. Seus créditos foram estornados.",
          refunded: job.credits_refunded || false,
        }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Timeout — job still processing
    console.log(`[generate-image PROXY] Job ${jobId} still processing after 120s`);
    return new Response(JSON.stringify({
      error: "A geração está demorando mais que o esperado. Atualize o app para ter uma experiência melhor. Seus créditos serão estornados se a geração falhar.",
      refunded: false,
      job_id: jobId,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[generate-image PROXY] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
