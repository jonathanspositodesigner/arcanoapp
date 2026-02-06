/**
 * AI Job Context - Sistema Global de Monitoramento de Jobs de IA
 * 
 * Responsabilidades:
 * - Monitorar estado de jobs ativos em qualquer ferramenta de IA
 * - Tocar som de notificação quando job completar (sucesso ou falha)
 * - Expor estado global para outros componentes (trava de navegação)
 * 
 * IMPORTANTE: Este contexto funciona automaticamente para todas as ferramentas
 * que usam o JobManager e registram suas tabelas no TABLE_MAP.
 */

import React, { createContext, useContext, useState, useCallback, useRef, ReactNode, useEffect } from 'react';
import type { JobStatus } from '@/ai/JobManager';

interface AIJobContextType {
  // Estado do job ativo
  isJobActive: boolean;
  activeJobId: string | null;
  activeToolName: string | null;
  jobStatus: JobStatus | null;
  
  // Ações
  registerJob: (jobId: string, toolName: string, status: JobStatus) => void;
  updateJobStatus: (status: JobStatus) => void;
  clearJob: () => void;
  
  // Som
  playNotificationSound: () => void;
}

const AIJobContext = createContext<AIJobContextType | undefined>(undefined);

export const useAIJob = () => {
  const context = useContext(AIJobContext);
  if (context === undefined) {
    throw new Error('useAIJob must be used within an AIJobProvider');
  }
  return context;
};

interface AIJobProviderProps {
  children: ReactNode;
}

// Status que indicam que o job está "em andamento" (não pode sair)
const ACTIVE_STATUSES: JobStatus[] = ['pending', 'queued', 'starting', 'running'];

// Status terminais que disparam notificação
const TERMINAL_STATUSES: JobStatus[] = ['completed', 'failed', 'cancelled'];

export const AIJobProvider = ({ children }: AIJobProviderProps) => {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeToolName, setActiveToolName] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  
  // Ref para evitar tocar som múltiplas vezes
  const hasPlayedSoundRef = useRef(false);
  // Ref para o Audio object (pré-carregado)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Pré-carregar o som ao montar o componente
  useEffect(() => {
    audioRef.current = new Audio('/sounds/notification.mp3');
    audioRef.current.volume = 0.6;
    // Pré-carregar
    audioRef.current.load();
    
    return () => {
      audioRef.current = null;
    };
  }, []);
  
  // Calcula se há job ativo baseado no status
  const isJobActive = jobStatus !== null && ACTIVE_STATUSES.includes(jobStatus);
  
  // Tocar som de notificação
  const playNotificationSound = useCallback(() => {
    if (hasPlayedSoundRef.current) return;
    
    try {
      // Usar o audio pré-carregado ou criar novo
      const audio = audioRef.current || new Audio('/sounds/notification.mp3');
      audio.volume = 0.6;
      audio.currentTime = 0; // Reset para tocar do início
      
      audio.play().catch(err => {
        // Silencioso se browser bloquear autoplay
        console.log('[AIJobContext] Sound blocked by browser:', err.message);
      });
      
      hasPlayedSoundRef.current = true;
    } catch (error) {
      console.log('[AIJobContext] Failed to play sound:', error);
    }
  }, []);
  
  // Registrar um novo job ativo
  const registerJob = useCallback((jobId: string, toolName: string, status: JobStatus) => {
    console.log(`[AIJobContext] Registering job: ${jobId} (${toolName}) - ${status}`);
    setActiveJobId(jobId);
    setActiveToolName(toolName);
    setJobStatus(status);
    hasPlayedSoundRef.current = false; // Reset flag para novo job
  }, []);
  
  // Atualizar status do job e tocar som se terminal
  const updateJobStatus = useCallback((status: JobStatus) => {
    console.log(`[AIJobContext] Status update: ${status}`);
    setJobStatus(status);
    
    // Se chegou em status terminal, tocar som
    if (TERMINAL_STATUSES.includes(status)) {
      playNotificationSound();
    }
  }, [playNotificationSound]);
  
  // Limpar job (quando usuário fecha modal ou processa outro)
  const clearJob = useCallback(() => {
    console.log('[AIJobContext] Clearing active job');
    setActiveJobId(null);
    setActiveToolName(null);
    setJobStatus(null);
    hasPlayedSoundRef.current = false;
  }, []);
  
  return (
    <AIJobContext.Provider value={{
      isJobActive,
      activeJobId,
      activeToolName,
      jobStatus,
      registerJob,
      updateJobStatus,
      clearJob,
      playNotificationSound,
    }}>
      {children}
    </AIJobContext.Provider>
  );
};
