/**
 * Hook para bloquear navegação quando há job de IA ativo
 * 
 * Funciona em duas camadas:
 * 1. Navegação interna (React Router) - usa useBlocker
 * 2. Navegação externa (fechar aba, refresh) - usa beforeunload
 * 
 * Quando bloqueado, mostra modal de confirmação explicando que
 * os créditos serão perdidos se o usuário sair.
 */

import { useEffect, useCallback, useState } from 'react';
import { useBlocker } from 'react-router-dom';
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
  
  // Determinar se deve bloquear (job ativo em status não-cancelável)
  // Não bloqueia para 'queued' pois esses têm reembolso automático
  const shouldBlock = isJobActive && 
    jobStatus !== null && 
    ['starting', 'running'].includes(jobStatus);
  
  // Bloqueador do React Router para navegação interna
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => 
      shouldBlock && currentLocation.pathname !== nextLocation.pathname
  );
  
  // Quando o blocker ativar, mostrar modal
  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowConfirmModal(true);
    }
  }, [blocker.state]);
  
  // Confirmar saída - prosseguir com navegação
  const confirmLeave = useCallback(() => {
    setShowConfirmModal(false);
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  }, [blocker]);
  
  // Cancelar saída - ficar na página
  const cancelLeave = useCallback(() => {
    setShowConfirmModal(false);
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [blocker]);
  
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
