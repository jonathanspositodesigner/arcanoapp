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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callGeminiWithRetry(
  apiKey: string,
  model: string,
  parts: any[],
  maxRetries: number
): Promise<Response> {
  let lastErr: Response | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const resp = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
          imageConfig: { imageSize: "2K" },
        },
      }),
    });

    if (resp.ok) return resp;

    const isRetryable = resp.status === 503 || resp.status === 429;
    console.warn(`[generate-image] ${model} attempt ${attempt}/${maxRetries} failed (${resp.status})`);

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

  const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "GOOGLE_GEMINI_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Auth
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
    const { prompt, model, aspect_ratio, reference_images, source } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Prompt é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine model and cost
    const isProModel = model === "pro";
    const proGeminiModel  = "gemini-3-pro-image-preview";
    const flashGeminiModel = "gemini-2.5-flash-image";

    let creditCost: number;
    let toolDescription: string;

    if (source === "arcano_cloner_refine" || source === "flyer_maker_refine") {
      // Refinamento: custo fixo de 30 créditos
      creditCost = 30;
      toolDescription = source === "flyer_maker_refine" 
        ? "Refinamento Flyer Maker" 
        : "Refinamento Arcano Cloner";
    } else {
      const toolName = isProModel ? "gerar_imagem_pro" : "gerar_imagem";

      // Check if user is IA Unlimited (must also have valid expiration)
      const { data: premiumData } = await serviceClient
        .from("premium_users")
        .select("plan_type, expires_at")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      const isUnlimited = premiumData?.plan_type === "arcano_unlimited" 
        && (!premiumData?.expires_at || new Date(premiumData.expires_at) > new Date());

      // Get credit cost from settings
      const { data: settingsData } = await serviceClient
        .from("ai_tool_settings")
        .select("credit_cost")
        .eq("tool_name", toolName)
        .single();

      if (isUnlimited) {
        creditCost = settingsData?.credit_cost ?? (isProModel ? 60 : 40);
      } else {
        creditCost = isProModel ? 100 : 80;
      }

      toolDescription = `Gerar Imagem (${isProModel ? "NanoBanana Pro" : "NanoBanana Normal"})`;
    }

    // Flash fallback cost (cheaper)
    const flashCreditCost = creditCost;

    // Consume credits
    const { data: consumeResult } = await serviceClient.rpc("consume_upscaler_credits", {
      _user_id: userId,
      _amount: creditCost,
      _description: toolDescription,
    });

    const consumeRow = Array.isArray(consumeResult) ? consumeResult[0] : consumeResult;
    if (!consumeRow?.success) {
      return new Response(JSON.stringify({ error: "INSUFFICIENT_CREDITS", message: consumeRow?.error_message || "Créditos insuficientes" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create job record
    const { data: jobData, error: jobError } = await serviceClient
      .from("image_generator_jobs")
      .insert({
        user_id: userId,
        prompt: prompt.trim(),
        model: isProModel ? "pro" : "normal",
        aspect_ratio: aspect_ratio || "1:1",
        reference_images: reference_images || [],
        status: "processing",
        user_credit_cost: creditCost,
        credits_charged: true,
      })
      .select("id")
      .single();

    if (jobError) {
      console.error("[generate-image] Job insert error:", jobError);
      await serviceClient.rpc("refund_upscaler_credits", {
        _user_id: userId,
        _amount: creditCost,
        _description: "Estorno: erro ao criar job de imagem",
      });
      return new Response(JSON.stringify({ error: "Erro ao criar job" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jobId = jobData.id;

    // Build parts with reference images
    const parts: any[] = [];
    if (reference_images && Array.isArray(reference_images) && reference_images.length > 0) {
      for (const refImg of reference_images.slice(0, 5)) {
        if (refImg.base64 && refImg.mimeType) {
          parts.push({ inlineData: { mimeType: refImg.mimeType, data: refImg.base64 } });
        }
      }
    }

    // Inject aspect ratio into the text prompt
    const arLabel = ASPECT_RATIO_MAP[aspect_ratio] || "square 1:1 aspect ratio";
    const finalPrompt = `${prompt.trim()}. Generate this image in ${arLabel}.`;
    parts.push({ text: finalPrompt });

    console.log(`[generate-image] Job ${jobId} — model: ${isProModel ? "pro" : "normal"}, aspect_ratio: ${aspect_ratio}`);

    // === Call selected model (2 attempts, no fallback) ===
    const selectedGeminiModel = isProModel ? proGeminiModel : flashGeminiModel;
    const effectiveCreditCost = creditCost;

    console.log(`[generate-image] Trying ${isProModel ? "Pro" : "Normal"} model (up to 2 attempts)...`);
    const geminiResponse = await callGeminiWithRetry(GEMINI_API_KEY, selectedGeminiModel, parts, 2);

    // Model failed after retries — refund and return error
    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error(`[generate-image] ${isProModel ? "Pro" : "Normal"} model failed after retries (${geminiResponse.status})`, errText);

      await serviceClient.rpc("refund_upscaler_credits", {
        _user_id: userId,
        _amount: creditCost,
        _description: `Estorno: modelo ${isProModel ? "Pro" : "Normal"} falhou`,
      });

      await serviceClient.from("image_generator_jobs").update({
        status: "failed",
        error_message: `Gemini API error ${geminiResponse.status}: tente novamente em instantes`,
        credits_refunded: true,
        completed_at: new Date().toISOString(),
      }).eq("id", jobId);

      const userMessage = geminiResponse.status === 503 || geminiResponse.status === 429
        ? "API de geração sobrecarregada. Seus créditos foram estornados. Tente novamente em alguns instantes."
        : "Erro na geração de imagem. Seus créditos foram estornados.";

      // Return HTTP 200 with error field so frontend can read the message
      return new Response(JSON.stringify({ error: userMessage, refunded: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiData = await geminiResponse.json();

    // Extract image from response
    let imageBase64: string | null = null;
    let imageMimeType = "image/png";

    const candidates = geminiData?.candidates;
    if (candidates && candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          imageBase64 = part.inlineData.data;
          imageMimeType = part.inlineData.mimeType || "image/png";
          break;
        }
      }
    }

    if (!imageBase64) {
      // Detect specific Gemini finishReason for user-friendly messages
      const finishReason = candidates?.[0]?.finishReason || "";
      let userErrorMessage: string;

      if (finishReason === "MALFORMED_FUNCTION_CALL") {
        userErrorMessage = "A IA não conseguiu processar esta imagem. Tente usar um prompt diferente ou outra imagem de referência. Seus créditos foram estornados.";
      } else if (finishReason === "SAFETY") {
        userErrorMessage = "Imagem bloqueada pelo filtro de segurança. Tente usar outra imagem. Seus créditos foram estornados.";
      } else if (finishReason === "RECITATION") {
        userErrorMessage = "A IA detectou conteúdo protegido por direitos autorais. Tente com outra imagem. Seus créditos foram estornados.";
      } else {
        userErrorMessage = "Nenhuma imagem gerada. Tente novamente com um prompt diferente. Seus créditos foram estornados.";
      }

      console.error(`[generate-image] No image in response. finishReason: ${finishReason}`, JSON.stringify(geminiData).slice(0, 500));

      await serviceClient.rpc("refund_upscaler_credits", {
        _user_id: userId,
        _amount: effectiveCreditCost,
        _description: `Estorno: ${finishReason || "sem imagem na resposta"}`,
      });

      await serviceClient.from("image_generator_jobs").update({
        status: "failed",
        error_message: finishReason || "Nenhuma imagem gerada na resposta",
        credits_refunded: true,
        completed_at: new Date().toISOString(),
      }).eq("id", jobId);

      // Return HTTP 200 with error field so frontend can read the message
      // (supabase.functions.invoke hides the body on non-2xx responses)
      return new Response(JSON.stringify({ error: userErrorMessage, refunded: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload to storage
    const ext = imageMimeType.includes("png") ? "png" : "webp";
    const storagePath = `image-generator/${userId}/${jobId}.${ext}`;
    const imageBytes = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));

    const { error: uploadError } = await serviceClient.storage
      .from("artes-cloudinary")
      .upload(storagePath, imageBytes, {
        contentType: imageMimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error("[generate-image] Upload error:", uploadError);
    }

    const { data: publicUrlData } = serviceClient.storage
      .from("artes-cloudinary")
      .getPublicUrl(storagePath);

    const outputUrl = publicUrlData?.publicUrl || null;

    // Update job as completed
    await serviceClient.from("image_generator_jobs").update({
      status: "completed",
      output_url: outputUrl,
      model: isProModel ? "pro" : "normal",
      user_credit_cost: effectiveCreditCost,
      completed_at: new Date().toISOString(),
    }).eq("id", jobId);

    console.log(`[generate-image] Job ${jobId} completed`);

    return new Response(JSON.stringify({
      success: true,
      job_id: jobId,
      output_url: outputUrl,
      image_base64: imageBase64,
      mime_type: imageMimeType,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[generate-image] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
