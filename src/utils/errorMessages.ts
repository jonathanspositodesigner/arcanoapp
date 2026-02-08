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
  
  // Erros de conexão/rede
  if (error.includes('network') || error.includes('connection') || error.includes('fetch')) {
    return {
      message: 'Erro de conexão com o servidor',
      solution: 'Verifique sua conexão e tente novamente.'
    };
  }
  
  // Erros de API/autenticação
  if (error.includes('unauthorized') || error.includes('forbidden') || error.includes('401') || error.includes('403')) {
    return {
      message: 'Erro de autenticação no servidor',
      solution: 'Atualize a página e tente novamente.'
    };
  }
  
  // Erro genérico - mostra o erro original se existir
  return {
    message: errorMessage || 'Erro no processamento',
    solution: 'Tente novamente ou use uma imagem diferente.'
  };
}
