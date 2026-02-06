/**
 * Hook para bloquear navegação quando há job de IA ativo
 * 
 * Funciona em duas camadas:
 * 1. Navegação interna (React Router) - intercepta via history
 *    - push, replace, go, back, forward
 * 2. Navegação externa (fechar aba, refresh) - usa beforeunload
 * 
 * Quando bloqueado, mostra modal de confirmação explicando que
 * os créditos serão perdidos se o usuário sair.
 * 
 * NOTA: Usamos UNSAFE_NavigationContext porque useBlocker só funciona
 * com Data Router (createBrowserRouter), não com BrowserRouter tradicional.
 */

import { useEffect, useCallback, useState, useContext, useRef } from 'react';
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

// Status que indicam job ativo (bloqueia navegação)
const BLOCKING_STATUSES = ['pending', 'queued', 'starting', 'running'];

export function useNavigationGuard(): NavigationGuardResult {
  const { isJobActive, activeToolName, jobStatus } = useAIJob();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  
  // Acesso ao navigator do React Router
  const { navigator } = useContext(NavigationContext);
  
  // Refs para guardar métodos originais (evita recriação)
  const originalMethodsRef = useRef<{
    push: typeof navigator.push;
    replace: typeof navigator.replace;
    go: typeof navigator.go;
  } | null>(null);
  
  // Determinar se deve bloquear - qualquer status ativo
  const shouldBlock = isJobActive && 
    jobStatus !== null && 
    BLOCKING_STATUSES.includes(jobStatus);
  
  // Interceptar navegação interna via history (push, replace, go, back, forward)
  useEffect(() => {
    if (!shouldBlock) {
      // Restaurar métodos originais se existirem
      if (originalMethodsRef.current) {
        navigator.push = originalMethodsRef.current.push;
        navigator.replace = originalMethodsRef.current.replace;
        navigator.go = originalMethodsRef.current.go;
        originalMethodsRef.current = null;
      }
      return;
    }
    
    // Salvar métodos originais (só uma vez)
    if (!originalMethodsRef.current) {
      originalMethodsRef.current = {
        push: navigator.push,
        replace: navigator.replace,
        go: navigator.go,
      };
    }
    
    const originals = originalMethodsRef.current;
    
    // Sobrescrever push
    navigator.push = (...args: Parameters<typeof navigator.push>) => {
      setShowConfirmModal(true);
      setPendingNavigation(() => () => originals.push.apply(navigator, args));
    };
    
    // Sobrescrever replace
    navigator.replace = (...args: Parameters<typeof navigator.replace>) => {
      setShowConfirmModal(true);
      setPendingNavigation(() => () => originals.replace.apply(navigator, args));
    };
    
    // Sobrescrever go (captura navigate(-1), navigate(1), etc.)
    navigator.go = (delta: number) => {
      setShowConfirmModal(true);
      setPendingNavigation(() => () => originals.go.call(navigator, delta));
    };
    
    return () => {
      // Restaurar métodos originais no cleanup
      if (originalMethodsRef.current) {
        navigator.push = originalMethodsRef.current.push;
        navigator.replace = originalMethodsRef.current.replace;
        navigator.go = originalMethodsRef.current.go;
        originalMethodsRef.current = null;
      }
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
