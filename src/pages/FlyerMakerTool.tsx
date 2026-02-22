import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, Download, Loader2, ZoomIn, ZoomOut, ImageIcon, XCircle, AlertTriangle, Coins, RefreshCw, Plus, Trash2, Upload } from 'lucide-react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useSmartBackNavigation } from '@/hooks/useSmartBackNavigation';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useUpscalerCredits } from '@/hooks/useUpscalerCredits';
import { useQueueSessionCleanup } from '@/hooks/useQueueSessionCleanup';
import { useProcessingButton } from '@/hooks/useProcessingButton';
import { useAIJob } from '@/contexts/AIJobContext';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import ReferenceImageCard from '@/components/arcano-cloner/ReferenceImageCard';
import FlyerLibraryModal from '@/components/flyer-maker/FlyerLibraryModal';
import CreativitySlider from '@/components/arcano-cloner/CreativitySlider';
import NoCreditsModal from '@/components/upscaler/NoCreditsModal';
import ActiveJobBlockModal from '@/components/ai-tools/ActiveJobBlockModal';
import { useAIToolsAuthModal } from '@/hooks/useAIToolsAuthModal';
import { optimizeForAI } from '@/hooks/useImageOptimizer';
import { cancelJob as centralCancelJob, checkActiveJob } from '@/ai/JobManager';
import { useResilientDownload } from '@/hooks/useResilientDownload';
import { useJobStatusSync } from '@/hooks/useJobStatusSync';
import { useNotificationTokenRecovery } from '@/hooks/useNotificationTokenRecovery';
import { useJobPendingWatchdog } from '@/hooks/useJobPendingWatchdog';
import { getAIErrorMessage } from '@/utils/errorMessages';
import { useAIToolSettings } from '@/hooks/useAIToolSettings';
import RefinePanel from '@/components/arcano-cloner/RefinePanel';
import RefinementTimeline, { type RefinementVersion } from '@/components/arcano-cloner/RefinementTimeline';
import AIToolsAuthModal from '@/components/ai-tools/AIToolsAuthModal';

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'waiting' | 'completed' | 'error';

const queueMessages = [
  { emoji: '🎨', text: 'Criando seu flyer personalizado...' },
  { emoji: '✨', text: 'Aplicando estilos e efeitos...' },
  { emoji: '🚀', text: 'Quase lá, continue esperando!' },
  { emoji: '🌟', text: 'Finalizando os detalhes...' },
];

const FlyerMakerTool: React.FC = () => {
  const location = useLocation();
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramentas-ia-aplicativo' });
  const { user } = usePremiumStatus();
  const { balance: credits, isLoading: creditsLoading, refetch: refetchCredits, checkBalance } = useUpscalerCredits(user?.id);
  const { getCreditCost } = useAIToolSettings();
  const creditCost = getCreditCost('Flyer Maker', 80);
  
  const { registerJob, updateJobStatus, clearJob: clearGlobalJob, playNotificationSound } = useAIJob();

  // Inputs
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [artistPhotos, setArtistPhotos] = useState<{ url: string, file: File }[]>([]);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  
  // Text inputs
  const [dateTimeLocation, setDateTimeLocation] = useState('');
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [artistNames, setArtistNames] = useState('');
  const [footerPromo, setFooterPromo] = useState('');
  
  // Settings
  const [imageSize, setImageSize] = useState<'3:4' | '9:16'>('3:4');
  const [creativity, setCreativity] = useState(0);

  // Outputs
  const [outputImage, setOutputImage] = useState<string | null>(null);

  // UI states
  const [showPhotoLibrary, setShowPhotoLibrary] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [jobId, setJobId] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [queueMessageIndex, setQueueMessageIndex] = useState(0);
  const [debugErrorMessage, setDebugErrorMessage] = useState<string | null>(null);
  
  const sessionIdRef = useRef<string>('');
  const { isSubmitting, startSubmit, endSubmit } = useProcessingButton();
  const { isDownloading, progress: downloadProgress, download, cancel: cancelDownload } = useResilientDownload();
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  // Reconcile
  const [isReconciling, setIsReconciling] = useState(false);
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  const [showReconcileButton, setShowReconcileButton] = useState(false);

  // Modals
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [noCreditsReason, setNoCreditsReason] = useState<'not_logged' | 'insufficient'>('insufficient');
  const [showActiveJobModal, setShowActiveJobModal] = useState(false);
  const [activeToolName, setActiveToolName] = useState<string>('');
  const [activeJobId, setActiveJobId] = useState<string | undefined>();
  const [activeStatus, setActiveStatus] = useState<string | undefined>();
  const { showAuthModal, setShowAuthModal, handleAuthSuccess: hookAuthSuccess } = useAIToolsAuthModal({ user, refetchCredits });

  // Refine
  const [refineMode, setRefineMode] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [refineReferenceFile, setRefineReferenceFile] = useState<File | null>(null);
  const [refineReferencePreview, setRefineReferencePreview] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [refinementHistory, setRefinementHistory] = useState<RefinementVersion[]>([]);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(0);

  const canProcess = referenceImage && artistPhotos.length > 0 && logoImage && status === 'idle';
  const isProcessing = status === 'uploading' || status === 'processing' || status === 'waiting';

  useEffect(() => {
    sessionIdRef.current = crypto.randomUUID();
  }, []);

  const handleAuthSuccess = hookAuthSuccess;

  useQueueSessionCleanup(sessionIdRef.current, status);

  useJobStatusSync({
    jobId,
    toolType: 'flyer_maker',
    enabled: isProcessing,
    onStatusChange: useCallback((update) => {
      console.log('[FlyerMaker] Status update:', update);
      if (update.status === 'completed' && update.outputUrl) {
        setOutputImage(update.outputUrl);
        setStatus('completed');
        setProgress(100);
        endSubmit();
        playNotificationSound();
        refetchCredits();
        toast.success('Flyer gerado com sucesso!');
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
    toolTable: 'flyer_maker_jobs',
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
    toolType: 'flyer_maker',
    enabled: isProcessing,
    onJobFailed: useCallback((errorMessage) => {
      setStatus('error');
      setDebugErrorMessage(errorMessage);
      endSubmit();
      toast.error(errorMessage);
    }, [endSubmit]),
  });

  useEffect(() => {
    if (jobId) registerJob(jobId, 'Flyer Maker', 'pending');
  }, [jobId, registerJob]);

  useEffect(() => {
    if (isProcessing && !processingStartTime) {
      setProcessingStartTime(Date.now());
      setShowReconcileButton(false);
    } else if (!isProcessing) {
      setProcessingStartTime(null);
      setShowReconcileButton(false);
    }
  }, [isProcessing, processingStartTime]);

  useEffect(() => {
    if (!isProcessing || !processingStartTime) return;
    const timer = setTimeout(() => setShowReconcileButton(true), 60000);
    return () => clearTimeout(timer);
  }, [isProcessing, processingStartTime]);

  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => {
      setQueueMessageIndex(prev => (prev + 1) % queueMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isProcessing]);

  useEffect(() => {
    if (status !== 'processing') return;
    const interval = setInterval(() => {
      setProgress(prev => (prev >= 95 ? prev : prev + Math.random() * 5));
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  // Image Handlers
  const handleReferenceImageChange = async (imageUrl: string | null, file?: File) => {
    setReferenceImage(imageUrl);
    if (imageUrl && !file) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        setReferenceFile(new File([blob], 'reference.png', { type: blob.type }));
      } catch (e) { console.error(e); }
    } else {
      setReferenceFile(file || null);
    }
  };

  const handleArtistPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (artistPhotos.length >= 5) {
        toast.error('Máximo de 5 fotos de artistas');
        return;
      }
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setArtistPhotos([...artistPhotos, { url, file }]);
    }
  };

  const removeArtistPhoto = (index: number) => {
    const newPhotos = [...artistPhotos];
    URL.revokeObjectURL(newPhotos[index].url);
    newPhotos.splice(index, 1);
    setArtistPhotos(newPhotos);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoImage(URL.createObjectURL(file));
      setLogoFile(file);
    }
  };

  const compressImage = async (file: File): Promise<Blob> => {
    const result = await optimizeForAI(file);
    return result.file;
  };

  const uploadToStorage = async (file: File | Blob, prefix: string): Promise<string> => {
    if (!user?.id) throw new Error('User not authenticated');
    const timestamp = Date.now();
    const fileName = `${prefix}-${timestamp}.jpg`;
    const filePath = `flyer-maker/${user.id}/${fileName}`;
    const { error } = await supabase.storage.from('artes-cloudinary').upload(filePath, file, { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('artes-cloudinary').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleProcess = async () => {
    if (!startSubmit()) return;

    if (!referenceImage || artistPhotos.length === 0 || !logoImage) {
      toast.error('Preencha todos os campos obrigatórios (referência, artistas, logo)');
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

    const freshCredits = await checkBalance();
    if (freshCredits < creditCost) {
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
      // 1. Upload images
      setProgress(10);
      let referenceUrl = referenceImage;
      if (referenceFile) {
        const compressed = await compressImage(referenceFile);
        referenceUrl = await uploadToStorage(compressed, 'reference');
      }

      const artistUrls = [];
      for (let i = 0; i < artistPhotos.length; i++) {
        setProgress(10 + ((i + 1) / artistPhotos.length) * 20);
        const compressed = await compressImage(artistPhotos[i].file);
        const url = await uploadToStorage(compressed, `artist_${i}`);
        artistUrls.push(url);
      }

      setProgress(35);
      const compressedLogo = await compressImage(logoFile!);
      const logoUrlStr = await uploadToStorage(compressedLogo, 'logo');

      // 2. Create Job
      setProgress(40);
      const { data: job, error: jobError } = await supabase
        .from('flyer_maker_jobs')
        .insert({
          session_id: sessionIdRef.current,
          user_id: user.id,
          status: 'pending',
          reference_image_url: referenceUrl,
          artist_photo_urls: artistUrls,
          logo_url: logoUrlStr,
          artist_count: artistPhotos.length,
          date_time_location: dateTimeLocation,
          title: title,
          address: address,
          artist_names: artistNames,
          footer_promo: footerPromo,
          image_size: imageSize,
          creativity: creativity
        } as any)
        .select()
        .single();

      if (jobError || !job) throw new Error(jobError?.message || 'Falha ao criar job');

      setJobId(job.id);
      registerJob(job.id, 'Flyer Maker', 'pending');

      // 3. Call Edge Function
      setProgress(50);
      setStatus('processing');

      const { data: runResult, error: runError } = await supabase.functions.invoke('runninghub-flyer-maker/run', {
        body: {
          jobId: job.id,
          userId: user.id,
          creditCost,
          referenceImageUrl: referenceUrl,
          artistPhotoUrls: artistUrls,
          logoUrl: logoUrlStr,
          dateTimeLocation: dateTimeLocation ? `DATA HORA E LOCAL: ${dateTimeLocation}` : '',
          title: title ? `TITULO: ${title}` : '',
          address: address ? `ENDEREÇO: ${address}` : '',
          artistNames: artistNames ? `NOMES DOS ARTISTAS: ${artistNames}` : '',
          footerPromo: footerPromo ? `PROMOÇÃO DE RODAPÉ: ${footerPromo}` : '',
          imageSize,
          creativity
        },
      });

      if (runError) throw new Error(runError.message || 'Erro ao iniciar processamento');

      if (runResult.code === 'INSUFFICIENT_CREDITS') {
        setStatus('idle');
        setNoCreditsReason('insufficient');
        setShowNoCreditsModal(true);
        endSubmit();
        return;
      }

      if (runResult.queued) {
        setStatus('waiting');
        setQueuePosition(runResult.position || 1);
        toast.info(`Você está na fila (posição ${runResult.position})`);
      } else {
        setStatus('processing');
        setProgress(60);
      }

    } catch (error: any) {
      console.error('[FlyerMaker] Process error:', error);
      setStatus('error');
      setDebugErrorMessage(error.message);
      toast.error(error.message);
      endSubmit();
    }
  };

  const handleCancelQueue = async () => {
    if (!jobId) return;
    try {
      const result = await centralCancelJob('flyer_maker', jobId);
      if (result.success) {
        setStatus('idle');
        setJobId(null);
        endSubmit();
        if (result.refundedAmount > 0) toast.success(`Cancelado! ${result.refundedAmount} créditos devolvidos.`);
        else toast.info('Cancelado');
        refetchCredits();
      } else {
        toast.error(result.errorMessage || 'Erro ao cancelar');
      }
    } catch (e) { console.error(e); toast.error('Erro ao cancelar'); }
  };

  // ... (Refine logic simplified for brevity, assume similar to ArcanoCloner)
  // Reuse handleRefine logic from ArcanoCloner but adapted for outputImage

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
            <h1 className="text-2xl lg:text-3xl font-bold text-white">Flyer Maker</h1>
            <p className="text-sm text-purple-300 mt-1 max-w-lg mx-auto">Crie flyers profissionais a partir de uma referência e seus dados.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-7 gap-2 lg:gap-3 flex-1 lg:min-h-0">
            {/* INPUTS */}
            <div className="lg:col-span-2 flex flex-col gap-2 pb-2 lg:pb-0 lg:overflow-y-auto pr-1 custom-scrollbar">
              <ReferenceImageCard 
                image={referenceImage} 
                onClearImage={() => { setReferenceImage(null); setReferenceFile(null); }} 
                onOpenLibrary={() => setShowPhotoLibrary(true)} 
                disabled={isProcessing}
                title="Flyer de Referência"
                emptyLabel="Escolher da biblioteca"
                emptySubLabel="Ou envie seu flyer"
              />

              <Card className="p-3 bg-purple-900/20 border-purple-500/30">
                <Label className="text-xs text-purple-200 mb-2 block">Fotos dos Artistas (1-5)</Label>
                <div className="grid grid-cols-5 gap-1">
                  {artistPhotos.map((photo, idx) => (
                    <div key={idx} className="relative aspect-square rounded overflow-hidden group">
                      <img src={photo.url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeArtistPhoto(idx)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity" disabled={isProcessing}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {artistPhotos.length < 5 && (
                    <label className={`aspect-square rounded border-2 border-dashed border-purple-500/30 flex items-center justify-center cursor-pointer hover:bg-purple-500/10 transition-colors ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                      <input type="file" accept="image/*" className="hidden" onChange={handleArtistPhotoUpload} disabled={isProcessing} />
                      <Plus className="w-5 h-5 text-purple-400" />
                    </label>
                  )}
                </div>
              </Card>

              <Card className="p-3 bg-purple-900/20 border-purple-500/30">
                <Label className="text-xs text-purple-200 mb-2 block">Logo do Local</Label>
                {logoImage ? (
                  <div className="relative h-20 rounded overflow-hidden group">
                    <img src={logoImage} alt="" className="w-full h-full object-contain bg-black/20" />
                    <button onClick={() => { setLogoImage(null); setLogoFile(null); }} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity" disabled={isProcessing}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className={`h-20 rounded border-2 border-dashed border-purple-500/30 flex flex-col items-center justify-center cursor-pointer hover:bg-purple-500/10 transition-colors ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isProcessing} />
                    <Upload className="w-5 h-5 text-purple-400 mb-1" />
                    <span className="text-[10px] text-purple-300">Upload Logo</span>
                  </label>
                )}
              </Card>

              <div className="space-y-2">
                <div>
                  <Label className="text-[10px] text-purple-300 mb-0.5 block">Data e Horário:</Label>
                  <Input placeholder="seg.18.abr - 18h" value={dateTimeLocation} onChange={e => setDateTimeLocation(e.target.value)} disabled={isProcessing} className="bg-purple-900/20 border-purple-500/30 text-white text-xs h-8" />
                </div>
                <div>
                  <Label className="text-[10px] text-purple-300 mb-0.5 block">Título do Evento:</Label>
                  <Input placeholder="deu ferias" value={title} onChange={e => setTitle(e.target.value)} disabled={isProcessing} className="bg-purple-900/20 border-purple-500/30 text-white text-xs h-8" />
                </div>
                <div>
                  <Label className="text-[10px] text-purple-300 mb-0.5 block">Endereço:</Label>
                  <Input placeholder="endereço do local..." value={address} onChange={e => setAddress(e.target.value)} disabled={isProcessing} className="bg-purple-900/20 border-purple-500/30 text-white text-xs h-8" />
                </div>
                <div>
                  <Label className="text-[10px] text-purple-300 mb-0.5 block">Nomes dos Artistas:</Label>
                  <Input placeholder="dj alok - rasta chinela..." value={artistNames} onChange={e => setArtistNames(e.target.value)} disabled={isProcessing} className="bg-purple-900/20 border-purple-500/30 text-white text-xs h-8" />
                </div>
                <div>
                  <Label className="text-[10px] text-purple-300 mb-0.5 block">Rodapé / Promoção:</Label>
                  <Input placeholder="entrada off para elas..." value={footerPromo} onChange={e => setFooterPromo(e.target.value)} disabled={isProcessing} className="bg-purple-900/20 border-purple-500/30 text-white text-xs h-8" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant={imageSize === '3:4' ? 'default' : 'outline'} onClick={() => setImageSize('3:4')} size="sm" className="text-xs h-8" disabled={isProcessing}>Feed (3:4)</Button>
                <Button variant={imageSize === '9:16' ? 'default' : 'outline'} onClick={() => setImageSize('9:16')} size="sm" className="text-xs h-8" disabled={isProcessing}>Stories (9:16)</Button>
              </div>

              <CreativitySlider value={creativity} onChange={setCreativity} disabled={isProcessing} max={5} showRecommendation={false} />

              <Button
                size="sm"
                className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-medium py-2 text-xs mt-2"
                disabled={!canProcess || isProcessing || isSubmitting}
                onClick={handleProcess}
              >
                {isSubmitting || isProcessing ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Processando...</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5 mr-1.5" /> Gerar Flyer <span className="ml-2 flex items-center gap-1 text-xs opacity-90"><Coins className="w-3 h-3" /> {creditCost}</span></>
                )}
              </Button>

              {status === 'waiting' && (
                <Button variant="outline" size="sm" className="w-full text-xs border-red-500/30 text-red-300 hover:bg-red-500/10" onClick={handleCancelQueue}>
                  <XCircle className="w-3.5 h-3.5 mr-1.5" /> Sair da Fila
                </Button>
              )}
            </div>

            {/* OUTPUT */}
            <div className="lg:col-span-5 flex flex-col min-h-[280px] lg:min-h-0">
              <Card className="relative overflow-hidden bg-purple-900/20 border-purple-500/30 flex-1 flex flex-col min-h-[250px] lg:min-h-0">
                <div className="px-3 py-2 border-b border-purple-500/20 flex items-center justify-between flex-shrink-0">
                  <h3 className="text-xs font-semibold text-white flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5 text-fuchsia-400" /> Resultado</h3>
                  {outputImage && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-purple-300 hover:text-white" onClick={() => transformRef.current?.zoomOut(0.5)}><ZoomOut className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-purple-300 hover:text-white" onClick={() => transformRef.current?.zoomIn(0.5)}><ZoomIn className="w-3.5 h-3.5" /></Button>
                    </div>
                  )}
                </div>

                <div className="relative flex-1 min-h-0 flex items-center justify-center">
                  {outputImage ? (
                    <TransformWrapper ref={transformRef} initialScale={1} minScale={0.5} maxScale={4}>
                      <TransformComponent wrapperClass="w-full h-full flex items-center justify-center" contentClass="w-full h-full flex items-center justify-center">
                        <img src={outputImage} alt="Resultado" className="max-w-full max-h-full object-contain" />
                      </TransformComponent>
                    </TransformWrapper>
                  ) : (
                    <div className="text-center p-8">
                      {isProcessing ? (
                        <div className="flex flex-col items-center">
                          <div className="relative w-16 h-16 mb-4">
                            <div className="absolute inset-0 rounded-full border-4 border-purple-500/30"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-t-fuchsia-500 animate-spin"></div>
                          </div>
                          <p className="text-white font-medium mb-1">{status === 'uploading' ? 'Enviando imagens...' : status === 'waiting' ? `Na fila: Posição ${queuePosition}` : 'Processando IA...'}</p>
                          <p className="text-xs text-purple-300 animate-pulse">{queueMessages[queueMessageIndex].text}</p>
                          <div className="w-48 h-1 bg-purple-900/50 rounded-full mt-4 overflow-hidden"><div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-300" style={{ width: `${progress}%` }}></div></div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-purple-400/50">
                          <ImageIcon className="w-16 h-16 mb-2" />
                          <p className="text-sm">O resultado aparecerá aqui</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {outputImage && (
                  <div className="p-2 border-t border-purple-500/20 bg-black/20 flex gap-2 justify-center">
                    <Button onClick={() => setOutputImage(null)} variant="outline" size="sm" className="text-xs h-8 border-purple-500/30 text-purple-300"><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Nova</Button>
                    <Button onClick={() => download({ url: outputImage!, filename: `flyer-${Date.now()}.png` })} size="sm" className="text-xs h-8 bg-green-600 hover:bg-green-700 text-white"><Download className="w-3.5 h-3.5 mr-1.5" /> Baixar HD</Button>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>

        <FlyerLibraryModal isOpen={showPhotoLibrary} onClose={() => setShowPhotoLibrary(false)} onSelectPhoto={(url) => { handleReferenceImageChange(url); setShowPhotoLibrary(false); }} />
        <NoCreditsModal isOpen={showNoCreditsModal} onClose={() => setShowNoCreditsModal(false)} reason={noCreditsReason} />
        <ActiveJobBlockModal isOpen={showActiveJobModal} onClose={() => setShowActiveJobModal(false)} activeTool={activeToolName} activeStatus={activeStatus} />
        <AIToolsAuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onAuthSuccess={handleAuthSuccess} />
      </div>
    </AppLayout>
  );
};

export default FlyerMakerTool;
