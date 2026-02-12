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
    const { prompt, model, aspect_ratio, reference_images } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Prompt é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine model and cost
    const isProModel = model === "pro";
    const geminiModel = isProModel ? "gemini-3-pro-image-preview" : "gemini-2.5-flash-image";
    const toolName = isProModel ? "gerar_imagem_pro" : "gerar_imagem";

    // Check if user is IA Unlimited
    const { data: premiumData } = await serviceClient
      .from("premium_users")
      .select("plan_type")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();
    const isUnlimited = premiumData?.plan_type === "arcano_unlimited";

    // Get credit cost from settings (used for IA Unlimited)
    const { data: settingsData } = await serviceClient
      .from("ai_tool_settings")
      .select("credit_cost")
      .eq("tool_name", toolName)
      .single();

    let creditCost: number;
    if (isUnlimited) {
      creditCost = settingsData?.credit_cost ?? (isProModel ? 60 : 40);
    } else {
      creditCost = isProModel ? 100 : 80;
    }

    // Consume credits
    const { data: consumeResult } = await serviceClient.rpc("consume_upscaler_credits", {
      _user_id: userId,
      _amount: creditCost,
      _description: `Gerar Imagem (${isProModel ? "NanoBanana Pro" : "NanoBanana Normal"})`,
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

    // Build Gemini API request
    const parts: any[] = [];

    // Add reference images if provided (image-to-image)
    if (reference_images && Array.isArray(reference_images) && reference_images.length > 0) {
      for (const refImg of reference_images.slice(0, 5)) {
        if (refImg.base64 && refImg.mimeType) {
          parts.push({
            inlineData: {
              mimeType: refImg.mimeType,
              data: refImg.base64,
            },
          });
        }
      }
    }

    // Add text prompt
    parts.push({ text: prompt.trim() });

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`;

    console.log(`[generate-image] Calling ${geminiModel} for job ${jobId}`);

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "x-goog-api-key": GEMINI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
          imageConfig: {
            imageSize: "2K",
          },
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error(`[generate-image] Gemini API error ${geminiResponse.status}:`, errText);

      // Refund credits
      await serviceClient.rpc("refund_upscaler_credits", {
        _user_id: userId,
        _amount: creditCost,
        _description: "Estorno: erro na API Gemini",
      });

      await serviceClient.from("image_generator_jobs").update({
        status: "failed",
        error_message: `Gemini API error: ${geminiResponse.status}`,
        credits_refunded: true,
        completed_at: new Date().toISOString(),
      }).eq("id", jobId);

      return new Response(JSON.stringify({ error: "Erro na geração de imagem", details: errText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      console.error("[generate-image] No image in response:", JSON.stringify(geminiData).slice(0, 500));

      await serviceClient.rpc("refund_upscaler_credits", {
        _user_id: userId,
        _amount: creditCost,
        _description: "Estorno: sem imagem na resposta",
      });

      await serviceClient.from("image_generator_jobs").update({
        status: "failed",
        error_message: "Nenhuma imagem gerada na resposta",
        credits_refunded: true,
        completed_at: new Date().toISOString(),
      }).eq("id", jobId);

      return new Response(JSON.stringify({ error: "Nenhuma imagem gerada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      completed_at: new Date().toISOString(),
    }).eq("id", jobId);

    console.log(`[generate-image] Job ${jobId} completed successfully`);

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
