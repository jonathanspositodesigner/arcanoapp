/**
 * Traduz erros técnicos da RunningHub/ComfyUI em mensagens amigáveis para o usuário.
 * 
 * A RunningHub retorna erros em chinês ou inglês técnico que não fazem sentido
 * para o usuário final. Esta função mapeia esses erros para mensagens claras.
 */
export function getAIErrorMessage(errorMessage: string | null): {
  message: string;
  solution: string;
} {
  const error = errorMessage?.toLowerCase() || '';
  
  // Video generation provider rejection (Veo/Wan model errors)
  if (error.includes('video generation failed') || error.includes('generate_video')) {
    return {
      message: 'A IA não conseguiu gerar o vídeo',
      solution: 'Tente com um prompt diferente ou use outra imagem. Alguns conteúdos podem ser rejeitados pelo modelo. Seus créditos foram estornados.'
    };
  }

  // Upstream saturado (servidor de IA sobrecarregado)
  if (errorMessage?.includes('上游负载已饱和') || error.includes('upstream') || error.includes('负载')) {
    return {
      message: 'Servidor de geração temporariamente sobrecarregado',
      solution: 'A capacidade do servidor está esgotada no momento. Seus créditos foram estornados automaticamente. Tente novamente em alguns minutos.'
    };
  }

  // Erro chinês da RunningHub = "Workflow execution failed"
  if (errorMessage?.includes('工作流运行失败') || error.includes('workflow')) {
    return {
      message: 'Servidor temporariamente indisponível',
      solution: 'Aguarde 5 minutos e tente novamente. Se persistir, use uma imagem diferente.'
    };
  }

  // Content safety filter - IA bloqueou por conteúdo inapropriado
  if (error.includes('content safety') || error.includes('content policy') || error.includes('image generation blocked') || error.includes('safety filter') || error.includes('nsfw')) {
    return {
      message: 'Imagem bloqueada pelo filtro de segurança',
      solution: 'A IA considerou o conteúdo inapropriado. Seus créditos foram estornados automaticamente. Tente usar outra imagem ou prompt diferente.'
    };
  }

  // SSL/NanoBanana errors (RunningHub can't reach Google API)
  if (error.includes('sslerror') || error.includes('unexpected_eof_while_reading') || error.includes('nanobanana') || error.includes('nano_banana')) {
    return {
      message: 'Google NanoBanana temporariamente indisponível',
      solution: 'O servidor de IA está com instabilidade temporária. Seus créditos foram estornados. Tente novamente em alguns minutos.'
    };
  }

  // RunningHub infrastructure errors (server filesystem issues)
  if (error.includes('stale file handle') || error.includes('errno 116') || error.includes('errno 5') || 
      error.includes('oserror') || error.includes('filenotfounderror') || error.includes('input/output error')) {
    return {
      message: 'Erro temporário no servidor de IA',
      solution: 'Houve uma falha temporária na infraestrutura. Seus créditos foram estornados. Tente novamente em alguns segundos.'
    };
  }

  // Workflow validation error (error 433)
  if (error.includes('workflow validation') || error.includes('工作流校验失败') || error.includes('433')) {
    return {
      message: 'Erro de configuração do workflow',
      solution: 'Houve um problema interno na configuração. Seus créditos foram estornados. Tente novamente ou entre em contato com o suporte.'
    };
  }

  // Image transfer errors
  if (error.includes('image_transfer') || error.includes('frame upload') || error.includes('upload failed')) {
    return {
      message: 'Erro ao enviar imagem para o servidor',
      solution: 'Não foi possível enviar sua imagem. Tente com uma imagem menor (máx 5MB) ou em formato JPG/PNG.'
    };
  }

  // PIL/ComfyUI não consegue ler a imagem (formato incompatível)
  if (error.includes('unidentifiedimageerror') || error.includes('cannot identify image') || error.includes('pil') || error.includes('keep_this_dic')) {
    return {
      message: 'Formato de imagem incompatível',
      solution: 'Tente salvar a imagem como JPEG antes de enviar, ou use outra imagem.'
    };
  }
  
  // Erros de timeout
  if (error.includes('timeout') || error.includes('timed out') || error.includes('cancelled automatically')) {
    return {
      message: 'Processamento demorou muito',
      solution: 'Tente novamente com uma imagem menor ou aguarde alguns minutos.'
    };
  }
  
  // Erros de VRAM/memória
  if (error.includes('vram') || error.includes('memory') || error.includes('oom') || error.includes('out of memory')) {
    return {
      message: 'Imagem muito complexa',
      solution: 'Use uma imagem menor ou reduza a resolução de saída.'
    };
  }
  
  // Sem output (webhook sem resultado)
  if (error.includes('no output') || error.includes('no result') || error.includes('empty result') || error.includes('generation error')) {
    return {
      message: 'Processamento não retornou resultado',
      solution: 'Seus créditos foram estornados. Tente novamente com outro prompt ou imagem.'
    };
  }

  // Gemini 429 (legacy BYOK users)
  if (error.includes('gemini api error 429') || error.includes('gemini api error 503')) {
    return {
      message: 'API do Google temporariamente indisponível',
      solution: 'A API está com limite de uso. Aguarde 2-3 minutos e tente novamente.'
    };
  }
  
  // Fila cheia / limite de API (erro 421)
  if (error.includes('queue limit') || error.includes('queue full') || 
      error.includes('too many requests') || error.includes('rate limit') || 
      error.includes('429') || error.includes('421') ||
      error.includes('currently busy') || error.includes('model is currently busy') ||
      error.includes('servidor ocupado') || error.includes('稍后重试')) {
    return {
      message: 'Servidor ocupado no momento',
      solution: 'A fila de processamento está cheia. Seus créditos foram estornados automaticamente. Aguarde 2-3 minutos e tente novamente.'
    };
  }
  
  // Erros de conexão/rede
  if (error.includes('network') || error.includes('connection') || error.includes('fetch')) {
    return {
      message: 'Erro de conexão com o servidor',
      solution: 'Verifique sua conexão e tente novamente.'
    };
  }
  
  // Erros de RLS / sessão expirada
  if (error.includes('row-level security') || error.includes('security policy') || error.includes('rls')) {
    return {
      message: 'Sua sessão expirou',
      solution: 'Faça login novamente para continuar usando a ferramenta.'
    };
  }
  
  // Erros de API/autenticação
  if (error.includes('unauthorized') || error.includes('forbidden') || error.includes('401') || error.includes('403') || error.includes('sessão expirou')) {
    return {
      message: 'Sua sessão expirou',
      solution: 'Atualize a página e faça login novamente.'
    };
  }
  
  // Erro genérico - mostra o erro original se existir
  return {
    message: errorMessage || 'Erro no processamento',
    solution: 'Tente novamente ou use uma imagem diferente.'
  };
}
