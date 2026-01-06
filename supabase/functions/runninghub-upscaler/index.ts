import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RUNNINGHUB_API_KEY = (
  Deno.env.get('RUNNINGHUB_API_KEY') ||
  Deno.env.get('RUNNINGHUB_APIKEY') ||
  ''
).trim();
const WORKFLOW_ID = "2008664033892769794";

if (!RUNNINGHUB_API_KEY) {
  console.error('[RunningHub] Missing RUNNINGHUB_API_KEY secret (check backend secrets)');
}
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
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
    console.error('[RunningHub] Error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Upload image to RunningHub using multipart/form-data
async function handleUpload(req: Request) {
  // Check if API key is available
  if (!RUNNINGHUB_API_KEY) {
    console.error('[RunningHub] RUNNINGHUB_API_KEY is not set');
    return new Response(JSON.stringify({ error: 'API key not configured. Please add RUNNINGHUB_API_KEY secret.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { imageBase64, fileName } = await req.json();
  
  if (!imageBase64) {
    return new Response(JSON.stringify({ error: 'imageBase64 is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('[RunningHub] Uploading image with multipart/form-data...');
  console.log('[RunningHub] API Key present:', !!RUNNINGHUB_API_KEY, 'length:', RUNNINGHUB_API_KEY.length);

  try {
    // Convert base64 to binary
    const binaryString = atob(imageBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Determine file extension and mime type
    const ext = (fileName || 'image.png').split('.').pop()?.toLowerCase() || 'png';
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
                     ext === 'webp' ? 'image/webp' : 'image/png';

    // Create FormData with file
    const formData = new FormData();
    formData.append('apiKey', RUNNINGHUB_API_KEY);
    formData.append('fileType', 'image');
    formData.append('file', new Blob([bytes], { type: mimeType }), fileName || 'upload.png');

    const response = await fetch('https://www.runninghub.ai/task/openapi/upload', {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - fetch will set it with correct boundary
    });

    const data = await response.json();
    console.log('[RunningHub] Upload response:', JSON.stringify(data));

    if (data.code !== 0) {
      return new Response(JSON.stringify({ error: data.msg || 'Upload failed' }), {
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
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Run the workflow
async function handleRun(req: Request) {
  const { 
    fileName, 
    mode, // 'upscale' or 'rembg'
    resolution, // 2048 or 4096
    creativityDenoise, // 0-1
    detailDenoise // 0-1
  } = await req.json();
  
  if (!fileName) {
    return new Response(JSON.stringify({ error: 'fileName is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`[RunningHub] Running workflow in mode: ${mode}`);
  console.log(`[RunningHub] fileName: ${fileName}`);
  console.log(`[RunningHub] resolution: ${resolution}, creativity: ${creativityDenoise}, detail: ${detailDenoise}`);

  // Build nodeInfoList based on mode
  const nodeInfoList: any[] = [
    // Input image - Node 1 (LoadImage)
    { nodeId: "1", fieldName: "image", fieldValue: fileName },
  ];

  if (mode === 'upscale') {
      // Resolution - Node 136:1 (ConstrainImage - controla tamanho final)
      nodeInfoList.push(
        { nodeId: "136:1", fieldName: "max_width", fieldValue: resolution || 4096 },
        { nodeId: "136:1", fieldName: "max_height", fieldValue: resolution || 4096 },
      );
    
    // Creativity denoise - Node 164 (Float for KSampler)
    if (creativityDenoise !== undefined) {
      nodeInfoList.push(
        { nodeId: "164", fieldName: "value", fieldValue: creativityDenoise }
      );
    }
    
    // Detail denoise - Node 165 (Float for Ultimate SD Upscaler)
    if (detailDenoise !== undefined) {
      nodeInfoList.push(
        { nodeId: "165", fieldName: "value", fieldValue: detailDenoise }
      );
    }
  }
  
  // For rembg mode, we just need the input image
  // The workflow will process and output the image without background

  const requestBody = {
    apiKey: RUNNINGHUB_API_KEY,
    workflowId: WORKFLOW_ID,
    nodeInfoList: nodeInfoList,
  };

  console.log('[RunningHub] Running workflow with workflowId:', WORKFLOW_ID);
  console.log('[RunningHub] Request body:', JSON.stringify(requestBody, null, 2));

  const response = await fetch('https://www.runninghub.ai/task/openapi/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();
  console.log('[RunningHub] Run response:', JSON.stringify(data));

  if (data.code !== 0) {
    return new Response(JSON.stringify({ error: data.msg || 'Run failed' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ 
    success: true, 
    taskId: data.data.taskId 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Check task status
async function handleStatus(req: Request) {
  const { taskId } = await req.json();
  
  if (!taskId) {
    return new Response(JSON.stringify({ error: 'taskId is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`[RunningHub] Checking status for taskId: ${taskId}`);

  const response = await fetch('https://www.runninghub.ai/task/openapi/status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      apiKey: RUNNINGHUB_API_KEY,
      taskId: taskId,
    }),
  });

  const data = await response.json();
  console.log('[RunningHub] Status response:', JSON.stringify(data));

  if (data.code !== 0) {
    return new Response(JSON.stringify({ error: data.msg || 'Status check failed' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ 
    success: true, 
    status: data.data.taskStatus // PENDING, RUNNING, SUCCESS, FAILED
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Get task outputs
async function handleOutputs(req: Request) {
  const { taskId } = await req.json();
  
  if (!taskId) {
    return new Response(JSON.stringify({ error: 'taskId is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`[RunningHub] Getting outputs for taskId: ${taskId}`);

  const response = await fetch('https://www.runninghub.ai/task/openapi/outputs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      apiKey: RUNNINGHUB_API_KEY,
      taskId: taskId,
    }),
  });

  const data = await response.json();
  console.log('[RunningHub] Outputs response:', JSON.stringify(data));

  if (data.code !== 0) {
    return new Response(JSON.stringify({ error: data.msg || 'Failed to get outputs' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Extract image URLs from outputs
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
}
