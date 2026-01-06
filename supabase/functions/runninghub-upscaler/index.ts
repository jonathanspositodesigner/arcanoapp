import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// API Configuration - reads from secrets
const RUNNINGHUB_API_KEY = (
  Deno.env.get('RUNNINGHUB_API_KEY') ||
  Deno.env.get('RUNNINGHUB_APIKEY') ||
  ''
).trim();

// Workflow ID - now configurable via secret, with fallback to hardcoded
const WORKFLOW_ID = (
  Deno.env.get('RUNNINGHUB_WORKFLOW_ID') || 
  '2008664033892769794'
).trim();

// Optional: AI App/WebApp ID for more stable execution
const WEBAPP_ID = (Deno.env.get('RUNNINGHUB_WEBAPP_ID') || '').trim();

if (!RUNNINGHUB_API_KEY) {
  console.error('[RunningHub] CRITICAL: Missing RUNNINGHUB_API_KEY secret');
}

console.log('[RunningHub] Config loaded - WORKFLOW_ID:', WORKFLOW_ID, '| WEBAPP_ID:', WEBAPP_ID || '(not set)');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    
    console.log(`[RunningHub] Endpoint called: ${path}`);

    if (path === 'upload') {
      return await handleUpload(req);
    } else if (path === 'run') {
      return await handleRun(req);
    } else if (path === 'status') {
      return await handleStatus(req);
    } else if (path === 'outputs') {
      return await handleOutputs(req);
    } else {
      return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[RunningHub] Unhandled error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Upload image to RunningHub using multipart/form-data
async function handleUpload(req: Request) {
  if (!RUNNINGHUB_API_KEY) {
    console.error('[RunningHub] Upload failed: API key not configured');
    return new Response(JSON.stringify({ 
      error: 'API key not configured. Please add RUNNINGHUB_API_KEY secret.',
      code: 'MISSING_API_KEY'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { imageBase64, fileName } = await req.json();
  
  if (!imageBase64) {
    return new Response(JSON.stringify({ error: 'imageBase64 is required', code: 'MISSING_IMAGE' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('[RunningHub] Uploading image...');

  try {
    const binaryString = atob(imageBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const ext = (fileName || 'image.png').split('.').pop()?.toLowerCase() || 'png';
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
                     ext === 'webp' ? 'image/webp' : 'image/png';

    const formData = new FormData();
    formData.append('apiKey', RUNNINGHUB_API_KEY);
    formData.append('fileType', 'image');
    formData.append('file', new Blob([bytes], { type: mimeType }), fileName || 'upload.png');

    const response = await fetch('https://www.runninghub.ai/task/openapi/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    console.log('[RunningHub] Upload response:', JSON.stringify(data));

    if (data.code !== 0) {
      return new Response(JSON.stringify({ 
        error: data.msg || 'Upload failed',
        code: data.code,
        details: data
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      fileName: data.data.fileName 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
    console.error('[RunningHub] Upload error:', error);
    return new Response(JSON.stringify({ error: errorMessage, code: 'UPLOAD_EXCEPTION' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Run the workflow - tries AI App first if configured, then falls back to workflow/create
async function handleRun(req: Request) {
  if (!RUNNINGHUB_API_KEY) {
    return new Response(JSON.stringify({ 
      error: 'API key not configured',
      code: 'MISSING_API_KEY',
      solution: 'Add RUNNINGHUB_API_KEY secret in backend settings'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { 
    fileName, 
    mode,
    resolution,
    creativityDenoise,
    detailDenoise
  } = await req.json();
  
  if (!fileName) {
    return new Response(JSON.stringify({ error: 'fileName is required', code: 'MISSING_FILENAME' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`[RunningHub] Running workflow - mode: ${mode}, resolution: ${resolution}`);
  console.log(`[RunningHub] fileName: ${fileName}, creativity: ${creativityDenoise}, detail: ${detailDenoise}`);

  // Build nodeInfoList based on mode
  const nodeInfoList: any[] = [
    { nodeId: "1", fieldName: "image", fieldValue: fileName },
  ];

  if (mode === 'upscale') {
    // Resolution - Node 136:1 (ConstrainImage)
    nodeInfoList.push(
      { nodeId: "136:1", fieldName: "max_width", fieldValue: resolution || 4096 },
      { nodeId: "136:1", fieldName: "max_height", fieldValue: resolution || 4096 },
    );
    
    // Creativity denoise - Node 164
    if (creativityDenoise !== undefined) {
      nodeInfoList.push(
        { nodeId: "164", fieldName: "value", fieldValue: creativityDenoise }
      );
    }
    
    // Detail denoise - Node 165
    if (detailDenoise !== undefined) {
      nodeInfoList.push(
        { nodeId: "165", fieldName: "value", fieldValue: detailDenoise }
      );
    }
  }

  // Try AI App method first if webappId is configured (more stable)
  if (WEBAPP_ID) {
    console.log('[RunningHub] Trying AI App method with webappId:', WEBAPP_ID);
    
    const aiAppResult = await tryAiAppRun(nodeInfoList);
    if (aiAppResult.success) {
      return new Response(JSON.stringify({ 
        success: true, 
        taskId: aiAppResult.taskId,
        method: 'ai-app'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('[RunningHub] AI App method failed, trying workflow/create fallback...');
    console.log('[RunningHub] AI App error:', aiAppResult.error);
  }

  // Fallback or primary: workflow/create
  console.log('[RunningHub] Using workflow/create with workflowId:', WORKFLOW_ID);
  
  const workflowResult = await tryWorkflowCreate(nodeInfoList);
  
  if (workflowResult.success) {
    return new Response(JSON.stringify({ 
      success: true, 
      taskId: workflowResult.taskId,
      method: 'workflow-create'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Both methods failed - return detailed error
  const errorResponse = {
    error: workflowResult.error || 'Failed to start workflow',
    code: workflowResult.code || 'RUN_FAILED',
    msg: workflowResult.msg,
    details: workflowResult.details,
    workflowId: WORKFLOW_ID,
    webappId: WEBAPP_ID || null,
    solution: getSolutionForError(workflowResult.code, workflowResult.msg)
  };

  console.error('[RunningHub] Run failed:', JSON.stringify(errorResponse));

  return new Response(JSON.stringify(errorResponse), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Try running via AI App endpoint
async function tryAiAppRun(nodeInfoList: any[]): Promise<{
  success: boolean;
  taskId?: string;
  error?: string;
  code?: number;
  msg?: string;
  details?: any;
}> {
  try {
    const requestBody = {
      apiKey: RUNNINGHUB_API_KEY,
      webappId: WEBAPP_ID,
      nodeInfoList: nodeInfoList,
    };

    console.log('[RunningHub] AI App request:', JSON.stringify({ ...requestBody, apiKey: '[REDACTED]' }));

    const response = await fetch('https://www.runninghub.ai/task/openapi/ai-app/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log('[RunningHub] AI App response:', JSON.stringify(data));

    if (data.code === 0 && data.data?.taskId) {
      return { success: true, taskId: data.data.taskId };
    }

    return {
      success: false,
      error: data.msg || 'AI App run failed',
      code: data.code,
      msg: data.msg,
      details: data
    };
  } catch (error) {
    console.error('[RunningHub] AI App exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AI App exception'
    };
  }
}

// Try running via workflow/create endpoint
async function tryWorkflowCreate(nodeInfoList: any[]): Promise<{
  success: boolean;
  taskId?: string;
  error?: string;
  code?: number;
  msg?: string;
  details?: any;
}> {
  try {
    const requestBody = {
      apiKey: RUNNINGHUB_API_KEY,
      workflowId: WORKFLOW_ID,
      nodeInfoList: nodeInfoList,
    };

    console.log('[RunningHub] Workflow create request:', JSON.stringify({ 
      ...requestBody, 
      apiKey: '[REDACTED]',
      nodeInfoList: nodeInfoList.map(n => ({ nodeId: n.nodeId, fieldName: n.fieldName }))
    }));

    const response = await fetch('https://www.runninghub.ai/task/openapi/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log('[RunningHub] Workflow create response:', JSON.stringify(data));

    if (data.code === 0 && data.data?.taskId) {
      return { success: true, taskId: data.data.taskId };
    }

    return {
      success: false,
      error: data.msg || 'Workflow create failed',
      code: data.code,
      msg: data.msg,
      details: data
    };
  } catch (error) {
    console.error('[RunningHub] Workflow create exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Workflow create exception'
    };
  }
}

// Get human-readable solution based on error code
function getSolutionForError(code?: number, msg?: string): string {
  if (msg?.includes('WORKFLOW_NOT_SAVED_OR_NOT_RUNNING') || code === 810) {
    return 'O workflow não está em modo executável. No RunningHub: 1) Abra o workflow 2) Clique "Save" e depois "Save (API Format)" 3) Clique "Queue Prompt" uma vez 4) Aguarde 1-2 minutos. OU configure RUNNINGHUB_WEBAPP_ID para usar o modo AI App.';
  }
  if (msg?.includes('API_KEY') || code === 401) {
    return 'API Key inválida ou expirada. Verifique RUNNINGHUB_API_KEY nas configurações.';
  }
  if (msg?.includes('WORKFLOW_NOT_FOUND') || code === 404) {
    return 'Workflow não encontrado. Verifique se RUNNINGHUB_WORKFLOW_ID está correto.';
  }
  return 'Verifique as configurações do RunningHub e tente novamente.';
}

// Check task status
async function handleStatus(req: Request) {
  const { taskId } = await req.json();
  
  if (!taskId) {
    return new Response(JSON.stringify({ error: 'taskId is required', code: 'MISSING_TASK_ID' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`[RunningHub] Checking status for taskId: ${taskId}`);

  try {
    const response = await fetch('https://www.runninghub.ai/task/openapi/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: RUNNINGHUB_API_KEY,
        taskId: taskId,
      }),
    });

    const data = await response.json();
    console.log('[RunningHub] Status response:', JSON.stringify(data));

    if (data.code !== 0) {
      return new Response(JSON.stringify({ 
        error: data.msg || 'Status check failed',
        code: data.code,
        details: data
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      status: data.data.taskStatus
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[RunningHub] Status exception:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Status check exception',
      code: 'STATUS_EXCEPTION'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Get task outputs
async function handleOutputs(req: Request) {
  const { taskId } = await req.json();
  
  if (!taskId) {
    return new Response(JSON.stringify({ error: 'taskId is required', code: 'MISSING_TASK_ID' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`[RunningHub] Getting outputs for taskId: ${taskId}`);

  try {
    const response = await fetch('https://www.runninghub.ai/task/openapi/outputs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: RUNNINGHUB_API_KEY,
        taskId: taskId,
      }),
    });

    const data = await response.json();
    console.log('[RunningHub] Outputs response:', JSON.stringify(data));

    if (data.code !== 0) {
      return new Response(JSON.stringify({ 
        error: data.msg || 'Failed to get outputs',
        code: data.code,
        details: data
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const outputs = data.data || [];
    const imageUrls = outputs
      .filter((output: any) => output.fileType === 'image')
      .map((output: any) => output.fileUrl);

    return new Response(JSON.stringify({ 
      success: true, 
      outputs: imageUrls
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[RunningHub] Outputs exception:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Outputs exception',
      code: 'OUTPUTS_EXCEPTION'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
