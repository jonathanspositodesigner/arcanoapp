import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { evolinkGenerate } from "../_shared/evolink-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Server-side pricing table (credits per second) - source of truth
const PRICING: Record<string, number> = {
  "fast-480p-i2v": 100,
  "fast-480p-t2v": 100,
  "fast-720p-i2v": 250,
  "fast-720p-t2v": 250,
  "standard-480p-i2v": 130,
  "standard-480p-t2v": 150,
  "standard-720p-i2v": 270,
  "standard-720p-t2v": 300,
};

function computeCreditCost(model: string, quality: string, duration: number): number {
  const isFast = model.includes("fast");
  const speed = isFast ? "fast" : "standard";
  const isI2V = model.includes("reference-to-video") || model.includes("image-to-video");
  const genType = isI2V ? "i2v" : "t2v";
  const key = `${speed}-${quality}-${genType}`;
  const rate = PRICING[key];
  if (!rate) {
    console.error(`[seedance-generate] Unknown pricing key: ${key}, falling back to 300/s`);
    return 300 * duration; // fail-safe: charge highest rate
  }
  return rate * duration;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Track state for safe refund in catch block
  let supabase: ReturnType<typeof createClient> | null = null;
  let userId: string | null = null;
  let jobId: string | null = null;
  let creditsCharged = 0;

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

    supabase = createClient(supabaseUrl, supabaseKey);

    // Validate user via getUser with service role
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error("[seedance-generate] Auth failed:", userError?.message || "no user");
      return new Response(JSON.stringify({ success: false, error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    userId = user.id;
    const userEmail = user.email || "";

    const body = await req.json();
    const {
      model, prompt, imageUrls, videoUrls, audioUrls,
      duration, quality, aspectRatio, generateAudio,
    } = body;
    jobId = body.jobId;

    if (!model || !prompt || !jobId) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SERVER-SIDE cost calculation — never trust client
    const parsedDuration = parseInt(duration) || 5;
    const parsedQuality = (quality === "720p" || quality === "480p") ? quality : "480p";
    const creditsToCharge = computeCreditCost(model, parsedQuality, parsedDuration);

    if (creditsToCharge <= 0) {
      return new Response(JSON.stringify({ success: false, error: "Invalid credit cost calculation" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[seedance-generate] User: ${userEmail} | Cost: ${creditsToCharge} credits (model=${model}, quality=${parsedQuality}, duration=${parsedDuration}s)`);

    // Credit check — use raw balance, NOT the unlimited-aware RPC
    const { data: creditRow } = await supabase
      .from("upscaler_credits")
      .select("monthly_balance, lifetime_balance")
      .eq("user_id", userId)
      .single();

    const totalBalance = (creditRow?.monthly_balance || 0) + (creditRow?.lifetime_balance || 0);
    if (totalBalance < creditsToCharge) {
      return new Response(JSON.stringify({ success: false, error: "Créditos insuficientes" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Charge credits IMMEDIATELY
    const { data: consumeResult, error: consumeError } = await supabase.rpc("consume_upscaler_credits_forced", {
      _user_id: userId,
      _amount: creditsToCharge,
      _description: `Cinema Studio - Seedance 2 (${model})`,
    });

    let actuallyCharged = false;

    if (consumeError) {
      // Fallback: RPC doesn't exist yet, do manual deduction with service role
      console.warn("[seedance-generate] consume_upscaler_credits_forced not available, using direct deduction:", consumeError.message);

      const monthly = creditRow?.monthly_balance || 0;
      const lifetime = creditRow?.lifetime_balance || 0;

      let monthlyDeduct = 0;
      let lifetimeDeduct = 0;
      let txCreditType = "monthly";

      if (monthly >= creditsToCharge) {
        monthlyDeduct = creditsToCharge;
        txCreditType = "monthly";
      } else if (monthly > 0) {
        monthlyDeduct = monthly;
        lifetimeDeduct = creditsToCharge - monthly;
        txCreditType = "mixed";
      } else {
        lifetimeDeduct = creditsToCharge;
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

      if (updateErr) {
        console.error("[seedance-generate] Failed to deduct credits:", updateErr);
        return new Response(JSON.stringify({ success: false, error: "Erro ao cobrar créditos" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Log transaction
      await supabase.from("upscaler_credit_transactions").insert({
        user_id: userId,
        amount: -creditsToCharge,
        balance_after: newBalance,
        transaction_type: "consumption",
        description: `Cinema Studio - Seedance 2 (${model})`,
        credit_type: txCreditType,
      });

      actuallyCharged = true;
      console.log(`[seedance-generate] Direct deduction: ${creditsToCharge} credits from user ${userId}, new balance: ${newBalance}`);
    } else {
      // RPC succeeded
      const result = Array.isArray(consumeResult) ? consumeResult[0] : consumeResult;
      if (result && result.success === false) {
        return new Response(JSON.stringify({ success: false, error: result.error_message || "Erro ao cobrar créditos" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      actuallyCharged = true;
      console.log(`[seedance-generate] Forced RPC charged ${creditsToCharge} credits from user ${userId}`);
    }

    if (!actuallyCharged) {
      return new Response(JSON.stringify({ success: false, error: "Falha na cobrança de créditos" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Track charged amount for safe refund in catch
    creditsCharged = creditsToCharge;

    // Update job with credits_charged
    await supabase.from("seedance_jobs").update({
      credits_charged: creditsToCharge,
    }).eq("id", jobId);

    console.log("[seedance-generate] Calling Evolink API via shared client:", JSON.stringify({ model, duration: parsedDuration, quality: parsedQuality }));

    // Use shared Evolink client
    const result = await evolinkGenerate(evolinkKey, {
      model,
      prompt,
      duration: parsedDuration,
      quality: parsedQuality,
      aspectRatio: aspectRatio || "16:9",
      generateAudio: generateAudio !== false,
      imageUrls: model.includes("image-to-video") || model.includes("reference-to-video") ? imageUrls : undefined,
      videoUrls: model.includes("reference-to-video") ? videoUrls : undefined,
      audioUrls: model.includes("reference-to-video") ? audioUrls : undefined,
    });

    if (!result.success) {
      // REFUND credits on API failure
      await supabase.rpc("refund_upscaler_credits", {
        _user_id: userId,
        _amount: creditsToCharge,
        _description: `Estorno - Seedance 2 falhou (${model})`,
      });
      creditsCharged = 0; // prevent double refund in catch
      console.log(`[seedance-generate] Refunded ${creditsToCharge} credits to user ${userId}`);

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
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[seedance-generate] Unhandled error:", errMsg);

    // SAFETY NET: refund credits if they were charged but the function crashed
    if (supabase && userId && creditsCharged > 0) {
      try {
        await supabase.rpc("refund_upscaler_credits", {
          _user_id: userId,
          _amount: creditsCharged,
          _description: `Estorno automático - Seedance 2 crash`,
        });
        console.log(`[seedance-generate] SAFETY: Refunded ${creditsCharged} credits to ${userId} after crash`);
      } catch (refundErr) {
        console.error("[seedance-generate] CRITICAL: Failed to refund after crash:", refundErr);
      }
    }

    // Mark job as failed in DB
    if (supabase && jobId) {
      try {
        await supabase.from("seedance_jobs").update({
          status: "failed",
          error_message: `Server error: ${errMsg}`,
          credits_charged: 0,
        }).eq("id", jobId);
      } catch (_) { /* best effort */ }
    }

    return new Response(JSON.stringify({ success: false, error: errMsg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
