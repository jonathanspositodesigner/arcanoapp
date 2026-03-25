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

  // PIL/ComfyUI não consegue ler a imagem (formato incompatível)
  if (error.includes('unidentifiedimageerror') || error.includes('cannot identify image') || error.includes('pil')) {
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
  if (error.includes('no output') || error.includes('no result') || error.includes('empty result')) {
    return {
      message: 'Processamento não retornou resultado',
      solution: 'Aguarde 5 minutos e tente novamente.'
    };
  }
  
  // Fila cheia / limite de API (erro 421)
  if (error.includes('queue limit') || error.includes('queue full') || 
      error.includes('too many requests') || error.includes('rate limit') || 
      error.includes('429') || error.includes('421')) {
    return {
      message: 'Servidor ocupado no momento',
      solution: 'A fila de processamento está cheia. Aguarde 2-3 minutos e tente novamente.'
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
