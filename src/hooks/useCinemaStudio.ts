import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useCredits } from '@/contexts/CreditsContext';
import { useProcessingButton } from '@/hooks/useProcessingButton';
import { useAIJob } from '@/contexts/AIJobContext';
import { useResilientDownload } from '@/hooks/useResilientDownload';
import { checkActiveJob, createJob, startJob } from '@/ai/JobManager';
import { uploadToStorage as uploadToStorageLegacy } from '@/hooks/useStorageUpload';
import { uploadToStorage as uploadToStorageJM } from '@/ai/JobManager';
import { optimizeForAI } from '@/hooks/useImageOptimizer';
import { useJobStatusSync } from '@/hooks/useJobStatusSync';
import { useJobPendingWatchdog } from '@/hooks/useJobPendingWatchdog';
import { useAIToolSettings } from '@/hooks/useAIToolSettings';
import { getAIErrorMessage } from '@/utils/errorMessages';
import { translatePromptToChinese } from '@/utils/translateToChineseForVideo';
import {
  type CinemaSettings,
  buildCinemaPrompt,
  getDefaultSettings,
} from '@/utils/cinemaPromptBuilder';

// ━━━ Models (video mode) ━━━
const MODELS = {
  'standard-t2v': 'seedance-2.0-text-to-video',
  'standard-i2v': 'seedance-2.0-image-to-video',
  'standard-r2v': 'seedance-2.0-reference-to-video',
  'fast-t2v': 'seedance-2.0-fast-text-to-video',
  'fast-i2v': 'seedance-2.0-fast-image-to-video',
  'fast-r2v': 'seedance-2.0-fast-reference-to-video',
} as const;

const CREDIT_COSTS: Record<string, Record<string, number>> = {
  standard: { '480p': 4.63, '720p': 10 },
  fast: { '480p': 2.5, '720p': 5 },
};

export type StudioMode = 'photo' | 'video';
export type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

export interface StoryboardScene {
  id: string;
  name: string;
  settings: CinemaSettings;
  thumbnailUrl: string | null;
  outputUrl: string | null;
  type: StudioMode;
  createdAt: string;
  referenceUrls?: string[];
}

export interface SelectedAsset {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
}

const STORYBOARD_PHOTO_KEY = 'cinemastudio_storyboard_photo';
const STORYBOARD_VIDEO_KEY = 'cinemastudio_storyboard_video';
const MAX_SCENES = 9;

function createEmptyScenes(type: StudioMode): StoryboardScene[] {
  return Array.from({ length: MAX_SCENES }, (_, i) => ({
    id: `${type}-slot-${i}`,
    name: `Cena ${i + 1}`,
    settings: getDefaultSettings(),
    thumbnailUrl: null,
    outputUrl: null,
    type,
    createdAt: '',
  }));
}

function loadStoryboard(type: StudioMode): StoryboardScene[] {
  const key = type === 'photo' ? STORYBOARD_PHOTO_KEY : STORYBOARD_VIDEO_KEY;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed: StoryboardScene[] = JSON.parse(raw);
      if (parsed.length === MAX_SCENES) return parsed;
    }
  } catch {}
  return createEmptyScenes(type);
}

function saveStoryboard(scenes: StoryboardScene[], type: StudioMode) {
  const key = type === 'photo' ? STORYBOARD_PHOTO_KEY : STORYBOARD_VIDEO_KEY;
  localStorage.setItem(key, JSON.stringify(scenes));
}

export function useCinemaStudio() {
  const { user } = usePremiumStatus();
  const { balance: credits, isLoading: creditsLoading, refetch: refetchCredits, checkBalance } = useCredits();
  const { registerJob, updateJobStatus, clearJob: clearGlobalJob } = useAIJob();
  const { isSubmitting, startSubmit, endSubmit } = useProcessingButton();
  const { isDownloading, progress: downloadProgress, download, cancel: cancelDownload } = useResilientDownload();
  const { getCreditCost } = useAIToolSettings();

  // ━━━ Core State ━━━
  const [mode, setModeRaw] = useState<StudioMode>('photo');
  const [settings, setSettings] = useState<CinemaSettings>(getDefaultSettings());
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [referenceImagePreviews, setReferenceImagePreviews] = useState<string[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<SelectedAsset[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<SelectedAsset | null>(null);

  // Processing
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Photo mode job tracking
  const [photoJobStatus, setPhotoJobStatus] = useState<string>('idle');
  const [queuePosition, setQueuePosition] = useState(0);
  const sessionIdRef = useRef(crypto.randomUUID());

  // Separate storyboards per mode
  const [photoStoryboard, setPhotoStoryboard] = useState<StoryboardScene[]>(() => loadStoryboard('photo'));
  const [videoStoryboard, setVideoStoryboard] = useState<StoryboardScene[]>(() => loadStoryboard('video'));

  // Active storyboard based on current mode
  const storyboard = mode === 'photo' ? photoStoryboard : videoStoryboard;
  const setStoryboard = mode === 'photo' ? setPhotoStoryboard : setVideoStoryboard;

  const [activePhotoSceneId, setActivePhotoSceneId] = useState<string>('photo-slot-0');
  const [activeVideoSceneId, setActiveVideoSceneId] = useState<string>('video-slot-0');
  const activeSceneId = mode === 'photo' ? activePhotoSceneId : activeVideoSceneId;
  const setActiveSceneId = mode === 'photo' ? setActivePhotoSceneId : setActiveVideoSceneId;

  // Wrap setMode to restore scene state when switching
  const setMode = useCallback((newMode: StudioMode) => {
    setModeRaw(newMode);
    // Reset output display when switching modes (jobs keep running in background)
    if (!generatingSceneIdRef.current) {
      setOutputUrl(null);
      setStatus('idle');
      setPhotoJobStatus('idle');
      setProgress(0);
    }
    // Clear file-based references when switching (they belong to the previous mode)
    referenceImagePreviews.forEach(url => URL.revokeObjectURL(url));
    setReferenceImages([]);
    setReferenceImagePreviews([]);
  }, [referenceImagePreviews]);

  const generatingSceneIdRef = useRef<string | null>(null);
  // Track the mode of the active generation (so sync hooks stay alive even if user browses another mode)
  const [generatingMode, setGeneratingMode] = useState<StudioMode | null>(null);
  // Track uploaded reference URLs during generation for saving to scene
  const generatingRefUrlsRef = useRef<string[]>([]);

  // Modals
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [noCreditsReason, setNoCreditsReason] = useState<'not_logged' | 'insufficient'>('insufficient');
  const [showActiveJobModal, setShowActiveJobModal] = useState(false);
  const [activeToolName, setActiveToolName] = useState('');
  const [activeJobIdState, setActiveJobIdState] = useState<string | undefined>();
  const [activeStatusState, setActiveStatusState] = useState<string | undefined>();
  const [showPrompt, setShowPrompt] = useState(false);

  const pollIntervalRef = useRef<number | null>(null);
  const elapsedIntervalRef = useRef<number | null>(null);

  // ━━━ Computed ━━━
  const basePrompt = buildCinemaPrompt(settings, mode);
  const extraParts: string[] = [];
  selectedCharacters.forEach(char => {
    if (char.description) extraParts.push(`character: ${char.description}`);
  });
  if (selectedScenario?.description) extraParts.push(`scenario: ${selectedScenario.description}`);
  const assembledPrompt = extraParts.length > 0 ? `${basePrompt}, ${extraParts.join(', ')}` : basePrompt;

  const hasReferences = referenceImages.length > 0;
  // reference-to-video when any references exist (supports 0-9 images + 0-3 videos + 0-3 audios)
  // text-to-video when no references
  const genType = hasReferences ? 'r2v' : 't2v';
  const modelKey = `${settings.modelSpeed}-${genType}` as keyof typeof MODELS;
  const selectedModel = MODELS[modelKey];
  const costPerSecond = CREDIT_COSTS[settings.modelSpeed][settings.quality] || 10;
  const videoCreditEstimate = Math.ceil(costPerSecond * settings.duration);
  const photoCreditCost = getCreditCost('gerar_imagem', 100);
  const estimatedCredits = mode === 'photo' ? photoCreditCost : videoCreditEstimate;

  const isPhotoProcessing = ['pending', 'starting', 'running', 'queued'].includes(photoJobStatus);
  const isVideoProcessing = status === 'processing' || status === 'uploading';
  const isProcessing = isPhotoProcessing || isVideoProcessing;

  const canGenerate = assembledPrompt.length > 10 && !isSubmitting && !isProcessing;

  // ━━━ Settings updater ━━━
  const updateSettings = useCallback((partial: Partial<CinemaSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, []);

  // ━━━ Reference Images ━━━
  const maxRefImages = mode === 'photo' ? 3 : 9;
  const addReferenceImages = useCallback((files: FileList | null) => {
    if (!files) return;
    const max = maxRefImages - referenceImages.length;
    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    for (let i = 0; i < Math.min(files.length, max); i++) {
      const f = files[i];
      if (!f.type.startsWith('image/')) continue;
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name} excede 10MB`); continue; }
      newFiles.push(f);
      newPreviews.push(URL.createObjectURL(f));
    }
    setReferenceImages(prev => [...prev, ...newFiles]);
    setReferenceImagePreviews(prev => [...prev, ...newPreviews]);
  }, [referenceImages.length, maxRefImages]);

  const removeReferenceImage = useCallback((index: number) => {
    URL.revokeObjectURL(referenceImagePreviews[index]);
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
    setReferenceImagePreviews(prev => prev.filter((_, i) => i !== index));
  }, [referenceImagePreviews]);

  // ━━━ Elapsed timer ━━━
  useEffect(() => {
    if (isProcessing) {
      setElapsedTime(0);
      elapsedIntervalRef.current = window.setInterval(() => setElapsedTime(p => p + 1), 1000);
    } else {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    }
    return () => { if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current); };
  }, [isProcessing]);

  // Progress animation (video mode)
  useEffect(() => {
    if (status !== 'processing') return;
    const iv = setInterval(() => setProgress(p => p >= 90 ? p : p + 1), 3000);
    return () => clearInterval(iv);
  }, [status]);

  // Register job
  useEffect(() => {
    if (jobId && mode === 'video') registerJob(jobId, 'Cinema Studio', 'pending');
  }, [jobId, registerJob, mode]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      referenceImagePreviews.forEach(u => URL.revokeObjectURL(u));
    };
  }, []);

  // Save storyboard
  useEffect(() => { saveStoryboard(photoStoryboard, 'photo'); }, [photoStoryboard]);
  useEffect(() => { saveStoryboard(videoStoryboard, 'video'); }, [videoStoryboard]);

  // ━━━ PHOTO MODE: Job Status Sync (clone from GerarImagemTool) ━━━
  useJobStatusSync({
    jobId: (generatingMode === 'photo' || mode === 'photo') ? jobId : null,
    toolType: 'image_generator',
    enabled: (generatingMode === 'photo') && isPhotoProcessing && !!jobId,
    onStatusChange: (update) => {
      setPhotoJobStatus(update.status);
      if (update.position !== undefined) setQueuePosition(update.position);
      if (update.currentStep) {
        const stepProgress: Record<string, number> = {
          'validating': 10, 'downloading_ref_image_1': 15, 'uploading_ref_image_1': 20,
          'consuming_credits': 30, 'delegating_to_queue': 40, 'starting': 50, 'running': 60,
        };
        setProgress(stepProgress[update.currentStep] || progress);
      }
      if (update.status === 'completed' && update.outputUrl) {
        setOutputUrl(update.outputUrl);
        setStatus('completed');
        setProgress(100);
        refetchCredits();
        toast.success('Imagem gerada com sucesso!');
        // Save to the scene that started the generation
        const targetScene = generatingSceneIdRef.current;
        if (targetScene) {
          setStoryboard(prev => prev.map(s =>
            s.id === targetScene
              ? { ...s, thumbnailUrl: update.outputUrl!, outputUrl: update.outputUrl!, settings: { ...settings }, type: 'photo' as StudioMode, createdAt: new Date().toISOString() }
              : s
          ));
          // If user navigated away, don't overwrite their current view — but if still on same scene, show it
          if (activeSceneId !== targetScene) {
            // User is viewing another scene; result saved silently
          }
        }
        generatingSceneIdRef.current = null;
        setGeneratingMode(null);
      } else if (update.status === 'failed') {
        setStatus('error');
        setErrorMessage(update.errorMessage || 'Erro ao gerar imagem');
        const errInfo = getAIErrorMessage(update.errorMessage || 'Erro desconhecido');
        toast.error(errInfo.message);
        refetchCredits();
        generatingSceneIdRef.current = null;
        setGeneratingMode(null);
      }
    },
    onGlobalStatusChange: (s) => {
      if (jobId) registerJob(jobId, 'image_generator', s);
    },
  });

  // PHOTO MODE: Pending watchdog
  useJobPendingWatchdog({
    jobId: generatingMode === 'photo' ? jobId : null,
    toolType: 'image_generator',
    enabled: generatingMode === 'photo' && photoJobStatus === 'pending',
    onJobFailed: (msg: string) => {
      setPhotoJobStatus('failed');
      setStatus('error');
      setErrorMessage(msg || 'Servidor não respondeu. Tente novamente.');
      refetchCredits();
    },
  });

  // ━━━ VIDEO MODE: Polling ━━━
  const startPolling = useCallback((tId: string, jId: string, creditsToCharge: number) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('seedance-poll', {
          body: { taskId: tId, jobId: jId, creditsToCharge },
        });
        if (error) return;
        if (data.status === 'completed' && data.outputUrl) {
          clearInterval(pollIntervalRef.current!);
          pollIntervalRef.current = null;
          setOutputUrl(data.outputUrl);
          setStatus('completed');
          setProgress(100);
          updateJobStatus('completed');
          refetchCredits();
          toast.success('Geração concluída!');
          // Save to the scene that started the generation
          const targetScene = generatingSceneIdRef.current;
          if (targetScene) {
            setStoryboard(prev => prev.map(s =>
              s.id === targetScene
                ? { ...s, thumbnailUrl: data.outputUrl, outputUrl: data.outputUrl, settings: { ...settings }, type: 'video' as StudioMode, createdAt: new Date().toISOString() }
                : s
            ));
          }
          generatingSceneIdRef.current = null;
          setGeneratingMode(null);
        } else if (data.status === 'failed') {
          clearInterval(pollIntervalRef.current!);
          pollIntervalRef.current = null;
          setStatus('error');
          setErrorMessage(data.error || 'Falha na geração');
          updateJobStatus('failed');
          toast.error('Erro na geração');
          endSubmit();
          generatingSceneIdRef.current = null;
          setGeneratingMode(null);
        } else if (data.progress) {
          setProgress(prev => Math.max(prev, data.progress));
        }
      } catch (err) { console.error('[CinemaStudio] Poll error:', err); }
    }, 5000);
  }, [endSubmit, refetchCredits, updateJobStatus]);

  // ━━━ Generate ━━━
  const handleGenerate = async () => {
    if (!startSubmit()) return;

    if (!user?.id) {
      setNoCreditsReason('not_logged');
      setShowNoCreditsModal(true);
      endSubmit();
      return;
    }

    const activeCheck = await checkActiveJob(user.id);
    if (activeCheck.hasActiveJob && activeCheck.activeTool) {
      setActiveToolName(activeCheck.activeTool);
      setActiveJobIdState(activeCheck.activeJobId);
      setActiveStatusState(activeCheck.activeStatus);
      setShowActiveJobModal(true);
      endSubmit();
      return;
    }

    const freshCredits = await checkBalance();
    if (freshCredits < estimatedCredits) {
      setNoCreditsReason('insufficient');
      setShowNoCreditsModal(true);
      endSubmit();
      return;
    }

    if (mode === 'photo') {
      await handleGeneratePhoto();
    } else {
      await handleGenerateVideo();
    }
  };

  // ━━━ PHOTO: Generate via RunningHub image_generator (clone) ━━━
  const handleGeneratePhoto = async () => {
    setErrorMessage(null);
    setStatus('uploading');
    setPhotoJobStatus('pending');
    setProgress(5);
    generatingSceneIdRef.current = activeSceneId;
    setGeneratingMode('photo');

    try {
      // Collect and optimize all reference images
      const uploadedUrls: string[] = [];

      // 1. User reference images
      for (let i = 0; i < referenceImages.length; i++) {
        toast.info(`Otimizando imagem ${i + 1}/${referenceImages.length}...`);
        const optimized = await optimizeForAI(referenceImages[i]);
        const uploadResult = await uploadToStorageJM(optimized.file, 'image-generator', user!.id);
        if (!uploadResult.url) throw new Error(`Falha ao enviar imagem ${i + 1}`);
        uploadedUrls.push(uploadResult.url);
        setProgress(5 + Math.round((i + 1) / Math.max(referenceImages.length, 1) * 10));
      }

      // 2. Character images (already hosted in cinema-assets)
      selectedCharacters.forEach(char => {
        if (char.image_url) uploadedUrls.push(char.image_url);
      });

      // 3. Scenario image (already hosted in cinema-assets)
      if (selectedScenario?.image_url) {
        uploadedUrls.push(selectedScenario.image_url);
      }

      setProgress(20);

      // Create job in image_generator_jobs (exact same as GerarImagemTool)
      const { jobId: newJobId, error: createError } = await createJob('image_generator', user!.id, sessionIdRef.current, {
        prompt: assembledPrompt,
        aspect_ratio: settings.aspectRatio,
        model: 'runninghub',
        input_urls: uploadedUrls,
      });

      if (createError || !newJobId) {
        throw new Error(createError || 'Falha ao criar job');
      }

      setJobId(newJobId);
      registerJob(newJobId, 'image_generator', 'pending');
      setProgress(30);

      // Start job via edge function (exact same as GerarImagemTool)
      const result = await startJob('image_generator', newJobId, {
        referenceImageUrls: uploadedUrls,
        aspectRatio: settings.aspectRatio,
        creditCost: photoCreditCost,
        prompt: assembledPrompt,
        source: 'cinema_studio_photo',
      });

      if (!result.success) {
        if (result.code === 'INSUFFICIENT_CREDITS') {
          setNoCreditsReason('insufficient');
          setShowNoCreditsModal(true);
          resetTool();
        } else {
          setStatus('error');
          setPhotoJobStatus('failed');
          setErrorMessage(result.error || 'Erro desconhecido');
          const errInfo = getAIErrorMessage(result.error || 'Erro desconhecido');
          toast.error(errInfo.message);
        }
        endSubmit();
        return;
      }

      if (result.queued) {
        setPhotoJobStatus('queued');
        setQueuePosition(result.position || 0);
        toast.info(`Na fila — posição ${result.position}`);
      }

      setStatus('processing');
      // useJobStatusSync handles the rest automatically

    } catch (error: any) {
      console.error('[CinemaStudio Photo] Error:', error);
      setStatus('error');
      setPhotoJobStatus('failed');
      setErrorMessage(error.message || 'Erro ao gerar imagem');
      const errInfo = getAIErrorMessage(error.message || 'Erro desconhecido');
      toast.error(errInfo.message);
      generatingSceneIdRef.current = null;
      setGeneratingMode(null);

      if (jobId) {
        try {
          await supabase.rpc('mark_pending_job_as_failed' as any, { p_table_name: 'image_generator_jobs', p_job_id: jobId });
        } catch {}
      }
    } finally {
      endSubmit();
    }
  };

  // ━━━ VIDEO: Generate via Seedance (existing flow, untouched) ━━━
  const handleGenerateVideo = async () => {
    setErrorMessage(null);
    setStatus('uploading');
    setProgress(5);
    generatingSceneIdRef.current = activeSceneId;
    setGeneratingMode('video');

    try {
      const timestamp = Date.now();
      const folder = `seedance/${user!.id}/${timestamp}`;
      const uploadedImageUrls: string[] = [];

      if (referenceImages.length > 0) {
        setProgress(10);
        for (const file of referenceImages) {
          const result = await uploadToStorageLegacy(file, folder);
          if (result.success && result.url) uploadedImageUrls.push(result.url);
          else throw new Error(`Upload failed: ${result.error}`);
        }
      }

      // Add character and scenario image URLs (already hosted)
      selectedCharacters.forEach(char => {
        if (char.image_url) uploadedImageUrls.push(char.image_url);
      });
      if (selectedScenario?.image_url) uploadedImageUrls.push(selectedScenario.image_url);

      setProgress(30);

      // Translate prompt to Chinese for better Seedance efficiency
      toast.info('Traduzindo prompt para chinês...');
      const finalPrompt = await translatePromptToChinese(assembledPrompt);
      console.log('[CinemaStudio] Original prompt:', assembledPrompt.substring(0, 100));
      console.log('[CinemaStudio] Chinese prompt:', finalPrompt.substring(0, 100));

      setProgress(35);

      const { data: job, error: jobError } = await supabase
        .from('seedance_jobs')
        .insert({
          user_id: user!.id,
          model: selectedModel,
          prompt: finalPrompt,
          duration: settings.duration,
          quality: settings.quality,
          aspect_ratio: settings.aspectRatio,
          generate_audio: settings.generateAudio,
          input_image_urls: uploadedImageUrls.length > 0 ? uploadedImageUrls : null,
          status: 'pending',
        })
        .select()
        .single();

      if (jobError || !job) throw new Error('Erro ao criar job: ' + (jobError?.message || 'Unknown'));
      setJobId(job.id);
      setProgress(40);

      const { data: response, error: fnError } = await supabase.functions.invoke('seedance-generate', {
        body: {
          model: selectedModel,
          prompt: finalPrompt,
          imageUrls: uploadedImageUrls,
          videoUrls: [],
          audioUrls: [],
          duration: settings.duration,
          quality: settings.quality,
          aspectRatio: settings.aspectRatio,
          generateAudio: settings.generateAudio,
          jobId: job.id,
        },
      });

      if (fnError) throw new Error('Erro na função: ' + fnError.message);
      if (!response?.success) throw new Error(response?.error || 'Erro desconhecido');

      setTaskId(response.taskId);
      setProgress(50);
      setStatus('processing');
      startPolling(response.taskId, job.id, estimatedCredits);

    } catch (error: any) {
      console.error('[CinemaStudio] Error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Erro desconhecido');
      toast.error('Erro ao gerar');
      endSubmit();
      generatingSceneIdRef.current = null;
      setGeneratingMode(null);
    }
  };

  // ━━━ Download ━━━
  const downloadResult = useCallback(async () => {
    if (!outputUrl) return;
    const isPhoto = mode === 'photo';
    await download({
      url: outputUrl,
      filename: `cinema-studio-${Date.now()}.${isPhoto ? 'png' : 'mp4'}`,
      mediaType: isPhoto ? 'image' : 'video',
      timeout: 30000,
      onSuccess: () => toast.success('Download concluído!'),
      locale: 'pt',
    });
  }, [outputUrl, download, mode]);

  // ━━━ Reset ━━━
  const resetTool = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setStatus('idle');
    setPhotoJobStatus('idle');
    setProgress(0);
    setOutputUrl(null);
    setErrorMessage(null);
    setJobId(null);
    setTaskId(null);
    setElapsedTime(0);
    setQueuePosition(0);
    endSubmit();
    clearGlobalJob();
    generatingSceneIdRef.current = null;
    setGeneratingMode(null);
  }, [endSubmit, clearGlobalJob]);

  // ━━━ Cancel ━━━
  const cancelGeneration = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setStatus('idle');
    setPhotoJobStatus('idle');
    setProgress(0);
    endSubmit();
    clearGlobalJob();
    generatingSceneIdRef.current = null;
    setGeneratingMode(null);
    toast.info('Geração cancelada');
  }, [endSubmit, clearGlobalJob]);

  // ━━━ Storyboard ━━━
  // Auto-save is now handled directly in the completion callbacks (useJobStatusSync + startPolling)
  // so this useEffect is no longer needed.

  const addToStoryboard = useCallback(() => {
    // no-op — auto-saved now
  }, []);

  const removeFromStoryboard = useCallback((id: string) => {
    // Clear slot instead of removing
    setStoryboard(prev => prev.map(s =>
      s.id === id
        ? { ...s, thumbnailUrl: null, outputUrl: null, createdAt: '' }
        : s
    ));
    if (activeSceneId === id) {
      setOutputUrl(null);
      setStatus('idle');
      setPhotoJobStatus('idle');
    }
  }, [activeSceneId]);

  const loadScene = useCallback((id: string) => {
    const scene = storyboard.find(s => s.id === id);
    if (!scene) return;

    const isGenerating = !!generatingSceneIdRef.current;
    const switchingToGeneratingScene = generatingSceneIdRef.current === id;

    setActiveSceneId(id);

    if (switchingToGeneratingScene) {
      // Returning to the scene that is actively generating — restore processing UI
      // Don't touch status/progress/jobId — they're still live
      setOutputUrl(null);
      return;
    }

    if (scene.outputUrl) {
      // Show saved result (only change UI state, don't kill job)
      setOutputUrl(scene.outputUrl);
      if (!isGenerating) {
        setStatus('completed');
        setProgress(100);
      }
      setSettings(scene.settings);
      setMode(scene.type);
    } else {
      // Empty slot — show idle UI but don't kill active job
      setOutputUrl(null);
      if (!isGenerating) {
        setStatus('idle');
        setPhotoJobStatus('idle');
        setProgress(0);
      }
    }
  }, [storyboard]);

  const addNewScene = useCallback(() => {
    // Find first empty slot
    const emptySlot = storyboard.find(s => !s.outputUrl);
    if (emptySlot) {
      setActiveSceneId(emptySlot.id);
      setOutputUrl(null);
      setStatus('idle');
      setPhotoJobStatus('idle');
      setProgress(0);
    } else {
      toast.error('Todas as 10 cenas estão ocupadas. Limpe uma para continuar.');
    }
  }, [storyboard]);

  // ━━━ Animate All Scenes → Video Mode ━━━
  const animateAllScenes = useCallback(async () => {
    const generated = storyboard.filter(s => !!s.outputUrl);
    if (generated.length === 0) {
      toast.error('Nenhuma cena gerada para animar.');
      return;
    }

    // Clear current video references
    referenceImagePreviews.forEach(url => URL.revokeObjectURL(url));
    setReferenceImages([]);
    setReferenceImagePreviews([]);

    // Fetch scene images as File objects and create previews (max 9 for video)
    const scenesToUse = generated.slice(0, 9);
    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const scene of scenesToUse) {
      try {
        const response = await fetch(scene.outputUrl!);
        const blob = await response.blob();
        const file = new File([blob], `${scene.name}.png`, { type: blob.type || 'image/png' });
        newFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      } catch {
        // Skip failed fetches
        console.warn(`Failed to fetch scene image: ${scene.name}`);
      }
    }

    if (newFiles.length === 0) {
      toast.error('Não foi possível carregar as imagens das cenas.');
      return;
    }

    // Switch to video mode with images as references
    setMode('video');
    setReferenceImages(newFiles);
    setReferenceImagePreviews(newPreviews);
    setOutputUrl(null);
    setStatus('idle');
    setProgress(0);
    toast.success(`${newFiles.length} cena(s) carregada(s) como referência de vídeo`);
  }, [storyboard, referenceImagePreviews]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return {
    // State
    mode, setMode,
    settings, updateSettings,
    referenceImages, referenceImagePreviews, maxRefImages,
    addReferenceImages, removeReferenceImage,
    selectedCharacters, setSelectedCharacters,
    selectedScenario, setSelectedScenario,
    status, progress, outputUrl, errorMessage,
    elapsedTime, isProcessing, isSubmitting,
    credits, creditsLoading,
    assembledPrompt, estimatedCredits,
    canGenerate, showPrompt, setShowPrompt,

    // Actions
    handleGenerate, downloadResult, resetTool, cancelGeneration,

    // Storyboard
    storyboard, activeSceneId,
    addToStoryboard, removeFromStoryboard, loadScene, addNewScene, animateAllScenes,

    // Modals
    showNoCreditsModal, setShowNoCreditsModal, noCreditsReason,
    showActiveJobModal, setShowActiveJobModal, activeToolName,
    activeJobIdState, activeStatusState,

    // Download
    isDownloading, downloadProgress, cancelDownload,

    // Utils
    formatTime,
    user,
  };
}
