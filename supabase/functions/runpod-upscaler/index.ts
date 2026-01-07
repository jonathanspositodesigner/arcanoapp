import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Runpod API Configuration
const RUNPOD_API_KEY = Deno.env.get('RUNPOD_API_KEY') || '';
const RUNPOD_ENDPOINT_ID = Deno.env.get('RUNPOD_ENDPOINT_ID') || '';

if (!RUNPOD_API_KEY) {
  console.error('[Runpod] CRITICAL: Missing RUNPOD_API_KEY secret');
}
if (!RUNPOD_ENDPOINT_ID) {
  console.error('[Runpod] CRITICAL: Missing RUNPOD_ENDPOINT_ID secret');
}

console.log('[Runpod] Config loaded - ENDPOINT_ID:', RUNPOD_ENDPOINT_ID ? `${RUNPOD_ENDPOINT_ID.substring(0, 8)}...` : '(not set)');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TODO: Replace with your actual workflow JSON from ComfyUI export
// This is a placeholder structure - you'll need to export your workflow from ComfyUI
const WORKFLOW_TEMPLATE = {
  // Your ComfyUI workflow will go here after you export it
  // The structure will be something like:
  // "1": { "class_type": "LoadImage", "inputs": { ... } },
  // "2": { "class_type": "...", "inputs": { ... } },
  // etc.
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    
    console.log(`[Runpod] Endpoint called: ${path}`);

    if (path === 'run') {
      return await handleRun(req);
    } else if (path === 'status') {
      return await handleStatus(req);
    } else {
      return new Response(JSON.stringify({ error: 'Invalid endpoint. Use /run or /status' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Runpod] Unhandled error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Start a new job on Runpod Serverless
async function handleRun(req: Request) {
  if (!RUNPOD_API_KEY) {
    return new Response(JSON.stringify({ 
      error: 'RUNPOD_API_KEY not configured',
      code: 'MISSING_API_KEY',
      solution: 'Add RUNPOD_API_KEY secret in backend settings'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!RUNPOD_ENDPOINT_ID) {
    return new Response(JSON.stringify({ 
      error: 'RUNPOD_ENDPOINT_ID not configured',
      code: 'MISSING_ENDPOINT_ID',
      solution: 'Add RUNPOD_ENDPOINT_ID secret in backend settings. Create your endpoint at comfy.getrunpod.io'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { 
    imageBase64,
    fileName,
    mode,
    resolution,
    creativityDenoise,
    detailDenoise
  } = await req.json();
  
  if (!imageBase64) {
    return new Response(JSON.stringify({ error: 'imageBase64 is required', code: 'MISSING_IMAGE' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`[Runpod] Starting job - mode: ${mode}, resolution: ${resolution}`);
  console.log(`[Runpod] creativity: ${creativityDenoise}, detail: ${detailDenoise}`);

  try {
    // Build the workflow with parameters
    // TODO: This needs to be customized based on your actual workflow structure
    const workflow = buildWorkflow({
      mode,
      resolution,
      creativityDenoise,
      detailDenoise,
    });

    // Runpod Serverless API request
    const requestBody = {
      input: {
        workflow: workflow,
        images: [
          {
            name: fileName || 'input.png',
            image: imageBase64, // base64 encoded image
          }
        ]
      }
    };

    console.log('[Runpod] Sending request to endpoint:', RUNPOD_ENDPOINT_ID);

    const response = await fetch(`https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log('[Runpod] Run response:', JSON.stringify(data));

    if (data.error || !data.id) {
      return new Response(JSON.stringify({ 
        error: data.error || 'Failed to start job',
        code: 'RUN_FAILED',
        details: data,
        solution: 'Check your Runpod endpoint configuration and workflow'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      jobId: data.id,
      status: data.status,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown run error';
    console.error('[Runpod] Run error:', error);
    return new Response(JSON.stringify({ error: errorMessage, code: 'RUN_EXCEPTION' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Check job status on Runpod
async function handleStatus(req: Request) {
  if (!RUNPOD_API_KEY || !RUNPOD_ENDPOINT_ID) {
    return new Response(JSON.stringify({ 
      error: 'Runpod not configured',
      code: 'NOT_CONFIGURED'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { jobId } = await req.json();
  
  if (!jobId) {
    return new Response(JSON.stringify({ error: 'jobId is required', code: 'MISSING_JOB_ID' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`[Runpod] Checking status for jobId: ${jobId}`);

  try {
    const response = await fetch(`https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/status/${jobId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
      },
    });

    const data = await response.json();
    console.log('[Runpod] Status response:', JSON.stringify(data));

    // Runpod status values: IN_QUEUE, IN_PROGRESS, COMPLETED, FAILED, CANCELLED
    return new Response(JSON.stringify({ 
      success: true, 
      status: data.status,
      output: data.output,
      error: data.error,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown status error';
    console.error('[Runpod] Status error:', error);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      code: 'STATUS_EXCEPTION'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Build workflow with parameters
// TODO: This function needs to be customized based on your actual workflow
function buildWorkflow(params: {
  mode: string;
  resolution: number;
  creativityDenoise: number;
  detailDenoise: number;
}) {
  // This is a placeholder - you need to replace with your actual workflow
  // After exporting from ComfyUI, you'll modify the relevant node values here
  
  const workflow = { ...WORKFLOW_TEMPLATE };
  
  // Example of how to set values (adjust node IDs based on your workflow):
  // workflow["136:1"].inputs.max_width = params.resolution;
  // workflow["136:1"].inputs.max_height = params.resolution;
  // workflow["164"].inputs.value = params.creativityDenoise;
  // workflow["165"].inputs.value = params.detailDenoise;
  
  console.log(`[Runpod] Built workflow with params:`, params);
  
  return workflow;
}
