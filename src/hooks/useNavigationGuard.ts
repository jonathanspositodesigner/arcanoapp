/**
 * Hook para bloquear navegação quando há job de IA ativo
 * 
 * Funciona em duas camadas:
 * 1. Navegação interna (React Router) - intercepta via history
 * 2. Navegação externa (fechar aba, refresh) - usa beforeunload
 * 
 * Quando bloqueado, mostra modal de confirmação explicando que
 * os créditos serão perdidos se o usuário sair.
 * 
 * NOTA: Usamos UNSAFE_NavigationContext porque useBlocker só funciona
 * com Data Router (createBrowserRouter), não com BrowserRouter tradicional.
 */

import { useEffect, useCallback, useState, useContext } from 'react';
import { UNSAFE_NavigationContext as NavigationContext } from 'react-router-dom';
import { useAIJob } from '@/contexts/AIJobContext';

interface NavigationGuardResult {
  // Se está bloqueando navegação
  isBlocking: boolean;
  // Se o modal de confirmação deve ser mostrado
  showConfirmModal: boolean;
  // Confirmar saída (usuário aceita perder)
  confirmLeave: () => void;
  // Cancelar saída (usuário quer ficar)
  cancelLeave: () => void;
  // Nome da ferramenta ativa (para mensagem)
  activeToolName: string | null;
}

export function useNavigationGuard(): NavigationGuardResult {
  const { isJobActive, activeToolName, jobStatus } = useAIJob();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  
  // Acesso ao navigator do React Router
  const { navigator } = useContext(NavigationContext);
  
  // Determinar se deve bloquear (job ativo em status não-cancelável)
  // Não bloqueia para 'queued' pois esses têm reembolso automático
  const shouldBlock = isJobActive && 
    jobStatus !== null && 
    ['starting', 'running'].includes(jobStatus);
  
  // Interceptar navegação interna via history.push/replace
  useEffect(() => {
    if (!shouldBlock) return;
    
    // Salvar métodos originais
    const originalPush = navigator.push;
    const originalReplace = navigator.replace;
    
    // Sobrescrever push
    navigator.push = (...args: Parameters<typeof navigator.push>) => {
      setShowConfirmModal(true);
      setPendingNavigation(() => () => originalPush.apply(navigator, args));
    };
    
    // Sobrescrever replace
    navigator.replace = (...args: Parameters<typeof navigator.replace>) => {
      setShowConfirmModal(true);
      setPendingNavigation(() => () => originalReplace.apply(navigator, args));
    };
    
    return () => {
      // Restaurar métodos originais
      navigator.push = originalPush;
      navigator.replace = originalReplace;
    };
  }, [shouldBlock, navigator]);
  
  // Confirmar saída - prosseguir com navegação pendente
  const confirmLeave = useCallback(() => {
    setShowConfirmModal(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  }, [pendingNavigation]);
  
  // Cancelar saída - ficar na página
  const cancelLeave = useCallback(() => {
    setShowConfirmModal(false);
    setPendingNavigation(null);
  }, []);
  
  // Bloquear navegação externa (fechar aba, refresh, digitar URL)
  useEffect(() => {
    if (!shouldBlock) return;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Mensagem padrão do browser (não customizável nos browsers modernos)
      e.preventDefault();
      e.returnValue = 'Você tem um processamento de IA em andamento. Se sair, perderá os créditos.';
      return e.returnValue;
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [shouldBlock]);
  
  return {
    isBlocking: shouldBlock,
    showConfirmModal,
    confirmLeave,
    cancelLeave,
    activeToolName,
  };
}
