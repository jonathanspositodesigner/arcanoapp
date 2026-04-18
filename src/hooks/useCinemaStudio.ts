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
  selectedCharacters?: SelectedAsset[];
  selectedScenario?: SelectedAsset | null;
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

function revokeObjectUrls(urls: string[]) {
  urls.forEach(url => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  });
}

function uniqueUrls(urls: string[]) {
  return Array.from(new Set(urls.filter(Boolean)));
}

function getSceneTypeFromId(sceneId: string): StudioMode {
  return sceneId.startsWith('video-') ? 'video' : 'photo';
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

  const generatingSceneIdRef = useRef<string | null>(null);
  // Track the mode of the active generation (so sync hooks stay alive even if user browses another mode)
  const [generatingMode, setGeneratingMode] = useState<StudioMode | null>(null);
  // Track uploaded reference URLs during generation for saving to scene
  const generatingRefUrlsRef = useRef<string[]>([]);
  const generatingSceneStateRef = useRef<{
    settings: CinemaSettings;
    selectedCharacters: SelectedAsset[];
    selectedScenario: SelectedAsset | null;
  } | null>(null);
  const localReferenceFilesRef = useRef<Record<string, File[]>>({});
  const localReferencePreviewUrlsRef = useRef<Record<string, string[]>>({});

  const updateSceneInStoryboard = useCallback((sceneId: string, updater: (scene: StoryboardScene) => StoryboardScene) => {
    const sceneType = getSceneTypeFromId(sceneId);
    const setScenes = sceneType === 'photo' ? setPhotoStoryboard : setVideoStoryboard;
    setScenes(prev => prev.map(scene => (
      scene.id === sceneId ? updater(scene) : scene
    )));
  }, []);

  const hydrateSceneEditor = useCallback((
    sceneId: string,
    sceneType: StudioMode,
    sourceStoryboard?: StoryboardScene[],
    options?: { preserveProcessing?: boolean },
  ) => {
    const fallbackScene = createEmptyScenes(sceneType).find(scene => scene.id === sceneId) ?? createEmptyScenes(sceneType)[0];
    const storyboardForType = sourceStoryboard ?? (sceneType === 'photo' ? photoStoryboard : videoStoryboard);
    const scene = storyboardForType.find(item => item.id === sceneId) ?? fallbackScene;
    const localFiles = localReferenceFilesRef.current[sceneId] ?? [];
    const localPreviews = localReferencePreviewUrlsRef.current[sceneId] ?? [];

    setReferenceImages([...localFiles]);
    setReferenceImagePreviews([...(scene.referenceUrls ?? []), ...localPreviews]);
    setSettings(scene.settings);
    setSelectedCharacters([...(scene.selectedCharacters ?? [])]);
    setSelectedScenario(scene.selectedScenario ?? null);

    if (options?.preserveProcessing) {
      setOutputUrl(null);
      return;
    }

    if (scene.outputUrl) {
      setOutputUrl(scene.outputUrl);
      if (!generatingSceneIdRef.current) {
        setStatus('completed');
        setProgress(100);
      }
      return;
    }

    setOutputUrl(null);
    if (!generatingSceneIdRef.current) {
      setStatus('idle');
      setPhotoJobStatus('idle');
      setProgress(0);
    }
  }, [photoStoryboard, videoStoryboard]);

  const buildActiveSceneSnapshot = useCallback(() => {
    const currentStoryboard = mode === 'photo' ? photoStoryboard : videoStoryboard;
    const existingScene = currentStoryboard.find(scene => scene.id === activeSceneId);
    if (!existingScene) return null;

    const nextOutputUrl = outputUrl ?? existingScene.outputUrl;

    return {
      ...existingScene,
      settings: { ...settings },
      thumbnailUrl: nextOutputUrl ?? existingScene.thumbnailUrl,
      outputUrl: nextOutputUrl,
      referenceUrls: uniqueUrls(referenceImagePreviews.filter(url => !url.startsWith('blob:'))),
      selectedCharacters: selectedCharacters.map(character => ({ ...character })),
      selectedScenario: selectedScenario ? { ...selectedScenario } : null,
      createdAt: nextOutputUrl ? (existingScene.createdAt || new Date().toISOString()) : existingScene.createdAt,
    } satisfies StoryboardScene;
  }, [
    activeSceneId,
    mode,
    outputUrl,
    photoStoryboard,
    referenceImagePreviews,
    selectedCharacters,
    selectedScenario,
    settings,
    videoStoryboard,
  ]);

  const getSyncedStoryboards = useCallback(() => {
    const snapshot = buildActiveSceneSnapshot();

    if (!snapshot) {
      return {
        photoScenes: photoStoryboard,
        videoScenes: videoStoryboard,
        snapshot: null as StoryboardScene | null,
      };
    }

    return {
      photoScenes: mode === 'photo'
        ? photoStoryboard.map(scene => (scene.id === activeSceneId ? snapshot : scene))
        : photoStoryboard,
      videoScenes: mode === 'video'
        ? videoStoryboard.map(scene => (scene.id === activeSceneId ? snapshot : scene))
        : videoStoryboard,
      snapshot,
    };
  }, [activeSceneId, buildActiveSceneSnapshot, mode, photoStoryboard, videoStoryboard]);

  const syncCurrentSceneToStoryboard = useCallback(() => {
    localReferenceFilesRef.current[activeSceneId] = [...referenceImages];
    localReferencePreviewUrlsRef.current[activeSceneId] = referenceImagePreviews.filter(url => url.startsWith('blob:'));

    const { photoScenes, videoScenes, snapshot } = getSyncedStoryboards();
    if (!snapshot) return { photoScenes, videoScenes };

    const currentScene = (mode === 'photo' ? photoStoryboard : videoStoryboard)
      .find(scene => scene.id === activeSceneId);

    if (currentScene && JSON.stringify(currentScene) !== JSON.stringify(snapshot)) {
      if (mode === 'photo') {
        setPhotoStoryboard(photoScenes);
      } else {
        setVideoStoryboard(videoScenes);
      }
    }

    return { photoScenes, videoScenes };
  }, [
    activeSceneId,
    getSyncedStoryboards,
    mode,
    photoStoryboard,
    referenceImagePreviews,
    referenceImages,
    videoStoryboard,
  ]);

  // Wrap setMode to restore scene state when switching
  const setMode = useCallback((newMode: StudioMode) => {
    if (newMode === mode) return;
    syncCurrentSceneToStoryboard();
    setModeRaw(newMode);
    const targetSceneId = newMode === 'photo' ? activePhotoSceneId : activeVideoSceneId;
    hydrateSceneEditor(targetSceneId, newMode);
  }, [activePhotoSceneId, activeVideoSceneId, hydrateSceneEditor, mode, syncCurrentSceneToStoryboard]);

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

  const hasReferences = referenceImages.length > 0 || referenceImagePreviews.length > 0;
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
    const max = maxRefImages - referenceImagePreviews.length;
    if (max <= 0) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    for (let i = 0; i < Math.min(files.length, max); i++) {
      const f = files[i];
      if (!f.type.startsWith('image/')) continue;
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name} excede 10MB`); continue; }
      newFiles.push(f);
      newPreviews.push(URL.createObjectURL(f));
    }

    localReferenceFilesRef.current[activeSceneId] = [
      ...(localReferenceFilesRef.current[activeSceneId] ?? []),
      ...newFiles,
    ];
    localReferencePreviewUrlsRef.current[activeSceneId] = [
      ...(localReferencePreviewUrlsRef.current[activeSceneId] ?? []),
      ...newPreviews,
    ];

    setReferenceImages(prev => [...prev, ...newFiles]);
    setReferenceImagePreviews(prev => [...prev, ...newPreviews]);
  }, [activeSceneId, maxRefImages, referenceImagePreviews.length]);

  const removeReferenceImage = useCallback((index: number) => {
    const sceneId = activeSceneId;
    const persistedReferences = storyboard.find(scene => scene.id === sceneId)?.referenceUrls ?? [];

    if (index < persistedReferences.length) {
      updateSceneInStoryboard(sceneId, scene => ({
        ...scene,
        referenceUrls: (scene.referenceUrls ?? []).filter((_, itemIndex) => itemIndex !== index),
      }));
    } else {
      const localIndex = index - persistedReferences.length;
      const localPreviews = localReferencePreviewUrlsRef.current[sceneId] ?? [];
      const localFiles = localReferenceFilesRef.current[sceneId] ?? [];
      revokeObjectUrls([localPreviews[localIndex] ?? '']);
      localReferencePreviewUrlsRef.current[sceneId] = localPreviews.filter((_, itemIndex) => itemIndex !== localIndex);
      localReferenceFilesRef.current[sceneId] = localFiles.filter((_, itemIndex) => itemIndex !== localIndex);
      setReferenceImages(localReferenceFilesRef.current[sceneId]);
    }

    setReferenceImagePreviews(prev => prev.filter((_, i) => i !== index));
  }, [activeSceneId, storyboard, updateSceneInStoryboard]);

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
      revokeObjectUrls(Object.values(localReferencePreviewUrlsRef.current).flat());
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
            const generatedSceneState = generatingSceneStateRef.current;
            updateSceneInStoryboard(targetScene, scene => ({
              ...scene,
              thumbnailUrl: update.outputUrl!,
              outputUrl: update.outputUrl!,
              settings: generatedSceneState?.settings ?? scene.settings,
              createdAt: new Date().toISOString(),
              referenceUrls: uniqueUrls(generatingRefUrlsRef.current),
              selectedCharacters: generatedSceneState?.selectedCharacters ?? scene.selectedCharacters ?? [],
              selectedScenario: generatedSceneState?.selectedScenario ?? scene.selectedScenario ?? null,
            }));
          // If user navigated away, don't overwrite their current view — but if still on same scene, show it
          if (activeSceneId !== targetScene) {
            // User is viewing another scene; result saved silently
          }
        }
        generatingSceneIdRef.current = null;
          generatingSceneStateRef.current = null;
        setGeneratingMode(null);
      } else if (update.status === 'failed') {
        setStatus('error');
        setErrorMessage(update.errorMessage || 'Erro ao gerar imagem');
        const errInfo = getAIErrorMessage(update.errorMessage || 'Erro desconhecido');
        toast.error(errInfo.message);
        refetchCredits();
        generatingSceneIdRef.current = null;
          generatingSceneStateRef.current = null;
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

  const getValidAccessToken = useCallback(async (): Promise<string> => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.access_token) return sessionData.session.access_token;

    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session?.access_token) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    return refreshed.session.access_token;
  }, []);

  // ━━━ VIDEO MODE: Polling ━━━
  const startPolling = useCallback((tId: string, jId: string, creditsToCharge: number) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const accessToken = await getValidAccessToken();
        const { data, error } = await supabase.functions.invoke('seedance-poll', {
          body: { taskId: tId, jobId: jId, creditsToCharge },
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (error) {
          const errMsg = error.message || 'Erro ao consultar geração';
          if (errMsg.includes('Invalid token') || errMsg.includes('JWT') || errMsg.includes('401')) {
            clearInterval(pollIntervalRef.current!);
            pollIntervalRef.current = null;
            setStatus('error');
            setErrorMessage('Sessão expirada. Faça login novamente para acompanhar a geração.');
            updateJobStatus('failed');
            toast.error('Sessão expirada. Faça login novamente.');
            endSubmit();
            generatingSceneIdRef.current = null;
            generatingSceneStateRef.current = null;
            setGeneratingMode(null);
          }
          return;
        }

        if (data.status === 'completed' && data.outputUrl) {
          clearInterval(pollIntervalRef.current!);
          pollIntervalRef.current = null;
          setOutputUrl(data.outputUrl);
          setStatus('completed');
          setProgress(100);
          updateJobStatus('completed');
          refetchCredits();
          toast.success('Geração concluída!');
          const targetScene = generatingSceneIdRef.current;
          if (targetScene) {
            const generatedSceneState = generatingSceneStateRef.current;
            updateSceneInStoryboard(targetScene, scene => ({
              ...scene,
              thumbnailUrl: data.outputUrl,
              outputUrl: data.outputUrl,
              settings: generatedSceneState?.settings ?? scene.settings,
              createdAt: new Date().toISOString(),
              referenceUrls: uniqueUrls(generatingRefUrlsRef.current),
              selectedCharacters: generatedSceneState?.selectedCharacters ?? scene.selectedCharacters ?? [],
              selectedScenario: generatedSceneState?.selectedScenario ?? scene.selectedScenario ?? null,
            }));
          }
          generatingSceneIdRef.current = null;
          generatingSceneStateRef.current = null;
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
          generatingSceneStateRef.current = null;
          setGeneratingMode(null);
        } else if (data.progress) {
          setProgress(prev => Math.max(prev, data.progress));
        }
      } catch (err: any) {
        if (err?.message?.includes('Sessão expirada')) {
          clearInterval(pollIntervalRef.current!);
          pollIntervalRef.current = null;
          setStatus('error');
          setErrorMessage('Sessão expirada. Faça login novamente para acompanhar a geração.');
          updateJobStatus('failed');
          toast.error('Sessão expirada. Faça login novamente.');
          endSubmit();
          generatingSceneIdRef.current = null;
          generatingSceneStateRef.current = null;
          setGeneratingMode(null);
          return;
        }

        console.error('[CinemaStudio] Poll error:', err);
      }
    }, 5000);
  }, [endSubmit, getValidAccessToken, refetchCredits, updateJobStatus]);

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
    generatingSceneStateRef.current = {
      settings: { ...settings },
      selectedCharacters: selectedCharacters.map(character => ({ ...character })),
      selectedScenario: selectedScenario ? { ...selectedScenario } : null,
    };

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < referenceImages.length; i++) {
        toast.info(`Otimizando imagem ${i + 1}/${referenceImages.length}...`);
        const optimized = await optimizeForAI(referenceImages[i]);
        const uploadResult = await uploadToStorageJM(optimized.file, 'image-generator', user!.id);
        if (!uploadResult.url) throw new Error(`Falha ao enviar imagem ${i + 1}`);
        uploadedUrls.push(uploadResult.url);
        setProgress(5 + Math.round((i + 1) / Math.max(referenceImages.length, 1) * 10));
      }

      referenceImagePreviews.filter(url => !url.startsWith('blob:')).forEach(url => uploadedUrls.push(url));

      selectedCharacters.forEach(char => {
        if (char.image_url) uploadedUrls.push(char.image_url);
      });

      if (selectedScenario?.image_url) {
        uploadedUrls.push(selectedScenario.image_url);
      }

      generatingRefUrlsRef.current = uniqueUrls(uploadedUrls);
      setProgress(20);

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

    } catch (error: any) {
      console.error('[CinemaStudio Photo] Error:', error);
      setStatus('error');
      setPhotoJobStatus('failed');
      setErrorMessage(error.message || 'Erro ao gerar imagem');
      const errInfo = getAIErrorMessage(error.message || 'Erro desconhecido');
      toast.error(errInfo.message);
      generatingSceneIdRef.current = null;
      generatingSceneStateRef.current = null;
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

  // ━━━ VIDEO: Generate via Seedance (hardened flow) ━━━
  const handleGenerateVideo = async () => {
    setErrorMessage(null);
    setStatus('uploading');
    setProgress(5);
    generatingSceneIdRef.current = activeSceneId;
    setGeneratingMode('video');
    generatingSceneStateRef.current = {
      settings: { ...settings },
      selectedCharacters: selectedCharacters.map(character => ({ ...character })),
      selectedScenario: selectedScenario ? { ...selectedScenario } : null,
    };

    let createdJobId: string | null = null;

    try {
      await getValidAccessToken();

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

      referenceImagePreviews.filter(url => !url.startsWith('blob:')).forEach(url => uploadedImageUrls.push(url));

      selectedCharacters.forEach(char => {
        if (char.image_url) uploadedImageUrls.push(char.image_url);
      });
      if (selectedScenario?.image_url) uploadedImageUrls.push(selectedScenario.image_url);

      generatingRefUrlsRef.current = uniqueUrls(uploadedImageUrls);
      setProgress(30);

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
          status: 'queued',
        })
        .select()
        .single();

      if (jobError || !job) throw new Error('Erro ao criar job: ' + (jobError?.message || 'Unknown'));
      createdJobId = job.id;
      setJobId(job.id);
      setProgress(40);

      let response: any = null;
      let fnError: any = null;
      for (let attempt = 0; attempt <= 2; attempt++) {
        const accessToken = await getValidAccessToken();
        const result = await supabase.functions.invoke('seedance-generate', {
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
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        response = result.data;
        fnError = result.error;
        if (response?.success || response?.error) break;
        const isNetworkErr = !response && fnError && (
          fnError.message?.includes('non-2xx') ||
          fnError.message?.includes('Failed to fetch') ||
          fnError.message?.includes('FunctionsFetchError')
        );
        if (isNetworkErr && attempt < 2) {
          console.warn(`[CinemaStudio] seedance-generate retry ${attempt + 1}/2`);
          await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
          continue;
        }
        break;
      }

      if (fnError && !response?.success) {
        const errDetail = response?.error || fnError.message || 'Erro desconhecido';
        throw new Error(errDetail.includes('Service busy') ? 'Servidores ocupados. Tente novamente em alguns minutos.' : errDetail);
      }
      if (!response?.success) throw new Error(response?.error || 'Erro desconhecido');

      setTaskId(response.taskId || null);
      setProgress(50);
      setStatus('processing');
      startPolling(response.taskId, job.id, estimatedCredits);

    } catch (error: any) {
      console.error('[CinemaStudio] Error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Erro desconhecido');
      toast.error(error.message || 'Erro ao gerar');
      if (createdJobId) {
        try {
          await supabase.from('seedance_jobs').update({
            status: 'failed',
            error_message: error.message || 'Client-side error',
          }).eq('id', createdJobId);
        } catch (_) {}
      }
      endSubmit();
      generatingSceneIdRef.current = null;
      generatingSceneStateRef.current = null;
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
    generatingSceneStateRef.current = null;
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
    generatingSceneStateRef.current = null;
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
    revokeObjectUrls(localReferencePreviewUrlsRef.current[id] ?? []);
    localReferenceFilesRef.current[id] = [];
    localReferencePreviewUrlsRef.current[id] = [];

    updateSceneInStoryboard(id, scene => ({
      ...scene,
      settings: getDefaultSettings(),
      thumbnailUrl: null,
      outputUrl: null,
      createdAt: '',
      referenceUrls: [],
      selectedCharacters: [],
      selectedScenario: null,
    }));

    if (activeSceneId === id) {
      setReferenceImages([]);
      setReferenceImagePreviews([]);
      setSelectedCharacters([]);
      setSelectedScenario(null);
      setSettings(getDefaultSettings());
      setOutputUrl(null);
      setStatus('idle');
      setPhotoJobStatus('idle');
    }
  }, [activeSceneId, updateSceneInStoryboard]);

  const loadScene = useCallback((id: string) => {
    const scene = storyboard.find(s => s.id === id);
    if (!scene) return;

    const switchingToGeneratingScene = generatingSceneIdRef.current === id;

    syncCurrentSceneToStoryboard();
    setActiveSceneId(id);
    hydrateSceneEditor(id, mode, storyboard, { preserveProcessing: switchingToGeneratingScene });
  }, [hydrateSceneEditor, mode, setActiveSceneId, storyboard, syncCurrentSceneToStoryboard]);

  // ━━━ Restore storyboard from saved project ━━━
  const normalizeRestoredStoryboards = useCallback((scenes: StoryboardScene[]) => {
    const photoScenes = scenes.filter(scene => scene.type === 'photo');
    const videoScenes = scenes.filter(scene => scene.type === 'video');
    const hasTypedScenes = photoScenes.length > 0 || videoScenes.length > 0;

    const padScenes = (items: StoryboardScene[], type: StudioMode): StoryboardScene[] => {
      const emptyScenes = createEmptyScenes(type);
      return emptyScenes.map((slot, index) => items[index] ? { ...items[index], id: slot.id } : slot);
    };

    return hasTypedScenes
      ? {
          photoScenes: padScenes(photoScenes, 'photo'),
          videoScenes: padScenes(videoScenes, 'video'),
        }
      : {
          photoScenes: padScenes(scenes, 'photo'),
          videoScenes: createEmptyScenes('video'),
        };
  }, []);

  const restoreProjectState = useCallback((projectState: {
    scenes: StoryboardScene[];
    activeMode?: StudioMode;
    activePhotoSceneId?: string | null;
    activeVideoSceneId?: string | null;
  }) => {
    revokeObjectUrls(Object.values(localReferencePreviewUrlsRef.current).flat());
    localReferenceFilesRef.current = {};
    localReferencePreviewUrlsRef.current = {};

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }

    const { photoScenes, videoScenes } = normalizeRestoredStoryboards(projectState.scenes);
    const requestedPhotoSceneId = projectState.activePhotoSceneId ?? 'photo-slot-0';
    const requestedVideoSceneId = projectState.activeVideoSceneId ?? 'video-slot-0';
    const nextPhotoSceneId = photoScenes.some(scene => scene.id === requestedPhotoSceneId)
      ? requestedPhotoSceneId
      : 'photo-slot-0';
    const nextVideoSceneId = videoScenes.some(scene => scene.id === requestedVideoSceneId)
      ? requestedVideoSceneId
      : 'video-slot-0';
    const nextMode = projectState.activeMode === 'video' ? 'video' : 'photo';
    const targetSceneId = nextMode === 'video' ? nextVideoSceneId : nextPhotoSceneId;
    const targetStoryboard = nextMode === 'video' ? videoScenes : photoScenes;

    generatingSceneIdRef.current = null;
    generatingSceneStateRef.current = null;
    generatingRefUrlsRef.current = [];
    setGeneratingMode(null);
    setPhotoStoryboard(photoScenes);
    setVideoStoryboard(videoScenes);
    setActivePhotoSceneId(nextPhotoSceneId);
    setActiveVideoSceneId(nextVideoSceneId);
    setModeRaw(nextMode);
    setJobId(null);
    setTaskId(null);
    setQueuePosition(0);
    setElapsedTime(0);
    setErrorMessage(null);
    setOutputUrl(null);
    setStatus('idle');
    setPhotoJobStatus('idle');
    setProgress(0);
    hydrateSceneEditor(targetSceneId, nextMode, targetStoryboard);
  }, [hydrateSceneEditor, normalizeRestoredStoryboards]);

  const restoreStoryboard = useCallback((scenes: StoryboardScene[]) => {
    restoreProjectState({ scenes });
  }, [restoreProjectState]);

  const addNewScene = useCallback(() => {
    // Find first empty slot
    const emptySlot = storyboard.find(s => !s.outputUrl);
    if (emptySlot) {
      syncCurrentSceneToStoryboard();
      setActiveSceneId(emptySlot.id);
      hydrateSceneEditor(emptySlot.id, mode, storyboard);
    } else {
      toast.error('Todas as 10 cenas estão ocupadas. Limpe uma para continuar.');
    }
  }, [hydrateSceneEditor, mode, storyboard, syncCurrentSceneToStoryboard]);

  // ━━━ Animate All Scenes → Video Mode ━━━
  const animateAllScenes = useCallback(async () => {
    const generated = storyboard.filter(s => !!s.outputUrl);
    if (generated.length === 0) {
      toast.error('Nenhuma cena gerada para animar.');
      return;
    }

    const targetSceneId = activeVideoSceneId;
    revokeObjectUrls(localReferencePreviewUrlsRef.current[targetSceneId] ?? []);
    localReferenceFilesRef.current[targetSceneId] = [];
    localReferencePreviewUrlsRef.current[targetSceneId] = [];
    updateSceneInStoryboard(targetSceneId, scene => ({ ...scene, referenceUrls: [] }));

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
    localReferenceFilesRef.current[targetSceneId] = newFiles;
    localReferencePreviewUrlsRef.current[targetSceneId] = newPreviews;
    setReferenceImages(newFiles);
    setReferenceImagePreviews(newPreviews);
    setOutputUrl(null);
    setStatus('idle');
    setProgress(0);
    toast.success(`${newFiles.length} cena(s) carregada(s) como referência de vídeo`);
  }, [activeVideoSceneId, setMode, storyboard, updateSceneInStoryboard]);

  const buildPersistedProjectState = useCallback(async () => {
    const { photoScenes: syncedPhotoScenes, videoScenes: syncedVideoScenes } = syncCurrentSceneToStoryboard();
    const syncedScenes = [...syncedPhotoScenes, ...syncedVideoScenes];

    const persistedScenes = await Promise.all(syncedScenes.map(async (scene) => {
      const localFiles = localReferenceFilesRef.current[scene.id] ?? [];
      if (!user?.id || localFiles.length === 0) {
        const normalizedReferenceUrls = uniqueUrls(scene.referenceUrls ?? []);
        return JSON.stringify(normalizedReferenceUrls) === JSON.stringify(scene.referenceUrls ?? [])
          ? scene
          : { ...scene, referenceUrls: normalizedReferenceUrls };
      }

      const folder = `cinema-studio/${user.id}/${scene.id}`;
      const uploadedUrls: string[] = [];

      for (const file of localFiles) {
        const result = await uploadToStorageLegacy(file, folder);
        if (!result.success || !result.url) {
          throw new Error(result.error || `Falha ao salvar as referências da ${scene.name}.`);
        }
        uploadedUrls.push(result.url);
      }

      revokeObjectUrls(localReferencePreviewUrlsRef.current[scene.id] ?? []);
      localReferenceFilesRef.current[scene.id] = [];
      localReferencePreviewUrlsRef.current[scene.id] = [];

      return {
        ...scene,
        referenceUrls: uniqueUrls([...(scene.referenceUrls ?? []), ...uploadedUrls]),
      } satisfies StoryboardScene;
    }));

    const hasNormalizedChanges = persistedScenes.some((scene, index) => scene !== syncedScenes[index]);
    if (hasNormalizedChanges) {
      const nextPhotoScenes = persistedScenes.filter(scene => scene.type === 'photo');
      const nextVideoScenes = persistedScenes.filter(scene => scene.type === 'video');
      setPhotoStoryboard(nextPhotoScenes);
      setVideoStoryboard(nextVideoScenes);

      const currentSceneId = mode === 'photo' ? activePhotoSceneId : activeVideoSceneId;
      const currentScene = persistedScenes.find(scene => scene.id === currentSceneId);
      if (currentScene) {
        setReferenceImages([]);
        setReferenceImagePreviews(currentScene.referenceUrls ?? []);
      }
    }

    return {
      scenes: persistedScenes,
      activeMode: mode,
      activePhotoSceneId,
      activeVideoSceneId,
    };
  }, [activePhotoSceneId, activeVideoSceneId, mode, syncCurrentSceneToStoryboard, user?.id]);

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
    photoStoryboard, videoStoryboard, activePhotoSceneId, activeVideoSceneId,
    addToStoryboard, removeFromStoryboard, loadScene, addNewScene, animateAllScenes, restoreStoryboard, restoreProjectState,
    buildPersistedProjectState,

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
