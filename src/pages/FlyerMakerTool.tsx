import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, Download, Loader2, ZoomIn, ZoomOut, ImageIcon, XCircle, AlertTriangle, Coins, RefreshCw, Plus, Trash2, Upload, Wand2, ArrowLeft, Calendar, Mic2, Handshake, Shapes, Construction } from 'lucide-react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useSmartBackNavigation } from '@/hooks/useSmartBackNavigation';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useCredits } from '@/contexts/CreditsContext';
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

import { optimizeForAI } from '@/hooks/useImageOptimizer';
import { isAcceptedImage, ensureBrowserCompatibleImage, IMAGE_ACCEPT } from '@/lib/heicConverter';
import { cancelJob as centralCancelJob, checkActiveJob } from '@/ai/JobManager';
import { useResilientDownload } from '@/hooks/useResilientDownload';
import { ResilientImage } from '@/components/upscaler/ResilientImage';
import { useJobStatusSync } from '@/hooks/useJobStatusSync';
import { useNotificationTokenRecovery } from '@/hooks/useNotificationTokenRecovery';
import { useJobPendingWatchdog } from '@/hooks/useJobPendingWatchdog';
import { getAIErrorMessage } from '@/utils/errorMessages';
import { useAIToolSettings } from '@/hooks/useAIToolSettings';
import RefinePanel from '@/components/arcano-cloner/RefinePanel';
import RefinementTimeline, { type RefinementVersion } from '@/components/arcano-cloner/RefinementTimeline';


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
  const { balance: credits, isLoading: creditsLoading, refetch: refetchCredits, checkBalance } = useCredits();
  const { getCreditCost } = useAIToolSettings();
  const creditCost = getCreditCost('Flyer Maker', 100);
  
  // Flyer Maker test credits
  const [testCredits, setTestCredits] = useState(0);
  
  const fetchTestCredits = useCallback(async (): Promise<number> => {
    if (!user?.id) return 0;
    try {
      const { data, error } = await supabase.rpc('get_flyer_test_credits', { _user_id: user.id });
      if (!error && typeof data === 'number') {
        setTestCredits(data);
        return data;
      }
    } catch {}
    return 0;
  }, [user?.id]);
  
  useEffect(() => { fetchTestCredits(); }, [fetchTestCredits]);
  
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
  const [thumbnailImage, setThumbnailImage] = useState<string | null>(null);

  // UI states
  const [flyerType, setFlyerType] = useState<'evento' | 'agenda' | 'contrate' | 'outro' | null>(null);
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
  

  // Refine
  const [refineMode, setRefineMode] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [refineReferenceFile, setRefineReferenceFile] = useState<File | null>(null);
  const [refineReferencePreview, setRefineReferencePreview] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [refinementHistory, setRefinementHistory] = useState<RefinementVersion[]>([]);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(0);
  const [refineJobId, setRefineJobId] = useState<string | null>(null);

  // Refs for refine callback (avoid stale closures)
  const outputImageRef = useRef<string | null>(null);
  const refinementHistoryRef = useRef<RefinementVersion[]>([]);
  outputImageRef.current = outputImage;
  refinementHistoryRef.current = refinementHistory;

  const canProcess = referenceImage && artistPhotos.length > 0 && logoImage && status === 'idle';
  const isProcessing = status === 'uploading' || status === 'processing' || status === 'waiting';

  useEffect(() => {
    sessionIdRef.current = crypto.randomUUID();
  }, []);

  // Auto-open refine mode when coming from "Modificar" in My Creations
  useEffect(() => {
    const state = location.state as { refineImageUrl?: string } | null;
    if (state?.refineImageUrl) {
      setOutputImage(state.refineImageUrl);
      setStatus('completed');
      setRefineMode(true);
      // Clear the state so refresh doesn't re-trigger
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  

  useQueueSessionCleanup(sessionIdRef.current, status);

  useJobStatusSync({
    jobId,
    toolType: 'flyer_maker',
    enabled: isProcessing,
    onStatusChange: useCallback((update) => {
      console.log('[FlyerMaker] Status update:', update);
      if (update.status === 'completed' && update.outputUrl) {
        setOutputImage(update.outputUrl);
        if (update.thumbnailUrl) setThumbnailImage(update.thumbnailUrl);
        setStatus('completed');
        setProgress(100);
        endSubmit();
        playNotificationSound();
        refetchCredits(); fetchTestCredits();
        toast.success('Flyer gerado com sucesso!');
      } else if (update.status === 'failed' || update.status === 'cancelled') {
        setStatus('error');
        const friendlyError = getAIErrorMessage(update.errorMessage);
        setDebugErrorMessage(update.errorMessage);
        endSubmit();
        refetchCredits(); fetchTestCredits();
        toast.error(friendlyError.message);
      } else if (update.status === 'queued') {
        setStatus('waiting');
        setQueuePosition(update.position || 0);
      } else if (update.status === 'running' || update.status === 'starting') {
        setStatus('processing');
        setQueuePosition(0);
      }
    }, [endSubmit, playNotificationSound, refetchCredits, fetchTestCredits]),
    onGlobalStatusChange: updateJobStatus,
  });

  // Refine job sync (uses image_generator table)
  useJobStatusSync({
    jobId: refineJobId,
    toolType: 'image_generator',
    enabled: isRefining && !!refineJobId,
    onStatusChange: useCallback((update) => {
      console.log('[FlyerMaker] Refine job status update:', update);
      if (update.status === 'completed' && update.outputUrl) {
        const newUrl = update.thumbnailUrl || update.outputUrl;
        const history = refinementHistoryRef.current;
        const newIndex = history.length === 0 ? 1 : history.length;
        const newVersion: RefinementVersion = { url: newUrl, label: `Alteração ${newIndex}` };

        setRefinementHistory(prev => {
          const updated = prev.length === 0
            ? [{ url: outputImageRef.current!, label: 'Original' }, newVersion]
            : [...prev, newVersion];
          setSelectedHistoryIndex(updated.length - 1);
          return updated;
        });

        setOutputImage(newUrl);
        setRefineMode(false);
        setRefinePrompt('');
        setRefineReferenceFile(null);
        setRefineReferencePreview(null);
        setIsRefining(false);
        setRefineJobId(null);
        endSubmit();
        playNotificationSound();
        refetchCredits();
        toast.success('Alteração feita com sucesso!');
      } else if (update.status === 'failed' || update.status === 'cancelled') {
        setIsRefining(false);
        setRefineJobId(null);
        endSubmit();
        refetchCredits();
        const friendlyError = getAIErrorMessage(update.errorMessage);
        toast.error(friendlyError.message);
      }
    }, [endSubmit, playNotificationSound, refetchCredits]),
    onGlobalStatusChange: updateJobStatus,
  });

  useNotificationTokenRecovery({
    userId: user?.id,
    toolTable: 'flyer_maker_jobs',
    onRecovery: useCallback(async (result) => {
      if (result.outputUrl) {
        setOutputImage(result.outputUrl);
        // Fetch thumbnail as fallback
        const { data } = await supabase.from('flyer_maker_jobs').select('thumbnail_url').eq('id', result.jobId).single();
        if (data?.thumbnail_url) setThumbnailImage(data.thumbnail_url);
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

  const handleArtistPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    e.target.value = '';
    if (!rawFile) return;
    if (artistPhotos.length >= 5) {
      toast.error('Máximo de 5 fotos de artistas');
      return;
    }
    if (!isAcceptedImage(rawFile)) {
      toast.error('Selecione uma imagem válida (JPG, PNG, WEBP ou HEIC).');
      return;
    }
    try {
      const file = await ensureBrowserCompatibleImage(rawFile);
      const url = URL.createObjectURL(file);
      setArtistPhotos([...artistPhotos, { url, file }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao processar a imagem.');
    }
  };

  const removeArtistPhoto = (index: number) => {
    const newPhotos = [...artistPhotos];
    URL.revokeObjectURL(newPhotos[index].url);
    newPhotos.splice(index, 1);
    setArtistPhotos(newPhotos);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    e.target.value = '';
    if (!rawFile) return;
    if (!isAcceptedImage(rawFile)) {
      toast.error('Selecione uma imagem válida (JPG, PNG, WEBP ou HEIC).');
      return;
    }
    try {
      const file = await ensureBrowserCompatibleImage(rawFile);
      setLogoImage(URL.createObjectURL(file));
      setLogoFile(file);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao processar a imagem.');
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

    // Check combined balance (test credits + normal credits)
    const freshCredits = await checkBalance();
    const freshTestCredits = await fetchTestCredits();
    const totalAvailable = freshCredits + freshTestCredits;
    if (totalAvailable < creditCost) {
      setNoCreditsReason('insufficient');
      setShowNoCreditsModal(true);
      endSubmit();
      return;
    }

    setStatus('uploading');
    setProgress(0);
    setOutputImage(null);
    setThumbnailImage(null);
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

      // Atualizar saldo de créditos teste imediatamente após consumo
      fetchTestCredits();
      refetchCredits();

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
      if (jobId) {
        const { markJobAsFailedInDb } = await import('@/utils/markJobAsFailedInDb');
        await markJobAsFailedInDb(jobId, 'flyer_maker', error.message || 'Erro desconhecido');
      }
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

  // Handle refine submission (via RunningHub queue)
  const handleRefine = async () => {
    if (!startSubmit()) return;
    
    if (!outputImage || !refinePrompt.trim() || !user?.id) {
      endSubmit();
      return;
    }

    const REFINE_COST = 100;

    // Check active job
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
    if (freshCredits < REFINE_COST) {
      setNoCreditsReason('insufficient');
      setShowNoCreditsModal(true);
      endSubmit();
      return;
    }

    setIsRefining(true);
    let localRefineJobId: string | null = null;

    try {
      // Build reference URLs — outputImage is already a storage URL
      const referenceImageUrls: string[] = [outputImage];

      // Upload extra reference if provided
      if (refineReferenceFile) {
        const compressed = await compressImage(refineReferenceFile);
        const extraUrl = await uploadToStorage(compressed, 'refine-ref');
        referenceImageUrls.push(extraUrl);
      }

      // If first refinement, seed history with original
      if (refinementHistory.length === 0) {
        setRefinementHistory([{ url: outputImage, label: 'Original' }]);
      }

      // Create job in image_generator_jobs
      const { data: job, error: jobError } = await supabase
        .from('image_generator_jobs')
        .insert({
          session_id: sessionIdRef.current,
          user_id: user.id,
          status: 'pending',
          prompt: refinePrompt.trim(),
          aspect_ratio: imageSize === '9:16' ? '9:16' : '3:4',
          model: 'refine',
        } as any)
        .select('id')
        .single();

      if (jobError || !job) throw new Error(jobError?.message || 'Erro ao criar job de refinamento');

      localRefineJobId = job.id;
      setRefineJobId(job.id);
      registerJob(job.id, 'Gerar Imagem', 'pending');

      // Start via edge function
      const { data: runResult, error: runError } = await supabase.functions.invoke('runninghub-image-generator/run', {
        body: {
          jobId: job.id,
          referenceImageUrls,
          aspectRatio: imageSize === '9:16' ? '9:16' : '3:4',
          creditCost: REFINE_COST,
          prompt: refinePrompt.trim(),
          source: 'flyer_maker_refine',
        },
      });

      if (runError) throw new Error(runError.message || 'Erro ao iniciar refinamento');

      if (runResult?.code === 'INSUFFICIENT_CREDITS') {
        setNoCreditsReason('insufficient');
        setShowNoCreditsModal(true);
        setIsRefining(false);
        setRefineJobId(null);
        endSubmit();
        return;
      }

      if (runResult?.error && !runResult?.success && !runResult?.queued) {
        throw new Error(runResult.error);
      }

      // Now wait for useJobStatusSync to deliver the result via Realtime

    } catch (err: any) {
      console.error('[FlyerMaker] Refine error:', err);
      toast.error(err.message || 'Erro ao alterar imagem');
      if (localRefineJobId) {
        const { markJobAsFailedInDb } = await import('@/utils/markJobAsFailedInDb');
        await markJobAsFailedInDb(localRefineJobId, 'image_generator', err.message || 'Refine invocation failed');
      }
      setIsRefining(false);
      setRefineJobId(null);
      endSubmit();
    }
  };

  const handleSelectVersion = (index: number) => {
    setSelectedHistoryIndex(index);
    if (refinementHistory[index]) {
      setOutputImage(refinementHistory[index].url);
    }
  };

  const handleNew = () => {
    setOutputImage(null);
    setThumbnailImage(null);
    setRefinementHistory([]);
    setSelectedHistoryIndex(0);
    setRefineMode(false);
    setRefinePrompt('');
    setRefineJobId(null);
    setIsRefining(false);
    setStatus('idle');
  };

  return (
    <AppLayout fullScreen>
      <div className="h-full lg:overflow-hidden overflow-y-auto flex flex-col">
        {isProcessing && (
          <div className="bg-amber-500/20 border-b border-amber-500/50 px-4 py-2 flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs text-amber-700 dark:text-amber-200">Não feche esta página durante o processamento</span>
          </div>
        )}

        <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-4 overflow-y-auto lg:overflow-hidden flex flex-col">
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 lg:gap-5 flex-1 lg:min-h-0">
            {/* INPUTS */}
            <div className="lg:col-span-2 min-h-0 overflow-hidden">
              <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 overflow-y-auto h-full max-h-full"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' }}
              >
                {/* Title */}
                <div>
                  <h1 className="text-xl font-bold text-foreground">Flyer Maker</h1>
                  <p className="text-xs text-muted-foreground mt-1">Crie flyers profissionais a partir de uma referência e seus dados.</p>
                  {testCredits > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 rounded-lg px-3 py-1.5">
                      <span className="text-xs">🧪</span>
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">{testCredits} créditos de teste</span>
                    </div>
                  )}
                </div>

                {!refineMode ? (
                  <>
                    <ReferenceImageCard 
                      image={referenceImage} 
                      onClearImage={() => { setReferenceImage(null); setReferenceFile(null); }} 
                      onOpenLibrary={() => setShowPhotoLibrary(true)} 
                      disabled={isProcessing}
                      title="Flyer de Referência"
                      emptyLabel="Escolher da biblioteca"
                      emptySubLabel="Ou envie seu flyer"
                    />

                    {/* Artist Photos */}
                    <div className="border border-border rounded-xl p-4 bg-muted/50">
                      <span className="text-sm font-medium text-foreground mb-2 block">Fotos dos Artistas (Max 5)</span>
                      <div className="grid grid-cols-3 gap-2">
                        {[0, 1, 2, 3, 4].map((idx) => {
                          const photo = artistPhotos[idx];
                          if (photo) {
                            return (
                              <div key={idx} className={`relative aspect-[3/4] rounded-lg overflow-hidden group ${idx >= 3 ? 'col-span-1' : ''}`}>
                                <img src={photo.url} alt="" className="w-full h-full object-cover" />
                                <button onClick={() => removeArtistPhoto(idx)} className="absolute inset-0 bg-muted/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-foreground transition-opacity" disabled={isProcessing}>
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          }
                          if (idx === artistPhotos.length) {
                            return (
                              <label key={idx} className={`aspect-[3/4] rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-accent transition-colors ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                                <input type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={handleArtistPhotoUpload} disabled={isProcessing} />
                                <Plus className="w-5 h-5 text-muted-foreground" />
                              </label>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>

                    {/* Logo */}
                    <div className="border border-border rounded-xl p-4 bg-muted/50">
                      <span className="text-sm font-medium text-foreground mb-2 block">Logo do Local</span>
                      {logoImage ? (
                        <div className="relative h-20 rounded-lg overflow-hidden group">
                          <img src={logoImage} alt="" className="w-full h-full object-contain bg-muted/50" />
                          <button onClick={() => { setLogoImage(null); setLogoFile(null); }} className="absolute inset-0 bg-muted/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-foreground transition-opacity" disabled={isProcessing}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className={`h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-accent transition-colors ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                          <input type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={handleLogoUpload} disabled={isProcessing} />
                          <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                          <span className="text-[10px] text-muted-foreground">Upload Logo</span>
                        </label>
                      )}
                    </div>

                    {/* Text inputs */}
                    <div className="space-y-2.5">
                      <div>
                        <span className="text-xs text-muted-foreground mb-1 block">Data e Horário:</span>
                        <Input placeholder="SEG.18.ABR - 18H" value={dateTimeLocation} onChange={e => setDateTimeLocation(e.target.value.toUpperCase())} disabled={isProcessing} className="bg-muted border-border text-foreground text-sm h-10 uppercase placeholder:text-muted-foreground" />
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground mb-1 block">Título do Evento:</span>
                        <Input placeholder="DEU FERIAS" value={title} onChange={e => setTitle(e.target.value.toUpperCase())} disabled={isProcessing} className="bg-muted border-border text-foreground text-sm h-10 uppercase placeholder:text-muted-foreground" />
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground mb-1 block">Endereço:</span>
                        <Input placeholder="ENDEREÇO DO LOCAL..." value={address} onChange={e => setAddress(e.target.value.toUpperCase())} disabled={isProcessing} className="bg-muted border-border text-foreground text-sm h-10 uppercase placeholder:text-muted-foreground" />
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground mb-1 block">Nomes dos Artistas:</span>
                        <Input placeholder="DJ ALOK - RASTA CHINELA..." value={artistNames} onChange={e => setArtistNames(e.target.value.toUpperCase())} disabled={isProcessing} className="bg-muted border-border text-foreground text-sm h-10 uppercase placeholder:text-muted-foreground" />
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground mb-1 block">Rodapé / Promoção:</span>
                        <Input placeholder="ENTRADA OFF PARA ELAS..." value={footerPromo} onChange={e => setFooterPromo(e.target.value.toUpperCase())} disabled={isProcessing} className="bg-muted border-border text-foreground text-sm h-10 uppercase placeholder:text-muted-foreground" />
                      </div>
                    </div>

                    {/* Size Toggle */}
                    <div>
                      <span className="text-sm font-medium text-foreground mb-2 block">Tamanho</span>
                      <div className="grid grid-cols-2 gap-0 bg-muted border border-border rounded-lg p-1">
                        <button
                          onClick={() => setImageSize('3:4')}
                          className={`py-2.5 px-3 text-sm rounded-md transition-all font-medium ${
                            imageSize === '3:4'
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                          disabled={isProcessing}
                        >
                          Feed (3:4)
                        </button>
                        <button
                          onClick={() => setImageSize('9:16')}
                          className={`py-2.5 px-3 text-sm rounded-md transition-all font-medium ${
                            imageSize === '9:16'
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                          disabled={isProcessing}
                        >
                          Stories (9:16)
                        </button>
                      </div>
                    </div>

                    <CreativitySlider value={creativity} onChange={setCreativity} disabled={isProcessing} max={5} showRecommendation={false} />

                    {/* Generate Button */}
                    {!isProcessing && status !== 'completed' && (
                      <Button
                        className="w-full py-4 text-sm font-semibold bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded-xl shadow-lg disabled:opacity-50"
                        disabled={!canProcess || isSubmitting}
                        onClick={handleProcess}
                      >
                        {isSubmitting ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Iniciando...</>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Gerar Flyer
                            <span className="ml-2 flex items-center gap-1 text-xs opacity-90">
                              <Coins className="w-3.5 h-3.5" /> {creditCost}
                              {testCredits > 0 && <span className="ml-1">(🧪 teste)</span>}
                            </span>
                          </>
                        )}
                      </Button>
                    )}

                    {/* Completed Actions */}
                    {status === 'completed' && (
                      <div className="space-y-2">
                        <Button
                          className="w-full py-4 text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl"
                          onClick={() => download({ url: outputImage!, filename: `flyer-${Date.now()}.png` })}
                        >
                          <Download className="w-4 h-4 mr-2" /> Baixar HD
                        </Button>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            className="w-full py-3 text-sm border-border text-muted-foreground hover:bg-accent rounded-xl"
                            onClick={handleNew}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" /> Nova
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full py-3 text-sm border-border text-muted-foreground hover:bg-accent rounded-xl"
                            onClick={() => setRefineMode(true)}
                          >
                            <Wand2 className="w-4 h-4 mr-2" /> Alterar
                          </Button>
                        </div>
                      </div>
                    )}

                    {status === 'waiting' && (
                      <Button
                        variant="outline"
                        className="w-full py-3 text-sm border-red-500/30 text-red-300 hover:bg-red-500/100/10 rounded-xl"
                        onClick={handleCancelQueue}
                      >
                        <XCircle className="w-4 h-4 mr-2" /> Sair da Fila
                      </Button>
                    )}
                  </>
                ) : (
                  <RefinePanel
                    title="Fazer Alteração"
                    buttonLabel="Fazer Alteração"
                    loadingLabel="Alterando..."
                    prompt={refinePrompt}
                    onPromptChange={setRefinePrompt}
                    referencePreview={refineReferencePreview}
                    onReferenceChange={(file, preview) => {
                      setRefineReferenceFile(file);
                      setRefineReferencePreview(preview);
                    }}
                    onSubmit={handleRefine}
                    onCancel={() => {
                      setRefineMode(false);
                      setRefinePrompt('');
                      setRefineReferenceFile(null);
                      setRefineReferencePreview(null);
                    }}
                    isRefining={isRefining}
                  />
                )}
              </div>
            </div>

            {/* OUTPUT */}
            <div className="lg:col-span-5 min-h-0 overflow-hidden">
              <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col min-h-[400px] h-full">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><ImageIcon className="w-4 h-4 text-muted-foreground" /> Resultado</h3>
                  {outputImage && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => transformRef.current?.zoomOut(0.5)}><ZoomOut className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => transformRef.current?.zoomIn(0.5)}><ZoomIn className="w-4 h-4" /></Button>
                    </div>
                  )}
                </div>

                <div className="relative flex-1 min-h-0 flex items-center justify-center p-4">
                  {outputImage ? (
                    <TransformWrapper ref={transformRef} initialScale={1} minScale={0.5} maxScale={4}>
                      <TransformComponent
                        wrapperStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <ResilientImage src={outputImage} originalSrc={thumbnailImage || undefined} alt="Resultado" className="max-w-full max-h-full object-contain" maxRetries={4} compressOnFailure={true} locale="pt" objectFit="contain" />
                      </TransformComponent>
                    </TransformWrapper>
                  ) : isRefining ? (
                    <div className="flex flex-col items-center p-8">
                      <div className="relative w-16 h-16 mb-4">
                        <div className="absolute inset-0 rounded-full border-4 border-border"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin"></div>
                        <Wand2 className="absolute inset-0 m-auto w-6 h-6 text-primary" />
                      </div>
                      <p className="text-foreground font-medium mb-1">Refinando imagem...</p>
                      <p className="text-xs text-muted-foreground animate-pulse">A IA está modificando sua imagem</p>
                    </div>
                  ) : (
                    <div className="text-center p-8">
                      {isProcessing ? (
                        <div className="flex flex-col items-center">
                          <div className="relative w-16 h-16 mb-4">
                            <div className="absolute inset-0 rounded-full border-4 border-border"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin"></div>
                          </div>
                          <p className="text-foreground font-medium mb-1">{status === 'uploading' ? 'Enviando imagens...' : status === 'waiting' ? `Na fila: Posição ${queuePosition}` : 'Processando IA...'}</p>
                          <p className="text-xs text-muted-foreground animate-pulse">{queueMessages[queueMessageIndex].text}</p>
                          <div className="w-48 h-1 bg-accent rounded-full mt-4 overflow-hidden"><div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }}></div></div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-muted-foreground">
                          <ImageIcon className="w-16 h-16 mb-2" />
                          <p className="text-sm">O resultado aparecerá aqui</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <RefinementTimeline
                  versions={refinementHistory}
                  selectedIndex={selectedHistoryIndex}
                  onSelect={handleSelectVersion}
                />
              </div>
            </div>
          </div>
        </div>

        <FlyerLibraryModal isOpen={showPhotoLibrary} onClose={() => setShowPhotoLibrary(false)} onSelectPhoto={(url) => { handleReferenceImageChange(url); setShowPhotoLibrary(false); }} onUploadPhoto={(dataUrl, file) => { handleReferenceImageChange(dataUrl, file); setShowPhotoLibrary(false); }} />
        <NoCreditsModal isOpen={showNoCreditsModal} onClose={() => setShowNoCreditsModal(false)} reason={noCreditsReason} />
        <ActiveJobBlockModal isOpen={showActiveJobModal} onClose={() => setShowActiveJobModal(false)} activeTool={activeToolName} activeJobId={activeJobId} activeStatus={activeStatus} onCancelJob={centralCancelJob} />
        
      </div>
    </AppLayout>
  );
};

export default FlyerMakerTool;
