import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "No auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const evolinkKey = Deno.env.get("EVOLINK_API_KEY");

    if (!evolinkKey) {
      return new Response(JSON.stringify({ success: false, error: "EVOLINK_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      model, prompt, imageUrls, videoUrls, audioUrls,
      duration, quality, aspectRatio, generateAudio, jobId
    } = body;

    if (!model || !prompt || !jobId) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check credits
    const { data: creditBalance } = await supabase.rpc("get_upscaler_credits", { _user_id: user.id });
    if (!creditBalance || creditBalance < 1) {
      return new Response(JSON.stringify({ success: false, error: "Insufficient credits" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build API payload
    const apiPayload: Record<string, unknown> = {
      model,
      prompt,
      duration: duration || 5,
      quality: quality || "720p",
      aspect_ratio: aspectRatio || "16:9",
      generate_audio: generateAudio !== false,
    };

    // Add media URLs based on model type
    if (model.includes("image-to-video") && imageUrls?.length > 0) {
      apiPayload.image_urls = imageUrls;
    }
    if (model.includes("reference-to-video")) {
      if (imageUrls?.length > 0) apiPayload.image_urls = imageUrls;
      if (videoUrls?.length > 0) apiPayload.video_urls = videoUrls;
      if (audioUrls?.length > 0) apiPayload.audio_urls = audioUrls;
    }

    console.log("[seedance-generate] Calling Evolink API:", JSON.stringify({ model, duration: apiPayload.duration, quality: apiPayload.quality }));

    // Call Evolink API
    const apiResponse = await fetch("https://api.evolink.ai/v1/videos/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${evolinkKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apiPayload),
    });

    const apiData = await apiResponse.json();
    console.log("[seedance-generate] API response:", JSON.stringify(apiData));

    if (!apiResponse.ok || !apiData.id) {
      // Update job as failed
      await supabase.from("seedance_jobs").update({
        status: "failed",
        error_message: apiData.error || `API error: ${apiResponse.status}`,
      }).eq("id", jobId);

      return new Response(JSON.stringify({ success: false, error: apiData.error || "API error" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update job with task_id
    await supabase.from("seedance_jobs").update({
      task_id: apiData.id,
      status: "running",
    }).eq("id", jobId);

    return new Response(JSON.stringify({
      success: true,
      jobId,
      taskId: apiData.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[seedance-generate] Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
