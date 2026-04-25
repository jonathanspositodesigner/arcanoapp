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
import type { JobStatus, ToolType } from '@/ai/JobManager';
import { TABLE_MAP } from '@/ai/JobManager';
import { supabase } from '@/integrations/supabase/client';

interface AIJobContextType {
  // Estado do job ativo
  isJobActive: boolean;
  activeJobId: string | null;
  activeToolName: string | null;
  jobStatus: JobStatus | null;
  
  // Ações
  registerJob: (jobId: string, toolName: string, status: JobStatus, toolType?: ToolType) => void;
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

// Inferência automática de ToolType a partir do display name (ou de uma chave já válida).
// Garante que TODA ferramenta — atual ou futura — receba o polling de fallback,
// mesmo se a página chamar registerJob sem passar toolType explicitamente.
const NAME_TO_TOOLTYPE: Record<string, ToolType> = {
  // Display names usados pelas páginas
  'upscaler arcano': 'upscaler',
  'video upscaler': 'video_upscaler',
  'arcano cloner': 'arcano_cloner',
  'pose changer': 'pose_changer',
  'veste ai': 'veste_ai',
  'flyer maker': 'flyer_maker',
  'gerar imagem': 'image_generator',
  'remover fundo': 'bg_remover',
  'gerador avatar': 'character_generator',
  'gerador personagem': 'character_generator',
  'movieled maker': 'movieled_maker',
  'cinema studio': 'image_generator',
  // Chaves "canônicas" (ToolType direto) também aceitas
  'image_generator': 'image_generator',
  'video_generator': 'video_generator',
  'upscaler': 'upscaler',
  'video_upscaler': 'video_upscaler',
  'arcano_cloner': 'arcano_cloner',
  'pose_changer': 'pose_changer',
  'veste_ai': 'veste_ai',
  'flyer_maker': 'flyer_maker',
  'bg_remover': 'bg_remover',
  'character_generator': 'character_generator',
  'movieled_maker': 'movieled_maker',
};

const inferToolType = (toolName: string): ToolType | null => {
  const key = toolName.trim().toLowerCase();
  return NAME_TO_TOOLTYPE[key] ?? null;
};

export const AIJobProvider = ({ children }: AIJobProviderProps) => {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeToolName, setActiveToolName] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [activeToolType, setActiveToolType] = useState<ToolType | null>(null);
  
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
  const registerJob = useCallback((jobId: string, toolName: string, status: JobStatus, toolType?: ToolType) => {
    const resolvedType = toolType ?? inferToolType(toolName);
    console.log(`[AIJobContext] Registering job: ${jobId} (${toolName} → ${resolvedType ?? 'unknown'}) - ${status}`);
    setActiveJobId(jobId);
    setActiveToolName(toolName);
    setJobStatus(status);
    setActiveToolType(resolvedType);
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
    setActiveToolType(null);
    hasPlayedSoundRef.current = false;
  }, []);

  // Polling de fallback: se houver job ativo e conhecermos a tabela, fazer poll a cada 4s
  // Isso garante que mesmo se a página da ferramenta desmontar (perdendo subscription realtime),
  // o botão flutuante global ainda detecta a conclusão do job.
  useEffect(() => {
    if (!activeJobId || !jobStatus || !ACTIVE_STATUSES.includes(jobStatus)) return;
    if (!activeToolType || !TABLE_MAP[activeToolType]) return;

    const tableName = TABLE_MAP[activeToolType];
    let cancelled = false;

    const poll = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from(tableName)
          .select('status')
          .eq('id', activeJobId)
          .maybeSingle();
        if (cancelled || error || !data) return;
        if (data.status && data.status !== jobStatus) {
          console.log(`[AIJobContext] Polling detected status change: ${jobStatus} → ${data.status}`);
          updateJobStatus(data.status as JobStatus);
        }
      } catch (e) {
        // silencioso
      }
    };

    const id = setInterval(poll, 4000);
    // poll inicial rápido
    const t = setTimeout(poll, 1500);
    return () => {
      cancelled = true;
      clearInterval(id);
      clearTimeout(t);
    };
  }, [activeJobId, jobStatus, activeToolType, updateJobStatus]);

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
