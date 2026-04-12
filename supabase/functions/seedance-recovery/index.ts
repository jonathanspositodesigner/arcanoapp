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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const evolinkKey = Deno.env.get("EVOLINK_API_KEY");

    if (!evolinkKey) {
      return new Response(JSON.stringify({ error: "EVOLINK_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find jobs in "timeout_recovery" status OR stuck in "running" for > 25 min
    const { data: recoveryJobs, error: queryError } = await supabase
      .from("seedance_jobs")
      .select("id, task_id, user_id, credits_charged, status, created_at")
      .or("status.eq.timeout_recovery,status.eq.running")
      .not("task_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(20);

    if (queryError || !recoveryJobs || recoveryJobs.length === 0) {
      console.log("[seedance-recovery] No jobs to recover");
      return new Response(JSON.stringify({ recovered: 0, checked: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter: only process jobs older than 10 minutes (give Evolink time)
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const eligibleJobs = recoveryJobs.filter(j => {
      if (j.status === "timeout_recovery") return true; // always check these
      // For "running" jobs, only if stuck > 25 min (safety net)
      const twentyFiveMinAgo = new Date(Date.now() - 25 * 60 * 1000).toISOString();
      return j.created_at && j.created_at < twentyFiveMinAgo;
    });

    if (eligibleJobs.length === 0) {
      console.log("[seedance-recovery] No eligible jobs yet");
      return new Response(JSON.stringify({ recovered: 0, checked: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let recovered = 0;
    let failed = 0;

    for (const job of eligibleJobs) {
      try {
        console.log(`[seedance-recovery] Checking job ${job.id} (task: ${job.task_id})`);
        const pollResult = await evolinkPoll(evolinkKey, job.task_id!);

        if (pollResult.status === "completed" && pollResult.outputUrl) {
          console.log(`[seedance-recovery] ✅ Job ${job.id} recovered! Video found.`);

          // Update job as completed
          await supabase.from("seedance_jobs").update({
            status: "completed",
            output_url: pollResult.outputUrl,
            completed_at: new Date().toISOString(),
          }).eq("id", job.id);

          // Re-charge credits silently (they were refunded on timeout)
          const chargedAmount = job.credits_charged || 0;
          if (chargedAmount > 0) {
            // Check if user has enough credits before re-charging
            const { data: creditBalance } = await supabase.rpc("get_upscaler_credits", { _user_id: job.user_id });
            if (creditBalance && creditBalance >= chargedAmount) {
              await supabase.rpc("consume_upscaler_credits", {
                _user_id: job.user_id,
                _amount: chargedAmount,
                _description: "Cinema Studio - Seedance 2 (recuperado)",
              });
              console.log(`[seedance-recovery] Re-charged ${chargedAmount} credits from user ${job.user_id}`);
            } else {
              console.log(`[seedance-recovery] User ${job.user_id} has insufficient credits (${creditBalance}), video delivered free`);
            }
          }

          // Generate thumbnail
          try {
            await supabase.functions.invoke("generate-thumbnail", {
              body: {
                jobId: job.id,
                tableName: "seedance_jobs",
                outputUrl: pollResult.outputUrl,
              },
            });
          } catch (e) {
            console.warn(`[seedance-recovery] Thumbnail generation failed for ${job.id}:`, e);
          }

          recovered++;
        } else if (pollResult.status === "failed") {
          console.log(`[seedance-recovery] ❌ Job ${job.id} confirmed failed on Evolink`);
          await supabase.from("seedance_jobs").update({
            status: "failed",
            error_message: pollResult.error || "Geração falhou após tentativa de recuperação",
          }).eq("id", job.id);
          failed++;
        } else {
          // Still processing - check if it's been too long (> 30 min total = give up)
          const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
          if (job.created_at && job.created_at < thirtyMinAgo) {
            console.log(`[seedance-recovery] ⏰ Job ${job.id} exceeded 30 min total, marking failed`);
            await supabase.from("seedance_jobs").update({
              status: "failed",
              error_message: "Timeout definitivo - geração não completou em 30 minutos",
            }).eq("id", job.id);
            failed++;
          } else {
            console.log(`[seedance-recovery] ⏳ Job ${job.id} still processing, will retry next cycle`);
          }
        }
      } catch (err) {
        console.error(`[seedance-recovery] Error processing job ${job.id}:`, err);
      }
    }

    console.log(`[seedance-recovery] Done: ${recovered} recovered, ${failed} failed, ${eligibleJobs.length} checked`);
    return new Response(JSON.stringify({ recovered, failed, checked: eligibleJobs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[seedance-recovery] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
