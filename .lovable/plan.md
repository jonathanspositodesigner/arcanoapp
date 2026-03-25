

# Fix: Webhook Not Finding Image Generator Jobs

## Root Cause

The `runninghub-webhook` edge function on the server is running an **old deployed version** that does NOT include `image_generator_jobs` in the `IMAGE_JOB_TABLES` array. The codebase is correct (line 29 includes it), but the server version predates the migration.

**Evidence from logs:**
- Webhook received `TASK_END` for taskId `2036816453054894082` at 14:44:50 → **"Job not found"**
- The job only completed ~35 seconds later when you clicked "Verificar Status", which triggered the `/reconcile` endpoint (a different function), which found the result and called `/finish`

This is the exact same problem that happened with the queue manager — the code exists but the function wasn't redeployed after adding `image_generator_jobs`.

## Fix

**Redeploy `runninghub-webhook`** — no code changes needed. The current codebase already has `image_generator_jobs` in `IMAGE_JOB_TABLES` (line 29). Once redeployed, webhooks from RunningHub will immediately find and complete image generator jobs, eliminating the delay.

## What This Fixes
- Images will appear **instantly** when RunningHub finishes (via webhook → /finish → realtime update)
- No more "stuck on running" requiring manual "Verificar Status" click
- Thumbnails, push notifications, and credit accounting all triggered properly on first webhook

