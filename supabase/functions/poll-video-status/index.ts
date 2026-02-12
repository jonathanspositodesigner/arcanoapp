import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callVeoApi(geminiKey: string, payload: any): Promise<{ ok: boolean; operationName?: string; error?: string }> {
  const instance: any = { prompt: payload.prompt };

  if (payload.start_frame?.base64 && payload.start_frame?.mimeType) {
    instance.image = {
      bytesBase64Encoded: payload.start_frame.base64,
      mimeType: payload.start_frame.mimeType,
    };
  }
  // Note: endImage is NOT supported by veo-3.1-generate-preview model

  const parameters: any = {
    aspectRatio: payload.aspect_ratio || "16:9",
    durationSeconds: payload.duration || 8,
    resolution: "1080p",
    sampleCount: 1,
  };

  const veoUrl = `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning`;

  const veoResponse = await fetch(veoUrl, {
    method: "POST",
    headers: {
      "x-goog-api-key": geminiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ instances: [instance], parameters }),
  });

  if (!veoResponse.ok) {
    const errText = await veoResponse.text();
    return { ok: false, error: errText };
  }

  const veoData = await veoResponse.json();
  if (!veoData.name) {
    return { ok: false, error: "No operation_name in response" };
  }

  return { ok: true, operationName: veoData.name };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "API key not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
    const { job_id } = await req.json();

    if (!job_id) {
      return new Response(JSON.stringify({ error: "job_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get job
    const { data: job, error: jobError } = await serviceClient
      .from("video_generator_jobs")
      .select("*")
      .eq("id", job_id)
      .eq("user_id", userId)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: "Job não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If already completed or failed, return current status
    if (job.status === "completed" || job.status === "failed") {
      return new Response(JSON.stringify({
        status: job.status,
        output_url: job.output_url,
        error_message: job.error_message,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== QUEUE LOGIC: Handle queued jobs ==========
    if (job.status === "queued") {
      const oneMinAgo = new Date(Date.now() - 60000).toISOString();
      const { count: activeCount } = await serviceClient
        .from("video_generator_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "processing")
        .gte("started_at", oneMinAgo);

      // Check if there's a free slot
      if ((activeCount || 0) >= 2) {
        // No slot - calculate position
        const { count: ahead } = await serviceClient
          .from("video_generator_jobs")
          .select("id", { count: "exact", head: true })
          .eq("status", "queued")
          .lt("created_at", job.created_at);

        return new Response(JSON.stringify({
          status: "queued",
          position: (ahead || 0) + 1,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Slot available! Check if this job is next in line (FIFO)
      const { data: nextInQueue } = await serviceClient
        .from("video_generator_jobs")
        .select("id")
        .eq("status", "queued")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (!nextInQueue || nextInQueue.id !== job.id) {
        // Not this job's turn yet
        const { count: ahead } = await serviceClient
          .from("video_generator_jobs")
          .select("id", { count: "exact", head: true })
          .eq("status", "queued")
          .lt("created_at", job.created_at);

        return new Response(JSON.stringify({
          status: "queued",
          position: (ahead || 0) + 1,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // It's this job's turn! Start it with Google API
      const payload = job.job_payload as any;
      if (!payload) {
        // No payload saved - mark as failed
        await serviceClient.rpc("refund_upscaler_credits", {
          _user_id: userId,
          _amount: job.user_credit_cost || 150,
          _description: "Estorno: job sem payload",
        });
        await serviceClient.from("video_generator_jobs").update({
          status: "failed",
          error_message: "Dados do job não encontrados",
          credits_refunded: true,
          completed_at: new Date().toISOString(),
        }).eq("id", job_id);

        return new Response(JSON.stringify({
          status: "failed",
          error_message: "Dados do job não encontrados",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[poll-video] Starting queued job ${job_id} for user ${userId}`);

      const veoResult = await callVeoApi(GEMINI_API_KEY, payload);

      if (!veoResult.ok) {
        console.error(`[poll-video] Veo API error for queued job ${job_id}:`, veoResult.error);

        await serviceClient.rpc("refund_upscaler_credits", {
          _user_id: userId,
          _amount: job.user_credit_cost || 150,
          _description: "Estorno: erro Google API ao iniciar job da fila",
        });
        await serviceClient.from("video_generator_jobs").update({
          status: "failed",
          error_message: "Servidor ocupado. Tente novamente.",
          credits_refunded: true,
          completed_at: new Date().toISOString(),
        }).eq("id", job_id);

        return new Response(JSON.stringify({
          status: "failed",
          error_message: "Servidor ocupado. Tente novamente.",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Success! Update job to processing
      await serviceClient.from("video_generator_jobs").update({
        status: "processing",
        operation_name: veoResult.operationName,
        started_at: new Date().toISOString(),
        position: null,
        job_payload: null, // Clear payload to free space
      }).eq("id", job_id);

      console.log(`[poll-video] Queued job ${job_id} started with operation ${veoResult.operationName}`);

      return new Response(JSON.stringify({
        status: "processing",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== EXISTING FLOW: Poll Google for processing jobs ==========
    if (!job.operation_name) {
      return new Response(JSON.stringify({ error: "Sem operation_name no job" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Poll Google API
    const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${job.operation_name}`;

    const pollResponse = await fetch(pollUrl, {
      method: "GET",
      headers: {
        "x-goog-api-key": GEMINI_API_KEY,
      },
    });

    if (!pollResponse.ok) {
      const errText = await pollResponse.text();
      console.error(`[poll-video] Poll error ${pollResponse.status}:`, errText);

      // If 404, operation may have expired
      if (pollResponse.status === 404) {
        await serviceClient.rpc("refund_upscaler_credits", {
          _user_id: userId,
          _amount: job.user_credit_cost || 150,
          _description: "Estorno: operação de vídeo expirou",
        });

        await serviceClient.from("video_generator_jobs").update({
          status: "failed",
          error_message: "Operação expirou",
          credits_refunded: true,
          completed_at: new Date().toISOString(),
        }).eq("id", job_id);

        return new Response(JSON.stringify({ status: "failed", error_message: "Operação expirou" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ status: "processing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pollData = await pollResponse.json();

    if (!pollData.done) {
      return new Response(JSON.stringify({ status: "processing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Operation is done
    if (pollData.error) {
      console.error("[poll-video] Operation failed:", pollData.error);

      await serviceClient.rpc("refund_upscaler_credits", {
        _user_id: userId,
        _amount: job.user_credit_cost || 150,
        _description: "Estorno: geração de vídeo falhou",
      });

      await serviceClient.from("video_generator_jobs").update({
        status: "failed",
        error_message: pollData.error.message || "Erro na geração",
        credits_refunded: true,
        completed_at: new Date().toISOString(),
      }).eq("id", job_id);

      return new Response(JSON.stringify({
        status: "failed",
        error_message: pollData.error.message || "Erro na geração",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract video from response
    let videoBase64: string | null = null;
    let videoMimeType = "video/mp4";

    const response = pollData.response;
    if (response?.generatedSamples) {
      for (const sample of response.generatedSamples) {
        if (sample.video?.bytesBase64Encoded) {
          videoBase64 = sample.video.bytesBase64Encoded;
          videoMimeType = sample.video.mimeType || "video/mp4";
          break;
        }
      }
    }

    if (!videoBase64) {
      console.error("[poll-video] No video in response:", JSON.stringify(pollData).slice(0, 500));

      // Extract specific rejection reason from Google's response
      let errorMsg = "Nenhum vídeo gerado";
      const generateVideoResponse = response?.generateVideoResponse;
      if (generateVideoResponse?.raiMediaFilteredReasons?.length > 0) {
        const reasons = generateVideoResponse.raiMediaFilteredReasons;
        // Map common Google rejection messages to user-friendly Portuguese
        const reasonText = reasons[0];
        if (reasonText.includes("celebrity")) {
          errorMsg = "A imagem contém uma celebridade ou pessoa pública. Remova a referência e tente novamente.";
        } else if (reasonText.includes("child") || reasonText.includes("minor")) {
          errorMsg = "Conteúdo bloqueado por segurança. Tente com outro prompt ou imagem.";
        } else {
          errorMsg = `Bloqueado pelo filtro de segurança: ${reasonText}`;
        }
      }

      await serviceClient.rpc("refund_upscaler_credits", {
        _user_id: userId,
        _amount: job.user_credit_cost || 150,
        _description: "Estorno: sem vídeo na resposta",
      });

      await serviceClient.from("video_generator_jobs").update({
        status: "failed",
        error_message: errorMsg,
        credits_refunded: true,
        completed_at: new Date().toISOString(),
      }).eq("id", job_id);

      return new Response(JSON.stringify({ status: "failed", error_message: errorMsg }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload to storage
    const storagePath = `video-generator/${userId}/${job_id}.mp4`;
    const videoBytes = Uint8Array.from(atob(videoBase64), (c) => c.charCodeAt(0));

    const { error: uploadError } = await serviceClient.storage
      .from("artes-cloudinary")
      .upload(storagePath, videoBytes, {
        contentType: videoMimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error("[poll-video] Upload error:", uploadError);
    }

    const { data: publicUrlData } = serviceClient.storage
      .from("artes-cloudinary")
      .getPublicUrl(storagePath);

    const outputUrl = publicUrlData?.publicUrl || null;

    // Update job
    await serviceClient.from("video_generator_jobs").update({
      status: "completed",
      output_url: outputUrl,
      completed_at: new Date().toISOString(),
    }).eq("id", job_id);

    console.log(`[poll-video] Job ${job_id} completed`);

    return new Response(JSON.stringify({
      status: "completed",
      output_url: outputUrl,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[poll-video] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
