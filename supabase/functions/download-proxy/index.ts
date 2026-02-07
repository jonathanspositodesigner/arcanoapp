import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// Trusted domains for security
const TRUSTED_DOMAINS = [
  'rh-images-1252422369.cos.ap-beijing.myqcloud.com',
  'runninghub.cn',
  'runninghub.com',
  'jooojbaljrshgpaxdlou.supabase.co',
  'cos.ap-beijing.myqcloud.com',
  'cos.ap-shanghai.myqcloud.com',
  'cos.ap-guangzhou.myqcloud.com',
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get('url');
    const filename = url.searchParams.get('filename') || 'download.png';

    console.log(`[DownloadProxy] Request received for: ${filename}`);
    console.log(`[DownloadProxy] Target URL: ${imageUrl?.substring(0, 100)}...`);

    if (!imageUrl) {
      console.error('[DownloadProxy] Missing url parameter');
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate URL format
    let urlObj: URL;
    try {
      urlObj = new URL(imageUrl);
    } catch {
      console.error('[DownloadProxy] Invalid URL format');
      return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Security: Check if domain is trusted
    const isTrusted = TRUSTED_DOMAINS.some(domain => 
      urlObj.hostname.includes(domain) || urlObj.hostname.endsWith(domain)
    );
    
    if (!isTrusted) {
      console.error(`[DownloadProxy] Untrusted domain: ${urlObj.hostname}`);
      return new Response(JSON.stringify({ 
        error: 'Untrusted URL domain',
        hostname: urlObj.hostname 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[DownloadProxy] Domain trusted: ${urlObj.hostname}`);
    console.log(`[DownloadProxy] Fetching image server-side...`);

    // Fetch image server-side (bypasses CORS)
    const response = await fetch(imageUrl, {
      headers: {
        'Accept': 'image/*,*/*',
        'User-Agent': 'Mozilla/5.0 (compatible; DownloadProxy/1.0)',
      },
    });
    
    if (!response.ok) {
      console.error(`[DownloadProxy] Fetch failed: ${response.status} ${response.statusText}`);
      return new Response(JSON.stringify({ 
        error: `Failed to fetch image: ${response.status}`,
        statusText: response.statusText
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get content type and size
    const contentType = response.headers.get('content-type') || 'image/png';
    const contentLength = response.headers.get('content-length');
    
    console.log(`[DownloadProxy] Fetch success - Type: ${contentType}, Size: ${contentLength || 'unknown'}`);

    // Stream the response directly (more memory efficient)
    const body = response.body;
    
    if (!body) {
      // Fallback to blob if no body stream
      const blob = await response.blob();
      console.log(`[DownloadProxy] Using blob fallback, size: ${blob.size}`);
      
      return new Response(blob, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
          'Content-Length': blob.size.toString(),
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Return streamed response with download headers
    const headers: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Cache-Control': 'public, max-age=3600',
    };

    if (contentLength) {
      headers['Content-Length'] = contentLength;
    }

    console.log(`[DownloadProxy] Streaming response with attachment header`);

    return new Response(body, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('[DownloadProxy] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
