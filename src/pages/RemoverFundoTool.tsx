import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Download, RotateCcw, Loader2, ZoomIn, ZoomOut, ImageIcon, XCircle, AlertTriangle, Coins, Upload } from 'lucide-react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useSmartBackNavigation } from '@/hooks/useSmartBackNavigation';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useCredits } from '@/contexts/CreditsContext';
import { useQueueSessionCleanup } from '@/hooks/useQueueSessionCleanup';
import { useProcessingButton } from '@/hooks/useProcessingButton';
import { useAIJob } from '@/contexts/AIJobContext';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import NoCreditsModal from '@/components/upscaler/NoCreditsModal';
import ActiveJobBlockModal from '@/components/ai-tools/ActiveJobBlockModal';
import { JobDebugPanel, DownloadProgressOverlay, NotificationPromptToast, ImageCompressionModal } from '@/components/ai-tools';
import { optimizeForAI, getImageDimensions, MAX_AI_DIMENSION } from '@/hooks/useImageOptimizer';
import { cancelJob as centralCancelJob, checkActiveJob } from '@/ai/JobManager';
import { useResilientDownload } from '@/hooks/useResilientDownload';
import { useJobStatusSync } from '@/hooks/useJobStatusSync';
import { useNotificationTokenRecovery } from '@/hooks/useNotificationTokenRecovery';
import { useJobPendingWatchdog } from '@/hooks/useJobPendingWatchdog';
import { getAIErrorMessage } from '@/utils/errorMessages';
import { useAIToolSettings } from '@/hooks/useAIToolSettings';

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'waiting' | 'completed' | 'error';

const queueMessages = [
  { emoji: '🎨', text: 'Removendo o fundo...' },
  { emoji: '✨', text: 'Aguardando mágica IA...' },
  { emoji: '🚀', text: 'Quase lá!' },
  { emoji: '🌟', text: 'Processando sua imagem...' },
];

const RemoverFundoTool: React.FC = () => {
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramentas-ia-aplicativo' });
  const { user } = usePremiumStatus();
  const { balance: credits, isLoading: creditsLoading, refetch: refetchCredits, checkBalance } = useCredits();

  const { getCreditCost } = useAIToolSettings();
  const creditCost = getCreditCost('Remover Fundo', 5);

  const { registerJob, updateJobStatus, clearJob: clearGlobalJob, playNotificationSound } = useAIJob();

  // Image states
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [outputImage, setOutputImage] = useState<string | null>(null);

  // Compression modal
  const [showCompressionModal, setShowCompressionModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingWidth, setPendingWidth] = useState(0);
  const [pendingHeight, setPendingHeight] = useState(0);

  // Cached image dimensions from processFile
  const [imageDims, setImageDims] = useState<{ width: number; height: number } | null>(null);

  // UI states
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Queue states
  const [jobId, setJobId] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [queueMessageIndex, setQueueMessageIndex] = useState(0);

  // Debug
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [failedAtStep, setFailedAtStep] = useState<string | null>(null);
  const [debugErrorMessage, setDebugErrorMessage] = useState<string | null>(null);

  const sessionIdRef = useRef<string>('');
  const { isSubmitting, startSubmit, endSubmit } = useProcessingButton();
  const { isDownloading, progress: downloadProgress, download, cancel: cancelDownload } = useResilientDownload();
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [noCreditsReason, setNoCreditsReason] = useState<'not_logged' | 'insufficient'>('insufficient');
  const [showActiveJobModal, setShowActiveJobModal] = useState(false);
  const [activeToolName, setActiveToolName] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | undefined>();
  const [activeStatus, setActiveStatus] = useState<string | undefined>();

  const canProcess = inputImage && status === 'idle';
  const isProcessing = status === 'uploading' || status === 'processing' || status === 'waiting';

  useEffect(() => { sessionIdRef.current = crypto.randomUUID(); }, []);
  useQueueSessionCleanup(sessionIdRef.current, status);

  useJobStatusSync({
    jobId,
    toolType: 'bg_remover',
    enabled: status === 'processing' || status === 'waiting' || status === 'uploading',
    onStatusChange: (update) => {
      setCurrentStep(update.currentStep || update.status);
      if (update.errorMessage) setDebugErrorMessage(update.errorMessage);
      if (update.status === 'completed' && update.outputUrl) {
        setOutputImage(update.outputUrl);
        setStatus('completed');
        setProgress(100);
        refetchCredits();
        endSubmit();
        toast.success('Fundo removido com sucesso!');
      } else if (update.status === 'failed') {
        setStatus('error');
        const friendlyError = getAIErrorMessage(update.errorMessage);
        setDebugErrorMessage(update.errorMessage);
        endSubmit();
        toast.error(friendlyError.message);
      } else if (update.status === 'running') {
        setStatus('processing');
        setQueuePosition(0);
      } else if (update.status === 'queued') {
        setStatus('waiting');
        setQueuePosition(update.position || 0);
      }
    },
    onGlobalStatusChange: updateJobStatus,
  });

  useNotificationTokenRecovery({
    userId: user?.id,
    toolTable: 'bg_remover_jobs',
    onRecovery: useCallback((result) => {
      if (result.outputUrl) {
        setOutputImage(result.outputUrl);
        setJobId(result.jobId);
        setStatus('completed');
        setProgress(100);
        toast.success('Resultado carregado!');
      }
    }, []),
  });

  useJobPendingWatchdog({
    jobId,
    toolType: 'bg_remover',
    enabled: status !== 'idle' && status !== 'completed' && status !== 'error',
    onJobFailed: useCallback((errorMessage) => {
      setStatus('error');
      toast.error(errorMessage);
      endSubmit();
    }, [endSubmit]),
  });

  useEffect(() => { if (jobId) registerJob(jobId, 'Remover Fundo', 'pending'); }, [jobId, registerJob]);

  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => setQueueMessageIndex(prev => (prev + 1) % queueMessages.length), 3000);
    return () => clearInterval(interval);
  }, [isProcessing]);

  useEffect(() => {
    if (status !== 'processing') return;
    const interval = setInterval(() => setProgress(prev => prev >= 95 ? prev : prev + Math.random() * 5), 1000);
    return () => clearInterval(interval);
  }, [status]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFile = (file: File) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      URL.revokeObjectURL(url);
      if (w > MAX_AI_DIMENSION || h > MAX_AI_DIMENSION) {
        setPendingFile(file);
        setPendingWidth(w);
        setPendingHeight(h);
        setShowCompressionModal(true);
      } else {
        setImageDims({ width: w, height: h });
        const reader = new FileReader();
        reader.onload = (ev) => {
          setInputImage(ev.target?.result as string);
          setInputFile(file);
          setOutputImage(null);
          setStatus('idle');
        };
        reader.readAsDataURL(file);
      }
    };
    img.src = url;
  };

  const handleCompressed = async (compressedFile: File) => {
    // Update cached dims after compression
    try {
      const dims = await getImageDimensions(compressedFile);
      setImageDims({ width: dims.width, height: dims.height });
    } catch { /* dims will be recalculated if needed */ }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setInputImage(ev.target?.result as string);
      setInputFile(compressedFile);
      setOutputImage(null);
      setStatus('idle');
    };
    reader.readAsDataURL(compressedFile);
  };

  const compressImage = async (file: File): Promise<Blob> => {
    const result = await optimizeForAI(file);
    return result.file;
  };

  const uploadToStorage = async (file: File | Blob, prefix: string): Promise<string> => {
    if (!user?.id) throw new Error('User not authenticated');
    const timestamp = Date.now();
    const filePath = `bg-remover/${user.id}/${prefix}-${timestamp}.webp`;
    const { error } = await supabase.storage.from('artes-cloudinary').upload(filePath, file, { contentType: 'image/webp', upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('artes-cloudinary').getPublicUrl(filePath);
    return urlData.publicUrl;
  };

  const handleProcess = async () => {
    if (!startSubmit()) return;
    if (!inputImage || !inputFile) { toast.error('Selecione uma imagem'); endSubmit(); return; }
    if (!user?.id) { setNoCreditsReason('not_logged'); setShowNoCreditsModal(true); endSubmit(); return; }

    const activeCheck = await checkActiveJob(user.id);
    if (activeCheck.hasActiveJob && activeCheck.activeTool) {
      setActiveToolName(activeCheck.activeTool);
      setActiveJobId(activeCheck.activeJobId);
      setActiveStatus(activeCheck.activeStatus);
      setShowActiveJobModal(true);
      endSubmit();
      return;
    }

    const freshCredits = await checkBalance();
    if (freshCredits < creditCost) { setNoCreditsReason('insufficient'); setShowNoCreditsModal(true); endSubmit(); return; }

    setStatus('uploading');
    setProgress(0);
    setOutputImage(null);

    try {
      setProgress(15);
      // Use cached dimensions or fetch if not available
      const dims = imageDims || await getImageDimensions(inputFile);
      const needsCompression = dims.width > MAX_AI_DIMENSION || dims.height > MAX_AI_DIMENSION;
      const fileToUpload = needsCompression ? await compressImage(inputFile) : inputFile;

      // Convert to base64 and create job record in parallel
      const fileToBase64 = (f: File | Blob): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // strip data:...;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });

      const [imageBase64, jobInsertResult] = await Promise.all([
        fileToBase64(fileToUpload),
        supabase.from('bg_remover_jobs' as any)
          .insert({ session_id: sessionIdRef.current, user_id: user.id, status: 'pending', input_file_name: inputFile.name })
          .select().single(),
      ]);

      const { data: job, error: jobError } = jobInsertResult;
      if (jobError || !job) throw new Error('Failed to create job');
      const jobRecord = job as any;
      setJobId(jobRecord.id);

      setProgress(50);
      setStatus('processing');
      const { data: runResult, error: runError } = await supabase.functions.invoke('runninghub-bg-remover/run', {
        body: { jobId: jobRecord.id, imageBase64, fileName: inputFile.name, userId: user.id, creditCost },
      });

      if (runError) throw new Error(runError.message?.includes('non-2xx') ? 'Falha na comunicação com o servidor.' : runError.message);

      if (runResult.queued) { setStatus('waiting'); setQueuePosition(runResult.position || 1); }
      else if (runResult.success) { setStatus('processing'); }
      else if (runResult.code === 'INSUFFICIENT_CREDITS') { setNoCreditsReason('insufficient'); setShowNoCreditsModal(true); setStatus('idle'); return; }
      else if (runResult.code === 'RATE_LIMIT_EXCEEDED') { throw new Error('Muitas requisições. Aguarde 1 minuto.'); }
      else { throw new Error(runResult.error || 'Erro desconhecido'); }

      refetchCredits();
    } catch (error: any) {
      console.error('[BgRemover] Process error:', error);
      setStatus('error');
      toast.error(error.message || 'Erro ao processar imagem');
      endSubmit();
    }
  };

  const handleCancelQueue = async () => {
    if (!jobId) return;
    try {
      const result = await centralCancelJob('bg_remover', jobId);
      if (result.success) {
        setStatus('idle'); setJobId(null); setQueuePosition(0); endSubmit();
        if (result.refundedAmount > 0) toast.success(`Cancelado! ${result.refundedAmount} créditos devolvidos.`);
        else toast.info('Processamento cancelado');
        refetchCredits();
      } else toast.error(result.errorMessage || 'Erro ao cancelar');
    } catch { toast.error('Erro ao cancelar processamento'); }
  };

  const handleReset = () => {
    endSubmit();
    setInputImage(null); setInputFile(null); setOutputImage(null);
    setStatus('idle'); setProgress(0); setZoomLevel(1);
    setJobId(null); setQueuePosition(0);
    setCurrentStep(null); setFailedAtStep(null); setDebugErrorMessage(null);
    clearGlobalJob();
  };

  const handleDownload = useCallback(async () => {
    if (!outputImage) return;
    await download({ url: outputImage, filename: `sem-fundo-${Date.now()}.png`, mediaType: 'image', timeout: 10000, onSuccess: () => toast.success('Download concluído!'), locale: 'pt' });
  }, [outputImage, download]);

  const currentQueueMessage = queueMessages[queueMessageIndex];

  return (
    <AppLayout fullScreen>
      <div className="h-full lg:overflow-hidden overflow-y-auto bg-gradient-to-br from-[#0D0221] via-[#1A0A2E] to-[#16082A] flex flex-col">

        {isProcessing && (
          <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-amber-200">Não feche esta página durante o processamento</span>
          </div>
        )}

        <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-2 overflow-y-auto lg:overflow-hidden flex flex-col">
          <div className="text-center py-3">
            <h1 className="text-2xl lg:text-3xl font-bold text-white">Remover Fundo</h1>
            <p className="text-sm text-purple-300 mt-1 max-w-lg mx-auto">Remova o fundo de qualquer imagem automaticamente com IA. Resultado em PNG transparente.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-7 gap-2 lg:gap-3 flex-1 lg:min-h-0">
            {/* Left Side - Input */}
            <div className="lg:col-span-2 flex flex-col gap-2 pb-2 lg:pb-0 lg:overflow-y-auto">
              <Card className="bg-purple-900/20 border-purple-500/30 p-3">
                <h3 className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-purple-400" /> Sua Imagem
                </h3>
                {inputImage ? (
                  <div className="relative">
                    <img src={inputImage} alt="Input" className="w-full rounded-lg max-h-48 object-contain bg-black/30" />
                    <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 bg-black/50 hover:bg-black/70 text-white" onClick={() => { setInputImage(null); setInputFile(null); setOutputImage(null); }}>
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-purple-500/30 rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-purple-400/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-8 h-8 text-purple-500/40" />
                    <p className="text-xs text-purple-300 text-center">Clique para enviar uma imagem</p>
                    <p className="text-[10px] text-purple-400">PNG, JPG ou WebP</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isProcessing} />
              </Card>

              <Button
                size="sm"
                className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-medium py-2 text-xs disabled:opacity-50"
                disabled={!canProcess || isProcessing || isSubmitting}
                onClick={handleProcess}
              >
                {isSubmitting ? (<><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Iniciando...</>) :
                 status === 'uploading' ? (<><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Enviando...</>) :
                 status === 'waiting' ? (<><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Fila #{queuePosition}</>) :
                 status === 'processing' ? (<><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{Math.round(progress)}%</>) :
                 (<><Sparkles className="w-3.5 h-3.5 mr-1.5" />Remover Fundo<span className="ml-2 flex items-center gap-1 text-xs opacity-90"><Coins className="w-3.5 h-3.5" />{creditCost}</span></>)}
              </Button>

              {status === 'waiting' && (
                <Button variant="outline" size="sm" className="w-full text-xs border-red-500/30 text-red-300 hover:bg-red-500/10" onClick={handleCancelQueue}>
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />Sair da Fila
                </Button>
              )}

              <JobDebugPanel jobId={jobId} tableName="bg_remover_jobs" currentStep={currentStep} failedAtStep={failedAtStep} errorMessage={debugErrorMessage} position={queuePosition} status={status} />
            </div>

            {/* Right Side - Result */}
            <div className="lg:col-span-5 flex flex-col min-h-[280px] lg:min-h-0">
              <Card className="relative overflow-hidden bg-purple-900/20 border-purple-500/30 flex-1 flex flex-col min-h-[250px] lg:min-h-0">
                <div className="px-3 py-2 border-b border-purple-500/20 flex items-center justify-between flex-shrink-0">
                  <h3 className="text-xs font-semibold text-white flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5 text-purple-400" />Resultado</h3>
                  {outputImage && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-purple-300 hover:text-white hover:bg-purple-500/20" onClick={() => transformRef.current?.zoomOut(0.5)}><ZoomOut className="w-3.5 h-3.5" /></Button>
                      <span className="text-[10px] text-purple-300 w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-purple-300 hover:text-white hover:bg-purple-500/20" onClick={() => transformRef.current?.zoomIn(0.5)}><ZoomIn className="w-3.5 h-3.5" /></Button>
                    </div>
                  )}
                </div>

                <div className="relative flex-1 min-h-0 flex items-center justify-center" style={outputImage ? { backgroundImage: 'repeating-conic-gradient(#1a1a2e 0% 25%, #0d0d1a 0% 50%)', backgroundSize: '20px 20px' } : {}}>
                  {outputImage ? (
                    <TransformWrapper ref={transformRef} key={outputImage} initialScale={1} minScale={0.5} maxScale={4} wheel={{ step: 0.4 }} onTransformed={(_, state) => setZoomLevel(state.scale)}>
                      <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={outputImage} alt="Resultado" className="w-full h-full object-contain" draggable={false} />
                      </TransformComponent>
                    </TransformWrapper>
                  ) : isProcessing ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div className="relative"><div className="w-14 h-14 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" /><Sparkles className="absolute inset-0 m-auto w-6 h-6 text-purple-400" /></div>
                      <div className="text-center">
                        <p className="text-sm text-white font-medium flex items-center gap-2"><span>{currentQueueMessage.emoji}</span><span>{currentQueueMessage.text}</span></p>
                        {status === 'waiting' && queuePosition > 0 && <p className="text-xs text-purple-300 mt-1">Posição na fila: #{queuePosition}</p>}
                        {status === 'processing' && <p className="text-xs text-purple-300 mt-0.5">{Math.round(progress)}% concluído</p>}
                      </div>
                      <div className="w-36 h-1.5 bg-purple-900/50 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-300" style={{ width: `${progress}%` }} /></div>
                    </div>
                  ) : status === 'error' ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div className="w-16 h-16 rounded-xl bg-red-500/10 border-2 border-dashed border-red-500/30 flex items-center justify-center"><XCircle className="w-8 h-8 text-red-500/60" /></div>
                      <div className="text-center"><p className="text-sm text-red-300">Erro no processamento</p><Button variant="link" size="sm" className="text-xs text-purple-400" onClick={handleReset}>Tentar novamente</Button></div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div className="w-16 h-16 rounded-xl bg-purple-500/10 border-2 border-dashed border-purple-500/30 flex items-center justify-center"><ImageIcon className="w-8 h-8 text-purple-500/40" /></div>
                      <div className="text-center"><p className="text-sm text-purple-300">O resultado aparecerá aqui</p><p className="text-xs text-purple-400 mt-0.5">Envie uma imagem e clique em "Remover Fundo"</p></div>
                    </div>
                  )}
                </div>

                {outputImage && status === 'completed' && (
                  <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs bg-purple-600/80 border-purple-400/50 text-white hover:bg-purple-500/90" onClick={handleReset}><RotateCcw className="w-3.5 h-3.5 mr-1.5" />Nova Imagem</Button>
                    <Button size="sm" className="flex-1 h-8 text-xs bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white" onClick={handleDownload}><Download className="w-3.5 h-3.5 mr-1.5" />Baixar PNG</Button>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>

        <ImageCompressionModal isOpen={showCompressionModal} onClose={() => setShowCompressionModal(false)} file={pendingFile} originalWidth={pendingWidth} originalHeight={pendingHeight} onCompress={handleCompressed} />
        <NoCreditsModal isOpen={showNoCreditsModal} onClose={() => setShowNoCreditsModal(false)} reason={noCreditsReason} />
        <ActiveJobBlockModal isOpen={showActiveJobModal} onClose={() => setShowActiveJobModal(false)} activeTool={activeToolName} activeJobId={activeJobId} activeStatus={activeStatus} onCancelJob={centralCancelJob} />
        <DownloadProgressOverlay isVisible={isDownloading} progress={downloadProgress} onCancel={cancelDownload} mediaType="image" locale="pt" />
        <NotificationPromptToast toolName="bg-remover" />
      </div>
    </AppLayout>
  );
};

export default RemoverFundoTool;
