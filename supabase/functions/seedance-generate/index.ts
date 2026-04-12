import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { evolinkGenerate } from "../_shared/evolink-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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
      duration, quality, aspectRatio, generateAudio, jobId, creditCost
    } = body;

    if (!model || !prompt || !jobId) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const creditsToCharge = creditCost || 0;

    // Credit check
    const { data: creditBalance } = await supabase.rpc("get_upscaler_credits", { _user_id: user.id });
    if (!creditBalance || creditBalance < creditsToCharge) {
      return new Response(JSON.stringify({ success: false, error: "Créditos insuficientes" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Charge credits IMMEDIATELY before calling Evolink
    if (creditsToCharge > 0) {
      const { error: consumeError } = await supabase.rpc("consume_upscaler_credits", {
        _user_id: user.id,
        _amount: creditsToCharge,
        _description: `Cinema Studio - Seedance 2 (${model})`,
      });
      if (consumeError) {
        console.error("[seedance-generate] Failed to consume credits:", consumeError);
        return new Response(JSON.stringify({ success: false, error: "Erro ao cobrar créditos" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log(`[seedance-generate] Charged ${creditsToCharge} credits from user ${user.id}`);
    }

    // Update job with credits_charged
    await supabase.from("seedance_jobs").update({
      credits_charged: creditsToCharge,
    }).eq("id", jobId);

    console.log("[seedance-generate] Calling Evolink API via shared client:", JSON.stringify({ model, duration: duration || 5, quality: quality || "720p" }));

    // Use shared Evolink client
    const result = await evolinkGenerate(evolinkKey, {
      model,
      prompt,
      duration: duration || 5,
      quality: quality || "720p",
      aspectRatio: aspectRatio || "16:9",
      generateAudio: generateAudio !== false,
      imageUrls: model.includes("image-to-video") || model.includes("reference-to-video") ? imageUrls : undefined,
      videoUrls: model.includes("reference-to-video") ? videoUrls : undefined,
      audioUrls: model.includes("reference-to-video") ? audioUrls : undefined,
    });

    if (!result.success) {
      // REFUND credits on API failure
      if (creditsToCharge > 0) {
        await supabase.rpc("add_upscaler_credits", {
          _user_id: user.id,
          _amount: creditsToCharge,
          _description: `Estorno - Seedance 2 falhou (${model})`,
        });
        console.log(`[seedance-generate] Refunded ${creditsToCharge} credits to user ${user.id}`);
      }

      await supabase.from("seedance_jobs").update({
        status: "failed",
        error_message: result.error,
        credits_charged: 0,
      }).eq("id", jobId);

      return new Response(JSON.stringify({ success: false, error: result.error }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("seedance_jobs").update({
      task_id: result.taskId,
      status: "running",
    }).eq("id", jobId);

    return new Response(JSON.stringify({
      success: true,
      jobId,
      taskId: result.taskId,
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
