/**
 * Normaliza mensagens de erro técnicas (RunningHub, Google, Evolink)
 * em mensagens amigáveis e consistentes para o usuário.
 *
 * Usado por TODOS os edge functions de IA para garantir que a mesma
 * condição de erro produza a mesma mensagem em qualquer ferramenta.
 */

export interface NormalizedError {
  /** Mensagem curta exibida ao usuário */
  message: string;
  /** Orientação de próxima ação */
  solution: string;
  /** Categoria interna para logging */
  category: 'server_busy' | 'content_safety' | 'infra_transient' | 'timeout' | 'upload' | 'format' | 'quota' | 'auth' | 'unknown';
}

const BUSY_PATTERNS = [
  'currently busy',
  'model is currently busy',
  '稍后重试',          // "please retry later" in Chinese
  '负载已饱和',         // "upstream saturated"
  'upstream',
  'queue limit',
  'queue full',
  'too many requests',
  'rate limit',
  'servidor ocupado',
];

const CONTENT_SAFETY_PATTERNS = [
  'content safety',
  'content policy',
  'image generation blocked',
  'safety filter',
  'nsfw',
];

const INFRA_TRANSIENT_PATTERNS = [
  'stale file handle',
  'errno 116',
  'errno 5',
  'oserror',
  'filenotfounderror',
  'no such file or directory',
  'input/output error',
  'broken pipe',
  'connection reset',
  'sslerror',
  'unexpected_eof_while_reading',
  '工作流运行失败',     // "workflow execution failed"
];

const TIMEOUT_PATTERNS = [
  'timeout',
  'timed out',
  'cancelled automatically',
  'deadline exceeded',
];

const UPLOAD_PATTERNS = [
  'image_transfer',
  'frame upload',
  'upload failed',
  'falha ao baixar',
];

const FORMAT_PATTERNS = [
  'unidentifiedimageerror',
  'cannot identify image',
  'pil',
  'invalid_argument',
];

const QUOTA_PATTERNS = [
  'resource_exhausted',
  'quota',
  'permission_denied',
];

function matchesAny(lower: string, patterns: string[]): boolean {
  return patterns.some(p => lower.includes(p));
}

/**
 * Normaliza uma mensagem de erro técnica em uma mensagem amigável.
 * Retorna a categoria + mensagem + solução padronizadas.
 */
export function normalizeAIError(rawError: string | null | undefined): NormalizedError {
  const lower = (rawError || '').toLowerCase();

  if (matchesAny(lower, BUSY_PATTERNS)) {
    return {
      message: 'Servidor ocupado no momento',
      solution: 'A fila de processamento está cheia. Seus créditos foram estornados automaticamente. Aguarde 2-3 minutos e tente novamente.',
      category: 'server_busy',
    };
  }

  if (matchesAny(lower, CONTENT_SAFETY_PATTERNS)) {
    return {
      message: 'Imagem bloqueada pelo filtro de segurança',
      solution: 'A IA considerou o conteúdo inapropriado. Seus créditos foram estornados automaticamente. Tente usar outra imagem ou prompt diferente.',
      category: 'content_safety',
    };
  }

  if (matchesAny(lower, INFRA_TRANSIENT_PATTERNS)) {
    return {
      message: 'Erro temporário no servidor de IA',
      solution: 'Houve uma falha temporária na infraestrutura. Seus créditos foram estornados. Tente novamente em alguns segundos.',
      category: 'infra_transient',
    };
  }

  if (matchesAny(lower, TIMEOUT_PATTERNS)) {
    return {
      message: 'Processamento demorou muito',
      solution: 'Seus créditos foram estornados. Tente novamente com uma imagem menor ou aguarde alguns minutos.',
      category: 'timeout',
    };
  }

  if (matchesAny(lower, UPLOAD_PATTERNS)) {
    return {
      message: 'Erro ao enviar imagem para o servidor',
      solution: 'Não foi possível enviar sua imagem. Tente com uma imagem menor (máx 5MB) ou em formato JPG/PNG.',
      category: 'upload',
    };
  }

  if (matchesAny(lower, FORMAT_PATTERNS)) {
    return {
      message: 'Formato de imagem incompatível',
      solution: 'Tente salvar a imagem como JPEG antes de enviar, ou use outra imagem.',
      category: 'format',
    };
  }

  if (matchesAny(lower, QUOTA_PATTERNS)) {
    return {
      message: 'Limite de uso da API atingido',
      solution: 'Aguarde alguns minutos e tente novamente.',
      category: 'quota',
    };
  }

  return {
    message: rawError || 'Erro no processamento',
    solution: 'Seus créditos foram estornados. Tente novamente ou use uma imagem diferente.',
    category: 'unknown',
  };
}