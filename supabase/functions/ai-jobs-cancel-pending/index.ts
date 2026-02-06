// supabase/functions/ai-jobs-cancel-pending/index.ts
// Cancela em massa jobs "pending"/"queued" do usuário autenticado em todas as ferramentas.

import { createClient } from "npm:@supabase/supabase-js@2";
import type { User } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const JOB_TABLES = [
  "upscaler_jobs",
  "pose_changer_jobs",
  "veste_ai_jobs",
  "video_upscaler_jobs",
] as const;

type JobTable = (typeof JOB_TABLES)[number];

type CancelStatus = "pending" | "queued";

function getSupabaseClient(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  }

  // Pass through the user's JWT so RLS + RPCs use auth.uid()
  const authHeader = req.headers.get("Authorization") ?? "";

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
}

async function requireUser(supabase: ReturnType<typeof createClient>): Promise<User> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Unauthorized");
  return data.user;
}

async function listCancelableJobs(
  supabase: ReturnType<typeof createClient>,
  table: JobTable,
  userId: string,
  statuses: CancelStatus[],
  limit: number,
) {
  const { data, error } = await supabase
    .from(table)
    .select("id,status")
    .eq("user_id", userId)
    .in("status", statuses)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as Array<{ id: string; status: string }>;
}

async function cancelOne(
  supabase: ReturnType<typeof createClient>,
  table: JobTable,
  jobId: string,
) {
  // Prefer RPC porque centraliza regras de estorno / idempotência.
  // IMPORTANTE: o RPC pode retornar { success: false } SEM erro.
  const { data, error } = await supabase.rpc("user_cancel_ai_job", {
    p_table_name: table,
    p_job_id: jobId,
  });

  const rpcResult = Array.isArray(data) ? data[0] : data;
  const rpcSuccess = Boolean(rpcResult?.success);

  if (!error && rpcSuccess) {
    return { ok: true as const, rpc: rpcResult };
  }

  const reason =
    (error?.message || rpcResult?.error_message || "RPC não confirmou cancelamento").toString();

  // Fallback: marca como cancelled para destravar UI (sem estorno garantido)
  const { error: updateError } = await supabase
    .from(table)
    .update({
      status: "cancelled",
      error_message: `Cancelado em massa (${reason})`,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (updateError) {
    return {
      ok: false as const,
      error: `RPC not confirmed: ${reason}; fallback update failed: ${updateError.message}`,
    };
  }

  return {
    ok: true as const,
    warning: `RPC not confirmed (${reason}); used fallback update`,
  };
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseClient(req);
    const user = await requireUser(supabase);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    const statuses = (Array.isArray(body.statuses) ? body.statuses : ["pending", "queued"]) as CancelStatus[];
    const limitPerTable = Number.isFinite(body.limitPerTable) ? Number(body.limitPerTable) : 200;
    const dryRun = Boolean(body.dryRun);

    const perTable: Record<string, any> = {};
    let totalFound = 0;
    let totalCancelled = 0;

    for (const table of JOB_TABLES) {
      const jobs = await listCancelableJobs(supabase, table, user.id, statuses, limitPerTable);
      totalFound += jobs.length;

      const tableResult = {
        found: jobs.length,
        cancelled: 0,
        errors: [] as string[],
        warnings: [] as string[],
      };

      if (!dryRun) {
        for (const job of jobs) {
          const res = await cancelOne(supabase, table, job.id);
          if (res.ok) {
            tableResult.cancelled += 1;
            totalCancelled += 1;
            if ("warning" in res) tableResult.warnings.push(res.warning);
          } else {
            tableResult.errors.push(res.error);
          }
        }
      }

      perTable[table] = tableResult;
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: user.id,
        statuses,
        dryRun,
        totalFound,
        totalCancelled: dryRun ? 0 : totalCancelled,
        perTable,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[ai-jobs-cancel-pending] error:", message);

    const status = message.toLowerCase().includes("unauthorized") ? 401 : 500;

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status },
    );
  }
});
