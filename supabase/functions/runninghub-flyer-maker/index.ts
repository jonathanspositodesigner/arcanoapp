import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * FLYER MAKER - EDGE FUNCTION
 * 
 * Ferramenta de IA que gera flyers personalizados.
 * Usa o workflow WebApp ID 2025656642724962305
 * 
 * Nodes do Workflow:
 * - Node 11-15: Fotos dos artistas 1-5 (image)
 * - Node 1: Flyer de referência (image)
 * - Node 28: Logo do local (image)
 * - Node 6: Data hora e local (text)
 * - Node 10: Nomes dos artistas (text)
 * - Node 7: Título (text)
 * - Node 9: Promoção de rodapé (text)
 * - Node 103: Endereço (text)
 * - Node 153: Tamanho/aspectRatio (aspectRatio)
 * - Node 111: Criatividade da IA (value 0-5)
 * 
 * Endpoints:
 * - /upload - Upload de imagem para RunningHub
 * - /run - Inicia processamento
 * - /queue-status - Consulta status do job
 * - /reconcile - Reconciliação manual
 */

const RUNNINGHUB_API_KEY = (
  Deno.env.get('RUNNINGHUB_API_KEY') ||
  Deno.env.get('RUNNINGHUB_APIKEY') ||
  ''
).trim();

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const WEBAPP_ID_EVENTO = '2025656642724962305';
const WEBAPP_ID_AGENDA = '2044904569490120705';
const WEBAPP_ID_CONTRATE = '2045273255975591938';
const WEBAPP_ID_OUTRO = '2046326522990043138';
const WEBAPP_ID = WEBAPP_ID_EVENTO; // legacy alias used in logs
const JOB_TABLE = 'flyer_maker_jobs';

const RATE_LIMIT_UPLOAD = { maxRequests: 10, windowSeconds: 60 };
const RATE_LIMIT_RUN = { maxRequests: 5, windowSeconds: 60 };

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

if (!RUNNINGHUB_API_KEY) {
  console.error('[FlyerMaker] CRITICAL: Missing RUNNINGHUB_API_KEY secret');
}

console.log('[FlyerMaker] Config loaded - WebApp ID:', WEBAPP_ID);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ========== OBSERVABILITY HELPER ==========

async function logStep(jobId: string, step: string, details?: Record<string, any>): Promise<void> {
  const timestamp = new Date().toISOString();
  const entry = { step, timestamp, ...details };
  try {
    const { data: job } = await supabase.from(JOB_TABLE).select('step_history').eq('id', jobId).maybeSingle();
    const currentHistory = (job?.step_history as any[]) || [];
    await supabase.from(JOB_TABLE).update({ current_step: step, step_history: [...currentHistory, entry] }).eq('id', jobId);
    console.log(`[FlyerMaker] Job ${jobId}: ${step}`, details || '');
  } catch (e) { console.error(`[logStep] Error:`, e); }
}

async function logStepFailure(jobId: string, failedAtStep: string, errorMessage: string, rawResponse?: Record<string, any>): Promise<void> {
  const timestamp = new Date().toISOString();
  const entry = { step: 'failed', timestamp, at_step: failedAtStep, error: errorMessage };
  try {
    const { data: job } = await supabase.from(JOB_TABLE).select('step_history').eq('id', jobId).maybeSingle();
    const currentHistory = (job?.step_history as any[]) || [];
    const updateData: Record<string, any> = { current_step: 'failed', failed_at_step: failedAtStep, step_history: [...currentHistory, entry] };
    if (rawResponse) updateData.raw_api_response = rawResponse;
    await supabase.from(JOB_TABLE).update(updateData).eq('id', jobId);
    console.log(`[FlyerMaker] Job ${jobId}: FAILED at ${failedAtStep}:`, errorMessage);
  } catch (e) { console.error(`[logStepFailure] Error:`, e); }
}

// ========== SAFE JSON PARSING HELPERS ==========

async function safeParseResponse(response: Response, context: string): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  const status = response.status;
  const text = await response.text();
  console.log(`[FlyerMaker] ${context} - Status: ${status}, ContentType: ${contentType}, BodyLength: ${text.length}`);
  if (!response.ok) {
    const snippet = text.slice(0, 300);
    throw new Error(`${context} failed (${status}): ${snippet.slice(0, 100)}`);
  }
  if (!contentType.includes('application/json') && !text.trim().startsWith('{') && !text.trim().startsWith('[')) {
    const snippet = text.slice(0, 300);
    throw new Error(`${context} returned HTML/error (${status}): ${snippet.slice(0, 100)}`);
  }
  try { return JSON.parse(text); } catch (e) {
    throw new Error(`${context} invalid JSON (${status}): ${text.slice(0, 100)}`);
  }
}

async function fetchWithRetry(url: string, options: RequestInit, context: string, maxRetries: number = 4): Promise<Response> {
  const retryableStatuses = [429, 502, 503, 504];
  const delays = [2000, 5000, 10000, 15000];
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);
    if (!retryableStatuses.includes(response.status)) return response;
    await response.text();
    if (attempt < maxRetries - 1) {
      const delay = delays[attempt] || 2000;
      console.warn(`[FlyerMaker] ${context} got ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(r => setTimeout(r, delay));
    } else {
      throw new Error(`${context} failed after ${maxRetries} retries (${response.status})`);
    }
  }
  throw new Error(`${context} failed - unexpected retry loop exit`);
}

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

async function checkRateLimit(ip: string, endpoint: string, maxRequests: number, windowSeconds: number): Promise<{ allowed: boolean }> {
  try {
    const { data } = await supabase.rpc('check_rate_limit', { _ip_address: ip, _endpoint: endpoint, _max_requests: maxRequests, _window_seconds: windowSeconds });
    return { allowed: data?.[0]?.allowed ?? true };
  } catch { return { allowed: true }; }
}

// ========== UPLOAD IMAGE TO RUNNINGHUB ==========

async function uploadImageToRunningHub(imageUrl: string, label: string, jobId: string): Promise<string> {
  await logStep(jobId, `downloading_${label}`);
  const imgResponse = await fetch(imageUrl);
  if (!imgResponse.ok) throw new Error(`Failed to download ${label} (${imgResponse.status})`);
  const blob = await imgResponse.blob();
  const name = imageUrl.split('/').pop() || `${label}.png`;

  const formData = new FormData();
  formData.append('apiKey', RUNNINGHUB_API_KEY);
  formData.append('fileType', 'image');
  formData.append('file', blob, name);

  await logStep(jobId, `uploading_${label}`);
  const uploadResponse = await fetchWithRetry('https://www.runninghub.ai/task/openapi/upload', { method: 'POST', body: formData }, `Upload ${label}`);
  const data = await safeParseResponse(uploadResponse, `Upload ${label}`);
  if (data.code !== 0) throw new Error(`${label} upload failed: ${data.msg || 'Unknown'}`);
  console.log(`[FlyerMaker] ${label} uploaded:`, data.data.fileName);
  return data.data.fileName;
}

// ========== MAIN HANDLER ==========

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    const clientIP = getClientIP(req);
    console.log(`[FlyerMaker] Endpoint: ${path}, IP: ${clientIP}`);

    if (path === 'upload' || path === 'run') {
      const rateConfig = path === 'upload' ? RATE_LIMIT_UPLOAD : RATE_LIMIT_RUN;
      const rl = await checkRateLimit(clientIP, `runninghub-flyer-maker/${path}`, rateConfig.maxRequests, rateConfig.windowSeconds);
      if (!rl.allowed) {
        return new Response(JSON.stringify({ error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
        });
      }
    }

    if (path === 'run') return await handleRun(req);
    else if (path === 'queue-status') return await handleQueueStatus(req);
    else if (path === 'reconcile') return await handleReconcile(req);
    else return new Response(JSON.stringify({ error: 'Invalid endpoint' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[FlyerMaker] Unhandled error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

// ========== /run ==========

async function handleRun(req: Request) {
  if (!RUNNINGHUB_API_KEY) {
    return new Response(JSON.stringify({ error: 'API key not configured', code: 'MISSING_API_KEY' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json();
  const {
    jobId, creditCost,
    referenceImageUrl, artistPhotoUrls, logoUrl,
    dateTimeLocation, title, address, artistNames, footerPromo,
    imageSize, creativity
  } = body;
  const flyerSubType: 'evento' | 'agenda' | 'contrate' | 'outro' =
    body.flyerSubType === 'agenda' ? 'agenda' :
    body.flyerSubType === 'contrate' ? 'contrate' :
    body.flyerSubType === 'outro' ? 'outro' : 'evento';
  const webappId =
    flyerSubType === 'agenda' ? WEBAPP_ID_AGENDA :
    flyerSubType === 'contrate' ? WEBAPP_ID_CONTRATE :
    flyerSubType === 'outro' ? WEBAPP_ID_OUTRO :
    WEBAPP_ID_EVENTO;

  // ========== JWT AUTH VERIFICATION ==========
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const anonClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!);
  const jwtToken = authHeader.replace('Bearer ', '');
  const { data: { user: authUser }, error: authError } = await anonClient.auth.getUser(jwtToken);
  if (authError || !authUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized', code: 'INVALID_TOKEN' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const userId = authUser.id;
  console.log(`[FlyerMaker] JWT verified - userId: ${userId}, subType: ${flyerSubType}, webappId: ${webappId}`);

  // Validate required fields
  if (!jobId || !referenceImageUrl) {
    return new Response(JSON.stringify({ error: 'Missing required fields', code: 'MISSING_PARAMS' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  // Evento requires artists + logo; agenda/contrate require artists
  if (flyerSubType === 'evento' && (!artistPhotoUrls?.length || !logoUrl)) {
    return new Response(JSON.stringify({ error: 'Missing required fields for evento', code: 'MISSING_PARAMS' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if ((flyerSubType === 'agenda' || flyerSubType === 'contrate') && !artistPhotoUrls?.length) {
    return new Response(JSON.stringify({ error: 'Missing required fields', code: 'MISSING_PARAMS' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (typeof creditCost !== 'number' || creditCost < 1 || creditCost > 500) {
    return new Response(JSON.stringify({ error: 'Invalid credit cost', code: 'INVALID_CREDIT_COST' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate URLs from Supabase storage
  const allowedDomains = ['supabase.co', 'supabase.in', SUPABASE_URL.replace('https://', '')];
  const allImageUrls = [referenceImageUrl, ...(artistPhotoUrls || [])];
  if (logoUrl) allImageUrls.push(logoUrl);
  for (const imageUrl of allImageUrls) {
    try {
      const urlObj = new URL(imageUrl);
      if (!allowedDomains.some(d => urlObj.hostname.endsWith(d))) {
        return new Response(JSON.stringify({ error: 'Image URLs must be from storage', code: 'INVALID_IMAGE_SOURCE' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid image URL', code: 'INVALID_IMAGE_URL' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // NOTE: No early status update - job stays 'pending' until queue manager decides

  await logStep(jobId, 'starting', { imageSize, creativity, artistCount: artistPhotoUrls.length });

  // ========== UPLOAD ALL IMAGES TO RUNNINGHUB ==========
  let referenceFileName: string;
  const artistFileNames: string[] = [];
  let logoFileName: string | null = null;

  try {
    referenceFileName = await uploadImageToRunningHub(referenceImageUrl, 'reference', jobId);

    for (let i = 0; i < (artistPhotoUrls?.length || 0); i++) {
      const fn = await uploadImageToRunningHub(artistPhotoUrls[i], `artist_${i + 1}`, jobId);
      artistFileNames.push(fn);
    }

    if (logoUrl) {
      logoFileName = await uploadImageToRunningHub(logoUrl, 'logo', jobId);
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Image transfer failed';
    await logStepFailure(jobId, 'image_transfer', errorMsg);
    await supabase.from(JOB_TABLE).update({ status: 'failed', error_message: `IMAGE_TRANSFER_ERROR: ${errorMsg.slice(0, 200)}`, completed_at: new Date().toISOString() }).eq('id', jobId);
    return new Response(JSON.stringify({ error: errorMsg, code: 'IMAGE_TRANSFER_ERROR' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ========== CONSUME CREDITS (TEST CREDITS FIRST) ==========
  await logStep(jobId, 'consuming_credits', { amount: creditCost });

  // 1. Try test credits first
  let testCreditsUsed = 0;
  let normalCreditsToCharge = creditCost;

  try {
    const { data: testResult, error: testError } = await supabase.rpc('consume_flyer_test_credits', {
      _user_id: userId, _amount: creditCost
    });
    if (!testError && testResult && testResult.length > 0) {
      testCreditsUsed = testResult[0].test_used ?? 0;
      normalCreditsToCharge = testResult[0].remaining ?? creditCost;
      console.log(`[FlyerMaker] Test credits used: ${testCreditsUsed}, normal to charge: ${normalCreditsToCharge}`);
    }
  } catch (e) {
    console.warn('[FlyerMaker] Test credits check failed (non-blocking):', e);
  }

  // 2. Charge normal credits for the remaining amount
  if (normalCreditsToCharge > 0) {
    const { data: creditResult, error: creditError } = await supabase.rpc('consume_upscaler_credits', {
      _user_id: userId, _amount: normalCreditsToCharge, _description: `Flyer Maker${testCreditsUsed > 0 ? ` (${testCreditsUsed} teste)` : ''}`
    });

    if (creditError) {
      // Refund test credits if normal credits fail (test credits should not be lost)
      if (testCreditsUsed > 0) {
        await supabase.from('flyer_maker_test_credits' as any)
          .update({ balance: (await supabase.rpc('get_flyer_test_credits', { _user_id: userId })) + testCreditsUsed } as any)
          .eq('user_id', userId).catch(() => {});
      }
      await logStepFailure(jobId, 'consume_credits', creditError.message);
      return new Response(JSON.stringify({ error: 'Erro ao processar créditos', code: 'CREDIT_ERROR' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!creditResult?.length || !creditResult[0].success) {
      // Refund test credits (insufficient normal credits)
      if (testCreditsUsed > 0) {
        const currentBal = await supabase.rpc('get_flyer_test_credits', { _user_id: userId });
        await supabase.from('flyer_maker_test_credits' as any)
          .update({ balance: (currentBal || 0) + testCreditsUsed } as any)
          .eq('user_id', userId).catch(() => {});
      }
      const errorMsg = creditResult?.[0]?.error_message || 'Saldo insuficiente';
      await logStepFailure(jobId, 'consume_credits', errorMsg);
      return new Response(JSON.stringify({ error: errorMsg, code: 'INSUFFICIENT_CREDITS' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // Mark credits as charged + persist file names (job_payload is set in the next update)
  await supabase.from(JOB_TABLE).update({
    credits_charged: true,
    user_credit_cost: creditCost,
    reference_file_name: referenceFileName,
    artist_photo_file_names: artistFileNames,
    logo_file_name: logoFileName,
    image_size: imageSize,
  }).eq('id', jobId);

  // Save job_payload for queue manager
  const agendaNodeInfoList = flyerSubType === 'agenda' ? [
    { nodeId: '1', fieldName: 'image', fieldValue: referenceFileName, description: 'FLYER REFERENCIA' },
    { nodeId: '11', fieldName: 'image', fieldValue: artistFileNames[0], description: 'SUA FOTO' },
    { nodeId: '7', fieldName: 'text', fieldValue: title || 'TITULO: AGENDA MENSAL', description: 'TITULO' },
    { nodeId: '10', fieldName: 'text', fieldValue: artistNames || 'NOMES DOS ARTISTAS:', description: 'NOME DO ARTISTA' },
    { nodeId: '140', fieldName: 'text', fieldValue: dateTimeLocation || '', description: 'DATAS' },
    { nodeId: '9', fieldName: 'text', fieldValue: footerPromo || 'PROMOÇÃO DE RODAPÉ:', description: 'INFORMAÇÃO ADICIONAL' },
    { nodeId: '107', fieldName: 'value', fieldValue: String(creativity ?? 4), description: 'CRIATIVIDADE DA IA' },
    { nodeId: '190', fieldName: 'aspectRatio', fieldValue: imageSize || '9:16', description: 'TAMANHO DA IMAGEM' },
  ] : null;

  // Contrate: nodeInfoList per WebApp 2045273255975591938
  // node 1 = flyer ref, node 11 = artist photo, node 7 = title, node 10 = artist name,
  // node 140 = contact/phone, node 9 = footer info, node 107 = creativity, node 190 = aspectRatio
  const contrateNodeInfoList = flyerSubType === 'contrate' ? [
    { nodeId: '1', fieldName: 'image', fieldValue: referenceFileName, description: 'FLYER REFERENCIA' },
    { nodeId: '11', fieldName: 'image', fieldValue: artistFileNames[0], description: 'FOTO DO ARTISTA' },
    { nodeId: '7', fieldName: 'text', fieldValue: title || 'TITULO:', description: 'TITULO' },
    { nodeId: '10', fieldName: 'text', fieldValue: artistNames || 'NOMES DOS ARTISTAS:', description: 'NOME DO ARTISTA' },
    { nodeId: '140', fieldName: 'text', fieldValue: dateTimeLocation || 'CONTATO:', description: 'CONTATO TELEFONE' },
    { nodeId: '9', fieldName: 'text', fieldValue: footerPromo || 'PROMOÇÃO DE RODAPÉ:', description: 'OUTRAS INFORMAÇÕES' },
    { nodeId: '107', fieldName: 'value', fieldValue: String(creativity ?? 4), description: 'CRIATIVIDADE DA IA' },
    { nodeId: '190', fieldName: 'aspectRatio', fieldValue: imageSize || '9:16', description: 'TAMANHO DA IMAGEM' },
  ] : null;

  const prebuiltNodeInfoList = agendaNodeInfoList || contrateNodeInfoList;

  // Outro: nodeInfoList for WebApp 2046326522990043138
  const outroNodeInfoList = flyerSubType === 'outro' ? (() => {
    const nodes: Array<{ nodeId: string; fieldName: string; fieldValue: string; description: string; fieldData?: string }> = [
      { nodeId: '1', fieldName: 'image', fieldValue: referenceFileName, description: 'FLYER REFERENCIA' },
      { nodeId: '7', fieldName: 'text', fieldValue: title || 'HEADLINE:', description: 'HEADLINE' },
      { nodeId: '10', fieldName: 'text', fieldValue: address || 'SUB-HEADLINE:', description: 'SUB HEADLINE' },
      { nodeId: '140', fieldName: 'text', fieldValue: dateTimeLocation || 'CALL TO ACTION:', description: 'CALL TO ACTION' },
      { nodeId: '9', fieldName: 'text', fieldValue: footerPromo || 'PROMO:', description: 'RODAPÉ' },
      { nodeId: '107', fieldName: 'value', fieldValue: String(creativity ?? 2), description: 'CRIATIVIDADE DA IA' },
      { nodeId: '190', fieldName: 'aspectRatio', fieldData: '[["auto", "1:1", "1:4", "1:8", "2:3", "3:2", "3:4", "4:1", "4:3", "4:5", "5:4", "8:1", "9:16", "16:9", "21:9"], {"default": "4:3"}]', fieldValue: imageSize || '9:16', description: 'TAMANHO DA IMAGEM' },
    ];
    if (artistFileNames.length > 0) {
      nodes.push({ nodeId: '11', fieldName: 'image', fieldValue: artistFileNames[0], description: 'SUA IMAGEM' });
    }
    if (logoFileName) {
      nodes.push({ nodeId: '195', fieldName: 'image', fieldValue: logoFileName, description: 'LOGO' });
    }
    return nodes;
  })() : null;

  const finalNodeInfoList = prebuiltNodeInfoList || outroNodeInfoList;

  await supabase.from(JOB_TABLE).update({
    job_payload: {
      flyerSubType,
      webappId,
      ...(finalNodeInfoList ? { nodeInfoList: finalNodeInfoList } : {}),
      referenceFileName, artistFileNames, logoFileName,
      dateTimeLocation: dateTimeLocation || '', title: title || '',
      address: address || '', artistNames: artistNames || '',
      footerPromo: footerPromo || '', imageSize: imageSize || '3:4',
      creativity: creativity ?? 0,
      test_credits_used: testCreditsUsed,
      normal_credits_charged: normalCreditsToCharge,
    }
  }).eq('id', jobId);

  // ========== DELEGATE TO QUEUE MANAGER ==========
  try {
    await logStep(jobId, 'delegating_to_queue', { flyerSubType, webappId });
    const qmResponse = await fetch(`${SUPABASE_URL}/functions/v1/runninghub-queue-manager/run-or-queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ table: JOB_TABLE, jobId, webappId }),
    });
    const qmResult = await qmResponse.json();

    if (qmResult.queued) {
      return new Response(JSON.stringify({ success: true, queued: true, position: qmResult.position }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (qmResult.taskId) {
      return new Response(JSON.stringify({ success: true, taskId: qmResult.taskId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: qmResult.error || 'Failed', code: 'RUN_FAILED', refunded: true }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[FlyerMaker] QM call failed:`, errorMessage);
    try {
      // Only refund normal credits (test credits are never refunded)
      if (normalCreditsToCharge > 0) {
        await supabase.rpc('refund_upscaler_credits', { _user_id: userId, _amount: normalCreditsToCharge, _description: `QM_EXCEPTION: ${errorMessage.slice(0, 100)}` });
      }
      await supabase.from(JOB_TABLE).update({ status: 'failed', error_message: `QM_EXCEPTION_REFUNDED: ${errorMessage.slice(0, 200)}`, credits_refunded: true, completed_at: new Date().toISOString() }).eq('id', jobId);
    } catch { await supabase.from(JOB_TABLE).update({ status: 'failed', error_message: `QM_EXCEPTION: ${errorMessage.slice(0, 200)}`, completed_at: new Date().toISOString() }).eq('id', jobId); }
    return new Response(JSON.stringify({ error: errorMessage, code: 'RUN_EXCEPTION', refunded: true }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

// ========== /queue-status ==========

async function handleQueueStatus(req: Request) {
  const { jobId } = await req.json();
  if (!jobId) return new Response(JSON.stringify({ error: 'jobId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const { data: job } = await supabase.from(JOB_TABLE).select('status, position, output_url, error_message, task_id').eq('id', jobId).maybeSingle();
  if (!job) return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  return new Response(JSON.stringify(job), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// ========== /reconcile ==========

async function handleReconcile(req: Request) {
  const { jobId } = await req.json();
  if (!jobId) return new Response(JSON.stringify({ error: 'jobId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const { data: job } = await supabase.from(JOB_TABLE).select('id, task_id, status, api_account, output_url, user_id, user_credit_cost').eq('id', jobId).maybeSingle();
  if (!job) return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  if (['completed', 'failed', 'cancelled'].includes(job.status)) {
    return new Response(JSON.stringify({ success: true, alreadyFinalized: true, status: job.status, outputUrl: job.output_url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!job.task_id) return new Response(JSON.stringify({ error: 'No task_id yet' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  let apiKey = RUNNINGHUB_API_KEY;
  if (job.api_account && job.api_account !== 'primary') {
    const suffix = job.api_account.replace('account_', '_');
    const envKey = Deno.env.get(`RUNNINGHUB_API_KEY${suffix}`);
    if (envKey) apiKey = envKey.trim();
  }

  const queryResponse = await fetch('https://www.runninghub.ai/openapi/v2/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ taskId: job.task_id }),
  });
  const queryData = await queryResponse.json();

  console.log('[FlyerMaker] Reconcile queryData:', JSON.stringify(queryData));

  const taskStatus = queryData.data?.taskStatus || queryData.status;
  const outputFileList = queryData.data?.outputFileList || queryData.results;

  if (taskStatus === 'SUCCESS' && outputFileList?.length > 0) {
    const imageResult = outputFileList.find((r: any) => ['png', 'jpg', 'jpeg', 'webp'].includes(r.fileType || r.outputType));
    const outputUrl = imageResult?.fileUrl || imageResult?.url || outputFileList[0]?.fileUrl || outputFileList[0]?.url;

    await fetch(`${SUPABASE_URL}/functions/v1/runninghub-queue-manager/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ table: JOB_TABLE, jobId: job.id, status: 'completed', outputUrl, taskId: job.task_id, rhCost: 0, webhookPayload: { reconciled: true } }),
    });

    return new Response(JSON.stringify({ success: true, reconciled: true, status: 'completed', outputUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (taskStatus === 'FAILED') {
    await fetch(`${SUPABASE_URL}/functions/v1/runninghub-queue-manager/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ table: JOB_TABLE, jobId: job.id, status: 'failed', errorMessage: 'Failed on RunningHub', taskId: job.task_id }),
    });
    return new Response(JSON.stringify({ success: true, reconciled: true, status: 'failed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true, reconciled: false, currentStatus: queryData.status }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
