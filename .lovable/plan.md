

# Plan: Replace Google Gemini Image Generation with RunningHub Flow

## Overview
Replace the current Google Gemini-based image generation on `/gerar-imagem` with a RunningHub workflow (WebApp ID `2036803905421582337`). This follows the same architecture pattern as Arcano Cloner, Flyer Maker, etc. — job table, edge function, queue manager integration, realtime sync, and webhook.

## Node Mapping (from your documentation)
| Node | Field | Purpose |
|------|-------|---------|
| 145 | aspectRatio | Aspect ratio (auto, 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9) |
| 135 | text | Prompt |
| 58 | image | Reference image 1 |
| 147 | image | Reference image 2 |
| 148 | image | Reference image 3 |
| 149 | image | Reference image 4 |
| 62 | image | Reference image 5 |
| 150 | image | Reference image 6 |

---

## Step 1: Database Migration

**Alter `image_generator_jobs` table** to add RunningHub-specific columns (following the pattern of other job tables):

- `task_id` (text) — RunningHub task ID
- `session_id` (text) — browser session
- `input_urls` (jsonb) — array of uploaded reference image URLs
- `job_payload` (jsonb) — node parameters for queue manager
- `current_step` (text) — observability
- `step_history` (jsonb) — observability log
- `failed_at_step` (text) — where failure occurred
- `raw_webhook_payload` (jsonb) — webhook response
- `credits_charged` (boolean, default false)
- `credits_refunded` (boolean, default false)
- `api_account` (text) — which RH account ran it
- `queue_position` (integer)

Remove the `model` column default or repurpose it (currently stores "normal"/"pro"/"nano2" for Gemini models — will store "runninghub" going forward).

## Step 2: Create Edge Function `runninghub-image-generator`

New edge function following the Arcano Cloner pattern:

- **`/run` endpoint**: Receives jobId, prompt, aspectRatio, referenceImageUrls (array of up to 5 storage URLs), userId, creditCost
  - Downloads reference images from storage, uploads to RunningHub
  - Consumes credits via `consume_upscaler_credits` RPC
  - Saves `job_payload` with all node file names
  - Delegates to `runninghub-queue-manager/run-or-queue`
- **`/reconcile` endpoint**: Manual recovery for stuck jobs
- **`/queue-status` endpoint**: Check queue position

## Step 3: Update Queue Manager

Add to `runninghub-queue-manager/index.ts`:

- Add `image_generator_jobs` to `JOB_TABLES` array
- Add WebApp ID `2036803905421582337` to `WEBAPP_IDS`
- Add `TOOL_CONFIG` entry for notifications
- Add `case 'image_generator_jobs'` in the node mapping switch — maps up to 6 image nodes (58, 147, 148, 149, 62, 150) + prompt (135) + aspect ratio (145). Unused image slots get a placeholder value like `"example.png"`.

## Step 4: Update Webhook

In `runninghub-webhook/index.ts`, add `image_generator_jobs` to the table routing so completed/failed callbacks update the correct job.

## Step 5: Rewrite Frontend (`GerarImagemTool.tsx`)

Complete rewrite removing all Google/Gemini references:

- **Remove**: All imports/usage of `GoogleApiKeyModal`, `GoogleCreditsProgressBar`, `useGoogleApiKey`, model selector (normal/pro/nano2), `generate-image` and `generate-with-user-key` edge function calls, base64 result handling
- **Add**: RunningHub job flow following Arcano Cloner pattern:
  - `useJobStatusSync` for realtime DB sync
  - `useJobPendingWatchdog` for orphan detection
  - `useNotificationTokenRecovery` for push notifications
  - `useProcessingButton` for submit lock
  - `useQueueSessionCleanup` for stale sessions
  - `useAIJob` context for global job tracking
  - Image upload to Supabase Storage (`artes-cloudinary` bucket) before invoking edge function
  - `optimizeForAI()` compression on reference images
  - Queue position display, cancel support, reconcile button after 60s
  - Active job block modal (`checkActiveJob`)
- **Keep**: Prompt textarea, aspect ratio buttons (update values to match RH options: auto, 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9), 5 reference images with drag/drop/paste, download button, visual layout
- **Remove**: The "Temporariamente Indisponível" maintenance screen (lines 294-312) — the tool will be live again
- **Credit cost**: Single fixed cost (to be defined — currently uses variable costs per model). Will use `getCreditCost('gerar_imagem', X)` with one tier.

## Step 6: Update Aspect Ratio Options

Update the aspect ratio buttons to match the RunningHub workflow's supported ratios: `auto, 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9`.

## Technical Details

- **File changes**: `src/pages/GerarImagemTool.tsx`, new `supabase/functions/runninghub-image-generator/index.ts`, edits to `supabase/functions/runninghub-queue-manager/index.ts`, `supabase/functions/runninghub-webhook/index.ts`, DB migration
- **Pattern**: Identical to Arcano Cloner — upload to storage → create job row → invoke edge function `/run` → edge function uploads to RH + consumes credits + delegates to queue manager → webhook/polling completes job → realtime updates frontend
- **Reference images**: Up to 5 (or 6 if you want to use all 6 nodes). Unused slots send `"example.png"` as placeholder per RH convention.

