import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

      await serviceClient.rpc("refund_upscaler_credits", {
        _user_id: userId,
        _amount: job.user_credit_cost || 150,
        _description: "Estorno: sem vídeo na resposta",
      });

      await serviceClient.from("video_generator_jobs").update({
        status: "failed",
        error_message: "Nenhum vídeo gerado",
        credits_refunded: true,
        completed_at: new Date().toISOString(),
      }).eq("id", job_id);

      return new Response(JSON.stringify({ status: "failed", error_message: "Nenhum vídeo gerado" }), {
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
