import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { evolinkPoll } from "../_shared/evolink-client.ts";

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
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const evolinkKey = Deno.env.get("EVOLINK_API_KEY");

    if (!evolinkKey) {
      return new Response(JSON.stringify({ error: "EVOLINK_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { taskId, jobId } = await req.json();

    if (!taskId || !jobId) {
      return new Response(JSON.stringify({ error: "Missing taskId or jobId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Poll using shared Evolink client
    const pollResult = await evolinkPoll(evolinkKey, taskId);
    console.log("[gpt-image-poll] Status:", pollResult.status, "Progress:", pollResult.progress);

    if (pollResult.status === "completed") {
      await supabase.from("gpt_image_jobs").update({
        status: "completed",
        output_url: pollResult.outputUrl,
        completed_at: new Date().toISOString(),
      }).eq("id", jobId);

      return new Response(JSON.stringify({
        status: "completed",
        outputUrl: pollResult.outputUrl,
        progress: 100,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (pollResult.status === "failed") {
      // Read the charged amount first
      const { data: jobData } = await supabase
        .from("gpt_image_jobs")
        .select("credits_charged")
        .eq("id", jobId)
        .single();

      const chargedAmount = jobData?.credits_charged || 0;

      // Atomically claim refund: only update if credits_charged still matches
      if (chargedAmount > 0) {
        const { data: claimed } = await supabase
          .from("gpt_image_jobs")
          .update({
            status: "failed",
            error_message: pollResult.error || "Generation failed",
            credits_charged: 0,
          })
          .eq("id", jobId)
          .eq("credits_charged", chargedAmount)
          .select("id")
          .maybeSingle();

        if (claimed) {
          await supabase.rpc("add_upscaler_credits", {
            _user_id: user.id,
            _amount: chargedAmount,
            _description: "Estorno - GPT Image 2 falhou",
          });
          console.log(`[gpt-image-poll] Refunded ${chargedAmount} credits to user ${user.id}`);
        } else {
          console.log(`[gpt-image-poll] Refund already claimed for job ${jobId}, skipping`);
        }
      } else {
        await supabase.from("gpt_image_jobs").update({
          status: "failed",
          error_message: pollResult.error || "Generation failed",
        }).eq("id", jobId);
      }

      return new Response(JSON.stringify({
        status: "failed",
        error: pollResult.error || "Generation failed",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Still processing
    return new Response(JSON.stringify({
      status: pollResult.status,
      progress: pollResult.progress,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[gpt-image-poll] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});