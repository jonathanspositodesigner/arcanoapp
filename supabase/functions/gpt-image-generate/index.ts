import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { evolinkGenerateImage } from "../_shared/evolink-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CREDIT_COST = 80;

async function isUnlimitedUser(supabase: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  try {
    const { data } = await supabase.rpc('is_unlimited_subscriber', { _user_id: userId });
    return !!data;
  } catch {
    return false;
  }
}

async function isGptImageFreeTrial(supabase: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('planos2_subscriptions')
      .select('gpt_image_free_until')
      .eq('user_id', userId)
      .maybeSingle();
    if (!data?.gpt_image_free_until) return false;
    return new Date(data.gpt_image_free_until) > new Date();
  } catch {
    return false;
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function consumeCredits(supabase: ReturnType<typeof createClient>, userId: string, amount: number, description: string) {
  const { data: creditRow } = await supabase
    .from("upscaler_credits")
    .select("monthly_balance, lifetime_balance")
    .eq("user_id", userId)
    .single();

  const totalBalance = (creditRow?.monthly_balance || 0) + (creditRow?.lifetime_balance || 0);
  if (totalBalance < amount) {
    return { success: false, error: "Créditos insuficientes" };
  }

  const { data: consumeResult, error: consumeError } = await supabase.rpc("consume_upscaler_credits_forced", {
    _user_id: userId,
    _amount: amount,
    _description: description,
  });

  if (!consumeError) {
    const result = Array.isArray(consumeResult) ? consumeResult[0] : consumeResult;
    if (result && result.success === false) {
      return { success: false, error: result.error_message || "Erro ao cobrar créditos" };
    }
    return { success: true };
  }

  // Fallback manual deduction
  const monthly = creditRow?.monthly_balance || 0;
  const lifetime = creditRow?.lifetime_balance || 0;
  let monthlyDeduct = 0;
  let lifetimeDeduct = 0;
  let txCreditType = "monthly";

  if (monthly >= amount) {
    monthlyDeduct = amount;
    txCreditType = "monthly";
  } else if (monthly > 0) {
    monthlyDeduct = monthly;
    lifetimeDeduct = amount - monthly;
    txCreditType = "mixed";
  } else {
    lifetimeDeduct = amount;
    txCreditType = "lifetime";
  }

  const newMonthly = monthly - monthlyDeduct;
  const newLifetime = lifetime - lifetimeDeduct;
  const newBalance = newMonthly + newLifetime;

  const { error: updateErr } = await supabase
    .from("upscaler_credits")
    .update({
      monthly_balance: newMonthly,
      lifetime_balance: newLifetime,
      balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateErr) return { success: false, error: "Erro ao cobrar créditos" };

  await supabase.from("upscaler_credit_transactions").insert({
    user_id: userId,
    amount: -amount,
    balance_after: newBalance,
    transaction_type: "consumption",
    description,
    credit_type: txCreditType,
  });

  return { success: true };
}

async function refundCredits(supabase: ReturnType<typeof createClient>, userId: string, amount: number, description: string) {
  if (!amount || amount <= 0) return;
  await supabase.rpc("refund_upscaler_credits", {
    _user_id: userId,
    _amount: amount,
    _description: description,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const evolinkKey = Deno.env.get("EVOLINK_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!evolinkKey) return json({ success: false, error: "EVOLINK_API_KEY not configured" }, 500);

    // ── Background process endpoint (called internally) ──
    if (path === "process") {
      const authHeader = req.headers.get("Authorization") || "";
      if (authHeader !== `Bearer ${supabaseKey}`) return json({ success: false, error: "Unauthorized" }, 401);

      const { jobId } = await req.json();
      if (!jobId) return json({ success: false, error: "Missing jobId" }, 400);

      const { data: job } = await supabase
        .from("gpt_image_jobs")
        .select("id, user_id, prompt, size, input_image_urls, task_id, status, credits_charged")
        .eq("id", jobId)
        .maybeSingle();

      if (!job) return json({ success: false, error: "Job not found" }, 404);
      if (job.task_id || job.status === "completed") return json({ success: true, skipped: true, taskId: job.task_id });

      // Check if user is IA Unlimited
      const unlimited = await isUnlimitedUser(supabase, job.user_id);
      const freeTrial = !unlimited && await isGptImageFreeTrial(supabase, job.user_id);

      if (unlimited) {
        console.log(`[gpt-image-generate] Unlimited user ${job.user_id} — skipping credit consumption`);
        await supabase.from("gpt_image_jobs").update({
          credits_charged: 0,
          status: "queued",
          error_message: null,
        }).eq("id", jobId);
      } else if (freeTrial) {
        console.log(`[gpt-image-generate] Free trial user ${job.user_id} — skipping credit consumption (7-day promo)`);
        await supabase.from("gpt_image_jobs").update({
          credits_charged: 0,
          status: "queued",
          error_message: null,
        }).eq("id", jobId);
      } else {
        // Charge credits if not yet charged
        if (!job.credits_charged || job.credits_charged <= 0) {
          const creditResult = await consumeCredits(supabase, job.user_id, CREDIT_COST, `GPT Image 2`);
          if (!creditResult.success) {
            await supabase.from("gpt_image_jobs").update({
              status: "failed",
              error_message: creditResult.error || "Créditos insuficientes",
              credits_charged: 0,
            }).eq("id", jobId);
            return json({ success: false, error: creditResult.error || "Créditos insuficientes" }, 400);
          }

          await supabase.from("gpt_image_jobs").update({
            credits_charged: CREDIT_COST,
            status: "queued",
            error_message: null,
          }).eq("id", jobId);
        }
      }

      const normalizedImageUrls = Array.isArray(job.input_image_urls) ? job.input_image_urls.filter(Boolean) : [];

      // Map aspect ratio from app format to API format
      const sizeMap: Record<string, string> = {
        '1:1': '1:1',
        '3:4': '2:3',   // portrait
        '16:9': '3:2',  // landscape
        '9:16': '2:3',  // portrait
      };
      const apiSize = sizeMap[job.size || 'auto'] || 'auto';

      const result = await evolinkGenerateImage(evolinkKey, {
        model: 'gpt-image-2-beta',
        prompt: job.prompt,
        size: apiSize,
        imageUrls: normalizedImageUrls.length > 0 ? normalizedImageUrls : undefined,
      });

      if (!result.success) {
        const chargedAmount = (unlimited || freeTrial) ? 0 : (job.credits_charged || CREDIT_COST);
        if (chargedAmount > 0) {
          await refundCredits(supabase, job.user_id, chargedAmount, `Estorno - GPT Image 2 falhou`);
        }
        await supabase.from("gpt_image_jobs").update({
          status: "failed",
          error_message: result.error,
          credits_charged: unlimited ? 0 : 0,
        }).eq("id", jobId);
        return json({ success: false, error: result.error }, 400);
      }

      await supabase.from("gpt_image_jobs").update({
        task_id: result.taskId,
        status: "running",
        error_message: null,
      }).eq("id", jobId);

      return json({ success: true, taskId: result.taskId, jobId });
    }

    // ── User-facing endpoint ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ success: false, error: "No auth" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return json({ success: false, error: "Invalid token" }, 401);

    const body = await req.json();
    const jobId = body.jobId as string | undefined;
    if (!body.prompt || !jobId) return json({ success: false, error: "Missing required fields" }, 400);

    const { data: job } = await supabase
      .from("gpt_image_jobs")
      .select("id, user_id, task_id, status, credits_charged")
      .eq("id", jobId)
      .maybeSingle();

    if (!job || job.user_id !== user.id) return json({ success: false, error: "Job not found" }, 404);
    if (job.task_id) return json({ success: true, taskId: job.task_id, jobId, queued: false });

    await supabase.from("gpt_image_jobs").update({ status: "pending", error_message: null }).eq("id", jobId);

    // Fire & forget background processing
    fetch(`${supabaseUrl}/functions/v1/gpt-image-generate/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ jobId }),
    }).catch((err) => console.error("[gpt-image-generate] background process failed:", err));

    return json({ success: true, queued: true, jobId });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[gpt-image-generate] Unhandled error:", errMsg);
    return json({ success: false, error: errMsg }, 500);
  }
});