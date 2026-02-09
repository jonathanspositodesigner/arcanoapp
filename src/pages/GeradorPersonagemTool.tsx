import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Download, RotateCcw, Loader2, ZoomIn, ZoomOut, ImageIcon, XCircle, AlertTriangle, Coins, RefreshCw, Save } from 'lucide-react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useSmartBackNavigation } from '@/hooks/useSmartBackNavigation';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useUpscalerCredits } from '@/hooks/useUpscalerCredits';
import { useQueueSessionCleanup } from '@/hooks/useQueueSessionCleanup';
import { useProcessingButton } from '@/hooks/useProcessingButton';
import { useAIJob } from '@/contexts/AIJobContext';
import { supabase } from '@/integrations/supabase/client';
import ToolsHeader from '@/components/ToolsHeader';
import AngleUploadCard from '@/components/character-generator/AngleUploadCard';
import SaveCharacterDialog from '@/components/character-generator/SaveCharacterDialog';
import SavedCharactersPanel from '@/components/character-generator/SavedCharactersPanel';
import NoCreditsModal from '@/components/upscaler/NoCreditsModal';
import ActiveJobBlockModal from '@/components/ai-tools/ActiveJobBlockModal';
import { DownloadProgressOverlay, NotificationPromptToast } from '@/components/ai-tools';
import { optimizeForAI } from '@/hooks/useImageOptimizer';
import { cancelJob as centralCancelJob, checkActiveJob } from '@/ai/JobManager';
import { useResilientDownload } from '@/hooks/useResilientDownload';
import { useJobStatusSync } from '@/hooks/useJobStatusSync';
import { useNotificationTokenRecovery } from '@/hooks/useNotificationTokenRecovery';
import { useJobPendingWatchdog } from '@/hooks/useJobPendingWatchdog';
import { getAIErrorMessage } from '@/utils/errorMessages';

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'waiting' | 'completed' | 'error';

const CREDIT_COST = 100;

const queueMessages = [
  { emoji: '🎨', text: 'Criando seu personagem...' },
  { emoji: '✨', text: 'Analisando suas fotos...' },
  { emoji: '🚀', text: 'Quase lá, continue esperando!' },
  { emoji: '🌟', text: 'Gerando personagem único...' },
];

const GeradorPersonagemTool: React.FC = () => {
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramentas-ia-aplicativo' });
  const { user } = usePremiumStatus();
  const { balance: credits, isLoading: creditsLoading, refetch: refetchCredits } = useUpscalerCredits(user?.id);
  const { registerJob, updateJobStatus, clearJob: clearGlobalJob, playNotificationSound } = useAIJob();

  // 4 image states
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [semiProfileImage, setSemiProfileImage] = useState<string | null>(null);
  const [semiProfileFile, setSemiProfileFile] = useState<File | null>(null);
  const [lowAngleImage, setLowAngleImage] = useState<string | null>(null);
  const [lowAngleFile, setLowAngleFile] = useState<File | null>(null);

  const [outputImage, setOutputImage] = useState<string | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [jobId, setJobId] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [queueMessageIndex, setQueueMessageIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [debugErrorMessage, setDebugErrorMessage] = useState<string | null>(null);
  
  // Save character
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savedRefreshTrigger, setSavedRefreshTrigger] = useState(0);

  const sessionIdRef = useRef<string>('');
  const { isSubmitting, startSubmit, endSubmit } = useProcessingButton();
  const { isDownloading, progress: downloadProgress, download, cancel: cancelDownload } = useResilientDownload();
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  const [isReconciling, setIsReconciling] = useState(false);
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  const [showReconcileButton, setShowReconcileButton] = useState(false);

  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [noCreditsReason, setNoCreditsReason] = useState<'not_logged' | 'insufficient'>('insufficient');
  const [showActiveJobModal, setShowActiveJobModal] = useState(false);
  const [activeToolName, setActiveToolName] = useState<string>('');
  const [activeJobId, setActiveJobId] = useState<string | undefined>();
  const [activeStatus, setActiveStatus] = useState<string | undefined>();

  const allImagesReady = frontImage && profileImage && semiProfileImage && lowAngleImage;
  const canProcess = allImagesReady && status === 'idle';
  const isProcessing = status === 'uploading' || status === 'processing' || status === 'waiting';

  useEffect(() => { sessionIdRef.current = crypto.randomUUID(); }, []);
  useQueueSessionCleanup(sessionIdRef.current, status);

  useJobStatusSync({
    jobId,
    toolType: 'character_generator',
    enabled: status === 'processing' || status === 'waiting' || status === 'uploading',
    onStatusChange: useCallback((update) => {
      if (update.status === 'completed' && update.outputUrl) {
        setOutputImage(update.outputUrl);
        setStatus('completed');
        setProgress(100);
        endSubmit();
        playNotificationSound();
        refetchCredits();
        toast.success('Personagem gerado com sucesso!');
      } else if (update.status === 'failed' || update.status === 'cancelled') {
        setStatus('error');
        const friendlyError = getAIErrorMessage(update.errorMessage);
        setDebugErrorMessage(update.errorMessage);
        endSubmit();
        refetchCredits();
        toast.error(friendlyError.message);
      } else if (update.status === 'queued') {
        setStatus('waiting');
        setQueuePosition(update.position || 0);
      } else if (update.status === 'running' || update.status === 'starting') {
        setStatus('processing');
        setQueuePosition(0);
      }
    }, [endSubmit, playNotificationSound, refetchCredits]),
    onGlobalStatusChange: updateJobStatus,
  });

  useNotificationTokenRecovery({
    userId: user?.id,
    toolTable: 'character_generator_jobs' as any,
    onRecovery: useCallback((result) => {
      if (result.outputUrl) {
        setOutputImage(result.outputUrl);
        setStatus('completed');
        setProgress(100);
        toast.success('Resultado recuperado!');
      }
    }, []),
  });

  useJobPendingWatchdog({
    jobId,
    toolType: 'character_generator',
    enabled: status !== 'idle' && status !== 'completed' && status !== 'error',
    onJobFailed: useCallback((errorMessage) => {
      setStatus('error');
      setDebugErrorMessage(errorMessage);
      endSubmit();
      toast.error(errorMessage);
    }, [endSubmit]),
  });

  useEffect(() => { if (jobId) registerJob(jobId, 'Gerador Personagem', 'pending'); }, [jobId, registerJob]);

  useEffect(() => {
    if (isProcessing && !processingStartTime) { setProcessingStartTime(Date.now()); setShowReconcileButton(false); }
    else if (!isProcessing) { setProcessingStartTime(null); setShowReconcileButton(false); }
  }, [isProcessing, processingStartTime]);

  useEffect(() => {
    if (!isProcessing || !processingStartTime) return;
    const timer = setTimeout(() => setShowReconcileButton(true), 60000);
    return () => clearTimeout(timer);
  }, [isProcessing, processingStartTime]);

  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => setQueueMessageIndex(prev => (prev + 1) % queueMessages.length), 3000);
    return () => clearInterval(interval);
  }, [isProcessing]);

  useEffect(() => {
    if (status !== 'processing') return;
    const interval = setInterval(() => setProgress(prev => prev >= 95 ? prev : prev + Math.random() * 3), 1500);
    return () => clearInterval(interval);
  }, [status]);

  const uploadToStorage = async (file: File | Blob, prefix: string): Promise<string> => {
    if (!user?.id) throw new Error('User not authenticated');
    const timestamp = Date.now();
    const fileName = `${prefix}-${timestamp}.webp`;
    const filePath = `character-generator/${user.id}/${fileName}`;
    const { error } = await supabase.storage.from('artes-cloudinary').upload(filePath, file, { contentType: 'image/webp', upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('artes-cloudinary').getPublicUrl(filePath);
    return urlData.publicUrl;
  };

  const handleProcess = async () => {
    if (!startSubmit()) return;

    if (!allImagesReady || !frontFile || !profileFile || !semiProfileFile || !lowAngleFile) {
      toast.error('Por favor, envie todas as 4 fotos');
      endSubmit();
      return;
    }

    if (!user?.id) {
      setNoCreditsReason('not_logged');
      setShowNoCreditsModal(true);
      endSubmit();
      return;
    }

    const activeCheck = await checkActiveJob(user.id);
    if (activeCheck.hasActiveJob && activeCheck.activeTool) {
      setActiveToolName(activeCheck.activeTool);
      setActiveJobId(activeCheck.activeJobId);
      setActiveStatus(activeCheck.activeStatus);
      setShowActiveJobModal(true);
      endSubmit();
      return;
    }

    if (credits < CREDIT_COST) {
      setNoCreditsReason('insufficient');
      setShowNoCreditsModal(true);
      endSubmit();
      return;
    }

    setStatus('uploading');
    setProgress(0);
    setOutputImage(null);
    setDebugErrorMessage(null);

    try {
      // Compress & upload 4 images
      setProgress(5);
      setCurrentStep('compressing_images');

      const [compFront, compProfile, compSemi, compLow] = await Promise.all([
        optimizeForAI(frontFile), optimizeForAI(profileFile), optimizeForAI(semiProfileFile), optimizeForAI(lowAngleFile),
      ]);

      setProgress(20);
      setCurrentStep('uploading_images');

      const [frontUrl, profileUrl, semiProfileUrl, lowAngleUrl] = await Promise.all([
        uploadToStorage(compFront.file, 'front'),
        uploadToStorage(compProfile.file, 'profile'),
        uploadToStorage(compSemi.file, 'semi-profile'),
        uploadToStorage(compLow.file, 'low-angle'),
      ]);

      setProgress(45);
      setCurrentStep('creating_job');

      const { data: job, error: jobError } = await supabase
        .from('character_generator_jobs' as any)
        .insert({
          session_id: sessionIdRef.current,
          user_id: user.id,
          status: 'pending',
          front_image_url: frontUrl,
          profile_image_url: profileUrl,
          semi_profile_image_url: semiProfileUrl,
          low_angle_image_url: lowAngleUrl,
        })
        .select()
        .single();

      if (jobError || !job) throw new Error(jobError?.message || 'Falha ao criar job');

      const jobRecord = job as any;
      setJobId(jobRecord.id);
      registerJob(jobRecord.id, 'Gerador Personagem', 'pending');

      setProgress(55);
      setCurrentStep('starting_processing');
      setStatus('processing');

      const { data: runResult, error: runError } = await supabase.functions.invoke(
        'runninghub-character-generator/run',
        {
          body: {
            jobId: jobRecord.id,
            frontImageUrl: frontUrl,
            profileImageUrl: profileUrl,
            semiProfileImageUrl: semiProfileUrl,
            lowAngleImageUrl: lowAngleUrl,
            userId: user.id,
            creditCost: CREDIT_COST,
          },
        }
      );

      if (runError) throw new Error(runError.message || 'Erro ao iniciar processamento');

      if (runResult.code === 'INSUFFICIENT_CREDITS') {
        setStatus('idle');
        setNoCreditsReason('insufficient');
        setShowNoCreditsModal(true);
        endSubmit();
        return;
      }

      if (runResult.code === 'RATE_LIMIT_EXCEEDED') {
        toast.error('Muitas requisições. Aguarde 1 minuto.');
        setStatus('error');
        endSubmit();
        return;
      }

      if (runResult.error && !runResult.success && !runResult.queued) throw new Error(runResult.error);

      if (runResult.queued) {
        setStatus('waiting');
        setQueuePosition(runResult.position || 1);
        toast.info(`Você está na fila (posição ${runResult.position})`);
      } else {
        setStatus('processing');
        setProgress(65);
      }
    } catch (error: any) {
      setStatus('error');
      setDebugErrorMessage(error.message);
      toast.error(error.message || 'Erro ao processar');
      endSubmit();
    }
  };

  const handleCancelQueue = async () => {
    if (!jobId) return;
    try {
      const result = await centralCancelJob('character_generator', jobId);
      if (result.success) {
        setStatus('idle');
        setJobId(null);
        setQueuePosition(0);
        endSubmit();
        if (result.refundedAmount > 0) toast.success(`Cancelado! ${result.refundedAmount} créditos devolvidos.`);
        else toast.info('Processamento cancelado');
        refetchCredits();
      } else {
        toast.error(result.errorMessage || 'Erro ao cancelar');
      }
    } catch (error) {
      toast.error('Erro ao cancelar processamento');
    }
  };

  const handleReset = () => {
    endSubmit();
    setFrontImage(null); setFrontFile(null);
    setProfileImage(null); setProfileFile(null);
    setSemiProfileImage(null); setSemiProfileFile(null);
    setLowAngleImage(null); setLowAngleFile(null);
    setOutputImage(null);
    setStatus('idle');
    setProgress(0);
    setZoomLevel(1);
    setJobId(null);
    setQueuePosition(0);
    setCurrentStep(null);
    setDebugErrorMessage(null);
    clearGlobalJob();
  };

  const handleDownload = useCallback(async () => {
    if (!outputImage) return;
    await download({
      url: outputImage,
      filename: `personagem-${Date.now()}.png`,
      mediaType: 'image',
      timeout: 10000,
      onSuccess: () => toast.success('Download concluído!'),
      locale: 'pt'
    });
  }, [outputImage, download]);

  const currentQueueMessage = queueMessages[queueMessageIndex];

  const handleImageChange = (setter: React.Dispatch<React.SetStateAction<string | null>>, fileSetter: React.Dispatch<React.SetStateAction<File | null>>) => {
    return (dataUrl: string | null, file?: File) => {
      setter(dataUrl);
      fileSetter(file || null);
    };
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-[#0D0221] via-[#1A0A2E] to-[#16082A] flex flex-col">
      <ToolsHeader title="Gerador de Personagem" onBack={goBack} />

      {isProcessing && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-amber-200">Não feche esta página durante o processamento</span>
        </div>
      )}

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-2 overflow-y-auto lg:overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-2 lg:gap-3 lg:h-full">
          
          {/* Left Side - Inputs */}
          <div className="lg:col-span-2 flex flex-col gap-2 pb-2 lg:pb-0 lg:overflow-y-auto">
            {/* Instructions */}
            <div className="bg-purple-900/30 border border-purple-500/20 rounded-lg p-3 mb-1">
              <p className="text-xs text-purple-100 font-medium mb-0.5">📸 Envie 4 fotos do mesmo rosto</p>
              <p className="text-[10px] text-purple-300/80 leading-relaxed">Cada ângulo diferente ajuda a IA a criar seu personagem com alta fidelidade, pronto para usar em todos os nossos aplicativos!</p>
            </div>

            {/* 4 Upload Cards in 2x2 grid */}
            <div className="grid grid-cols-2 gap-2">
              <AngleUploadCard label="De Frente" angleType="front" image={frontImage} onImageChange={handleImageChange(setFrontImage, setFrontFile)} disabled={isProcessing} />
              <AngleUploadCard label="Perfil" angleType="profile" image={profileImage} onImageChange={handleImageChange(setProfileImage, setProfileFile)} disabled={isProcessing} />
              <AngleUploadCard label="Semi Perfil" angleType="semi_profile" image={semiProfileImage} onImageChange={handleImageChange(setSemiProfileImage, setSemiProfileFile)} disabled={isProcessing} />
              <AngleUploadCard label="Debaixo p/ Cima" angleType="low_angle" image={lowAngleImage} onImageChange={handleImageChange(setLowAngleImage, setLowAngleFile)} disabled={isProcessing} />
            </div>

            {/* Action Button */}
            <Button
              size="sm"
              className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-medium py-2 text-xs disabled:opacity-50"
              disabled={!canProcess || isProcessing || isSubmitting}
              onClick={handleProcess}
            >
              {isSubmitting ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Iniciando...</>
              ) : status === 'uploading' ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Enviando...</>
              ) : status === 'waiting' ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Fila #{queuePosition}</>
              ) : status === 'processing' ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{Math.round(progress)}%</>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Gerar Personagem
                  <span className="ml-2 flex items-center gap-1 text-xs opacity-90">
                    <Coins className="w-3.5 h-3.5" />{CREDIT_COST}
                  </span>
                </>
              )}
            </Button>

            {status === 'waiting' && (
              <Button variant="outline" size="sm" className="w-full text-xs border-red-500/30 text-red-300 hover:bg-red-500/10" onClick={handleCancelQueue}>
                <XCircle className="w-3.5 h-3.5 mr-1.5" />Sair da Fila
              </Button>
            )}

            {isProcessing && showReconcileButton && jobId && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                disabled={isReconciling}
                onClick={async () => {
                  setIsReconciling(true);
                  try {
                    const { data, error } = await supabase.functions.invoke('runninghub-character-generator/reconcile', { body: { jobId } });
                    if (error) throw error;
                    if (data?.reconciled && data?.status === 'completed') toast.success('Status atualizado! Personagem pronto.');
                    else if (data?.reconciled && data?.status === 'failed') toast.error('O processamento falhou.');
                    else if (data?.alreadyFinalized) toast.info('Job já finalizado, aguarde a atualização.');
                    else toast.info('Ainda processando. Tente novamente em alguns segundos.');
                  } catch (err) {
                    toast.error('Erro ao atualizar status');
                  } finally {
                    setIsReconciling(false);
                  }
                }}
              >
                {isReconciling ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                Atualizar status
              </Button>
            )}

            {/* Saved Characters Panel */}
            <SavedCharactersPanel userId={user?.id} refreshTrigger={savedRefreshTrigger} />
          </div>

          {/* Right Side - Result Viewer */}
          <div className="lg:col-span-5 flex flex-col min-h-[280px] lg:min-h-0">
            <Card className="relative overflow-hidden bg-purple-900/20 border-purple-500/30 flex-1 flex flex-col min-h-[250px] lg:min-h-0">
              <div className="px-3 py-2 border-b border-purple-500/20 flex items-center justify-between flex-shrink-0">
                <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-fuchsia-400" />Resultado
                </h3>
                {outputImage && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-purple-300 hover:text-white hover:bg-purple-500/20" onClick={() => transformRef.current?.zoomOut(0.5)}>
                      <ZoomOut className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-[10px] text-purple-300 w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-purple-300 hover:text-white hover:bg-purple-500/20" onClick={() => transformRef.current?.zoomIn(0.5)}>
                      <ZoomIn className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="relative flex-1 min-h-0 flex items-center justify-center">
                {outputImage ? (
                  <TransformWrapper ref={transformRef} key={outputImage} initialScale={1} minScale={0.5} maxScale={4} wheel={{ step: 0.4 }} onTransformed={(_, state) => setZoomLevel(state.scale)}>
                    <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={outputImage} alt="Resultado" className="w-full h-full object-contain" draggable={false} />
                    </TransformComponent>
                  </TransformWrapper>
                ) : isProcessing ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full border-4 border-fuchsia-500/30 border-t-fuchsia-500 animate-spin" />
                      <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-fuchsia-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-white font-medium flex items-center gap-2">
                        <span>{currentQueueMessage.emoji}</span>
                        <span>{currentQueueMessage.text}</span>
                      </p>
                      {status === 'waiting' && queuePosition > 0 && <p className="text-xs text-purple-300 mt-1">Posição na fila: #{queuePosition}</p>}
                      {status === 'processing' && <p className="text-xs text-purple-300 mt-0.5">{Math.round(progress)}% concluído</p>}
                    </div>
                    <div className="w-36 h-1.5 bg-purple-900/50 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                ) : status === 'error' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-red-500/10 border-2 border-dashed border-red-500/30 flex items-center justify-center">
                      <XCircle className="w-8 h-8 text-red-500/60" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-red-300">Erro no processamento</p>
                      <Button variant="link" size="sm" className="text-xs text-purple-400" onClick={handleReset}>Tentar novamente</Button>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-fuchsia-500/10 border-2 border-dashed border-fuchsia-500/30 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-fuchsia-500/40" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-purple-300">O resultado aparecerá aqui</p>
                      <p className="text-xs text-purple-400 mt-0.5">Envie as 4 fotos e clique em "Gerar Personagem"</p>
                    </div>
                  </div>
                )}
              </div>

              {outputImage && status === 'completed' && (
                <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-xs bg-purple-600/80 border-purple-400/50 text-white hover:bg-purple-500/90" onClick={handleReset}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />Nova
                  </Button>
                  <Button size="sm" className="flex-1 h-8 text-xs bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white" onClick={() => setShowSaveDialog(true)}>
                    <Save className="w-3.5 h-3.5 mr-1.5" />Salvar
                  </Button>
                  <Button size="sm" className="flex-1 h-8 text-xs bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white" onClick={handleDownload}>
                    <Download className="w-3.5 h-3.5 mr-1.5" />Baixar HD
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Save Character Dialog */}
      {outputImage && user?.id && (
        <SaveCharacterDialog
          isOpen={showSaveDialog}
          onClose={() => setShowSaveDialog(false)}
          imageUrl={outputImage}
          jobId={jobId}
          userId={user.id}
          onSaved={() => setSavedRefreshTrigger(prev => prev + 1)}
        />
      )}

      <NoCreditsModal isOpen={showNoCreditsModal} onClose={() => setShowNoCreditsModal(false)} reason={noCreditsReason} />
      <ActiveJobBlockModal isOpen={showActiveJobModal} onClose={() => setShowActiveJobModal(false)} activeTool={activeToolName} activeJobId={activeJobId} activeStatus={activeStatus} onCancelJob={centralCancelJob} />
      <DownloadProgressOverlay isVisible={isDownloading} progress={downloadProgress} onCancel={cancelDownload} mediaType="image" locale="pt" />
      <NotificationPromptToast toolName="character-generator" />
    </div>
  );
};

export default GeradorPersonagemTool;
