

# Fix: "Gerar Imagem" — Edge Function Not Deployed

## Root Cause

The edge function `runninghub-image-generator` **was never deployed**. The file exists in the codebase (`supabase/functions/runninghub-image-generator/index.ts`) but has zero logs on the server. Every call from the frontend returns "Failed to send a request to the Edge Function", which triggers 4 retries and then marks the job as failed via the queue manager's `/finish` endpoint.

## Fix

**Deploy the edge function.** The code itself is correct — identical patterns to the 8 other RunningHub functions that are all working (same imports, same CORS, same structure). No code changes needed.

### Step 1: Deploy `runninghub-image-generator`
Use the deploy tool to push the function to the server. This is the only action needed.

### Step 2: Verify deployment
Check the function logs to confirm it boots and responds correctly.

---

## Technical Details

- The frontend (`GerarImagemTool.tsx`) calls `supabase.functions.invoke('runninghub-image-generator/run', ...)` via `JobManager.startJob()`
- JobManager retries 4 times with exponential backoff (2s, 5s, 10s delays)
- All 4 attempts fail with "Failed to send a request to the Edge Function" because the function doesn't exist on the server
- After attempt 4, the catch block calls `mark_pending_job_as_failed` which goes through `runninghub-queue-manager/finish` to mark the job as failed
- The queue manager log confirms: `[image_generator_jobs] Job 68c02eb8: failed { error: "Falha na comunicação com o servidor" }`
- No code changes required — just deployment

