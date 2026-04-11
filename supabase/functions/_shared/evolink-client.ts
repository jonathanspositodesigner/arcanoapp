/**
 * EVOLINK API CLIENT - MÓDULO CENTRALIZADO
 * 
 * Todas as chamadas à API Evolink passam por aqui:
 * - Geração de vídeo (Veo 3.1 Fast, Veo 3.1 Pro, Seedance 2.0, etc.)
 * - Polling de status de tasks
 * - Retry resiliente com backoff
 * - Tratamento de erros padronizado
 */

// ==================== TYPES ====================

export interface EvolinkGenerateParams {
  model: string;           // Nome interno do modelo na Evolink (ex: 'veo-3.1-fast-generate-preview')
  prompt: string;
  duration?: number;       // Default: 8
  quality?: string;        // Default: '1080p'
  aspectRatio?: string;    // Default: '16:9'
  generateAudio?: boolean; // Default: false
  generationType?: string; // 'TEXT' | 'FIRST&LAST' | 'REFERENCE'
  imageUrls?: string[];
  videoUrls?: string[];
  audioUrls?: string[];
}

export interface EvolinkGenerateResult {
  success: true;
  taskId: string;
}

export interface EvolinkErrorResult {
  success: false;
  error: string;
}

export type EvolinkResult = EvolinkGenerateResult | EvolinkErrorResult;

export interface EvolinkPollResult {
  status: 'completed' | 'failed' | 'processing' | 'pending' | string;
  progress: number;
  outputUrl?: string;
  error?: string;
  rawData?: Record<string, unknown>;
}

// ==================== MODEL REGISTRY ====================

/**
 * Mapeamento de nomes internos do app → modelo real na API Evolink
 * Centralizado aqui para garantir consistência em todas as edge functions.
 */
export const EVOLINK_MODELS: Record<string, string> = {
  // Veo 3.1 (usado por generate-video e movieled-maker)
  'veo3.1-fast': 'veo-3.1-fast-generate-preview',
  'veo3.1-pro': 'veo-3.1-generate-preview',
  // Seedance 2.0 (usado pelo Cinema Studio)
  // O Cinema Studio passa o model name diretamente, então não precisa de mapeamento aqui
};

/**
 * Verifica se um model name do app corresponde a um modelo Evolink
 */
export function isEvolinkModel(model: string): boolean {
  return model in EVOLINK_MODELS;
}

/**
 * Resolve o nome do modelo para o nome da API Evolink.
 * Se o nome já for um nome de API válido (ex: 'seedance-2.0-r2v'), retorna como está.
 */
export function resolveEvolinkModel(model: string): string {
  return EVOLINK_MODELS[model] || model;
}

// ==================== RESILIENT FETCH ====================

const RETRYABLE_STATUSES = [429, 500, 502, 503, 504, 520, 521, 522, 523, 524, 525];
const RETRY_DELAYS = [3000, 6000, 12000, 20000];

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  label: string,
  maxRetries = 4
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);

      if (RETRYABLE_STATUSES.includes(response.status) && attempt < maxRetries - 1) {
        await response.text(); // consume body
        const delay = RETRY_DELAYS[attempt] + Math.random() * 2000;
        console.warn(`[EvolinkClient] ${label}: HTTP ${response.status}, retry ${attempt + 1}/${maxRetries} in ${Math.round(delay)}ms`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      return response;
    } catch (error: any) {
      if (attempt < maxRetries - 1) {
        const delay = RETRY_DELAYS[attempt] + Math.random() * 2000;
        console.warn(`[EvolinkClient] ${label}: ${error.message}, retry ${attempt + 1}/${maxRetries}`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error(`${label}: All retries exhausted`);
}

// ==================== CORE API FUNCTIONS ====================

const EVOLINK_BASE_URL = 'https://api.evolink.ai/v1';

/**
 * Gera um vídeo via API Evolink.
 * Aceita qualquer modelo suportado (Veo 3.1, Seedance 2.0, etc.)
 */
export async function evolinkGenerate(
  apiKey: string,
  params: EvolinkGenerateParams
): Promise<EvolinkResult> {
  if (!apiKey) {
    return { success: false, error: 'EVOLINK_API_KEY not configured' };
  }

  const payload: Record<string, unknown> = {
    model: params.model,
    prompt: params.prompt,
    duration: params.duration ?? 8,
    quality: params.quality ?? '1080p',
    aspect_ratio: params.aspectRatio ?? '16:9',
    generate_audio: params.generateAudio ?? false,
  };

  // generation_type (para Veo 3.1)
  if (params.generationType) {
    payload.generation_type = params.generationType;
  }

  // Media URLs
  if (params.imageUrls && params.imageUrls.length > 0) {
    payload.image_urls = params.imageUrls;
  }
  if (params.videoUrls && params.videoUrls.length > 0) {
    payload.video_urls = params.videoUrls;
  }
  if (params.audioUrls && params.audioUrls.length > 0) {
    payload.audio_urls = params.audioUrls;
  }

  console.log(`[EvolinkClient] Calling generate:`, JSON.stringify({
    model: params.model,
    duration: payload.duration,
    quality: payload.quality,
    aspectRatio: payload.aspect_ratio,
    generateAudio: payload.generate_audio,
    generationType: payload.generation_type,
    imageCount: params.imageUrls?.length || 0,
  }));

  try {
    const response = await fetchWithRetry(
      `${EVOLINK_BASE_URL}/videos/generations`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      'Evolink Generate'
    );

    const data = await response.json();
    console.log(`[EvolinkClient] Generate response:`, JSON.stringify(data));

    if (!response.ok || !data.id) {
      const errMsg = data.error?.message || data.error?.code || data.error || `Evolink API error: ${response.status}`;
      return { success: false, error: typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg) };
    }

    return { success: true, taskId: data.id };
  } catch (error: any) {
    return { success: false, error: error.message || 'Evolink API call failed' };
  }
}

/**
 * Consulta o status de uma task na API Evolink.
 */
export async function evolinkPoll(
  apiKey: string,
  taskId: string
): Promise<EvolinkPollResult> {
  if (!apiKey) {
    return { status: 'failed', progress: 0, error: 'EVOLINK_API_KEY not configured' };
  }

  try {
    const response = await fetchWithRetry(
      `${EVOLINK_BASE_URL}/tasks/${taskId}`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}` },
      },
      `Evolink Poll ${taskId}`,
      3
    );

    // CRITICAL FIX: Check response.ok before parsing
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[EvolinkClient] Poll ${taskId}: HTTP ${response.status} - ${errorText.slice(0, 200)}`);
      // Return 'failed' for auth/client errors, 'processing' only for retryable server errors
      if (response.status >= 400 && response.status < 500) {
        return {
          status: 'failed',
          progress: 0,
          error: `Evolink API error: HTTP ${response.status}`,
        };
      }
      // Server errors after retries exhausted - still report as error, not processing
      return {
        status: 'failed',
        progress: 0,
        error: `Evolink API server error: HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    console.log(`[EvolinkClient] Poll ${taskId}: status=${data.status}, progress=${data.progress}`);

    if (data.status === 'completed') {
      const outputUrl = data.results?.[0] || null;
      return {
        status: 'completed',
        progress: 100,
        outputUrl,
        rawData: data,
      };
    }

    if (data.status === 'failed') {
      const errMsg = data.error?.message || data.error || 'Generation failed';
      return {
        status: 'failed',
        progress: 0,
        error: typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg),
        rawData: data,
      };
    }

    // Still processing
    return {
      status: data.status || 'processing',
      progress: data.progress || 0,
      rawData: data,
    };
  } catch (error: any) {
    console.error(`[EvolinkClient] Poll error for ${taskId}:`, error);
    // CRITICAL FIX: Don't mask errors as 'processing' - report them properly
    return {
      status: 'failed',
      progress: 0,
      error: `Evolink poll failed: ${error.message}`,
    };
  }
}
