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
    return new Response(JSON.stringify({ error: "GOOGLE_GEMINI_API_KEY not configured" }), {
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
    const { prompt, aspect_ratio, duration_seconds, start_frame, end_frame } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Prompt é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validDurations = [5, 8];
    const duration = validDurations.includes(duration_seconds) ? duration_seconds : 5;
    const ratio = ["16:9", "9:16"].includes(aspect_ratio) ? aspect_ratio : "16:9";

    // Get credit cost
    const { data: settingsData } = await serviceClient
      .from("ai_tool_settings")
      .select("credit_cost")
      .eq("tool_name", "gerar_video")
      .single();
    const creditCost = settingsData?.credit_cost ?? 150;

    // Consume credits
    const { data: consumeResult } = await serviceClient.rpc("consume_upscaler_credits", {
      _user_id: userId,
      _amount: creditCost,
      _description: "Gerar Vídeo (Veo 3.1 Fast)",
    });

    const consumeRow = Array.isArray(consumeResult) ? consumeResult[0] : consumeResult;
    if (!consumeRow?.success) {
      return new Response(JSON.stringify({ error: "INSUFFICIENT_CREDITS", message: consumeRow?.error_message || "Créditos insuficientes" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build Veo API request
    const instance: any = { prompt: prompt.trim() };

    // Add reference images (start frame / end frame) 
    if (start_frame?.base64 && start_frame?.mimeType) {
      instance.image = {
        bytesBase64Encoded: start_frame.base64,
        mimeType: start_frame.mimeType,
      };
    }

    const parameters: any = {
      aspectRatio: ratio,
      durationSeconds: duration,
      sampleCount: 1,
    };

    // End frame support (if available in API)
    if (end_frame?.base64 && end_frame?.mimeType) {
      instance.endImage = {
        bytesBase64Encoded: end_frame.base64,
        mimeType: end_frame.mimeType,
      };
    }

    const veoUrl = `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning`;

    console.log(`[generate-video] Calling Veo 3.1 Fast for user ${userId}`);

    const veoResponse = await fetch(veoUrl, {
      method: "POST",
      headers: {
        "x-goog-api-key": GEMINI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instances: [instance],
        parameters,
      }),
    });

    if (!veoResponse.ok) {
      const errText = await veoResponse.text();
      console.error(`[generate-video] Veo API error ${veoResponse.status}:`, errText);

      await serviceClient.rpc("refund_upscaler_credits", {
        _user_id: userId,
        _amount: creditCost,
        _description: "Estorno: erro na API Veo 3.1",
      });

      return new Response(JSON.stringify({ error: "Erro na geração de vídeo", details: errText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const veoData = await veoResponse.json();
    const operationName = veoData.name;

    if (!operationName) {
      console.error("[generate-video] No operation name in response:", JSON.stringify(veoData).slice(0, 500));

      await serviceClient.rpc("refund_upscaler_credits", {
        _user_id: userId,
        _amount: creditCost,
        _description: "Estorno: sem operation_name na resposta",
      });

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
        start_frame_url: start_frame ? "uploaded" : null,
        end_frame_url: end_frame ? "uploaded" : null,
        operation_name: operationName,
        status: "processing",
        user_credit_cost: creditCost,
        credits_charged: true,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (jobError) {
      console.error("[generate-video] Job insert error:", jobError);
      await serviceClient.rpc("refund_upscaler_credits", {
        _user_id: userId,
        _amount: creditCost,
        _description: "Estorno: erro ao criar job de vídeo",
      });
      return new Response(JSON.stringify({ error: "Erro ao criar job" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[generate-video] Job ${jobData.id} created with operation ${operationName}`);

    return new Response(JSON.stringify({
      success: true,
      job_id: jobData.id,
      operation_name: operationName,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[generate-video] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
