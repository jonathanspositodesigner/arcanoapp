import { useState, useRef, useCallback, useEffect, Fragment } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage } from "@/hooks/useStorageUpload";
import AppLayout from "@/components/layout/AppLayout";
import { Coins, X, Download, Clock, ChevronDown, Play } from "lucide-react";
import CharacterPicker, { type CharacterItem } from "@/components/shared/CharacterPicker";
import { getSeedanceTotalCost, modeToGenType } from "@/config/seedance-pricing";
import { useIsMobile } from "@/hooks/use-mobile";
import { useResilientDownload } from "@/hooks/useResilientDownload";
import Seedance2TutorialModal from "@/components/Seedance2TutorialModal";

type Mode = "text" | "startend" | "multiref";
type Speed = "standard" | "fast";
type Ratio = "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9" | "auto";
type Quality = "720p" | "480p";
type Duration = string;

interface Generation {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  prompt: string;
  ratio: string;
  duration: string;
  videoUrl?: string;
  referenceImage?: string;
  error?: string;
  taskId?: string;
  pollCount?: number;
}

const MODEL_MAP: Record<string, string> = {
  "text-standard": "seedance-2.0-text-to-video",
  "text-fast": "seedance-2.0-fast-text-to-video",
  "startend-standard": "seedance-2.0-image-to-video",
  "startend-fast": "seedance-2.0-fast-image-to-video",
  "multiref-standard": "seedance-2.0-reference-to-video",
  "multiref-fast": "seedance-2.0-fast-reference-to-video",
};

// Pricing is now in src/config/seedance-pricing.ts

const RATIOS: { value: Ratio; label: string }[] = [
  { value: "16:9", label: "16:9 Paisagem" },
  { value: "9:16", label: "9:16 Retrato" },
  { value: "1:1", label: "1:1 Quadrado" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
  { value: "21:9", label: "21:9 Ultra-wide" },
  { value: "auto", label: "Auto" },
];

// Duration is now a slider value

const MODE_OPTIONS: { value: Mode; label: string; desc: string }[] = [
  { value: "text", label: "Só Prompt", desc: "Texto → vídeo" },
  { value: "startend", label: "Com Imagem", desc: "Imagens de início e fim" },
  { value: "multiref", label: "Multi-ref", desc: "Múltiplas referências" },
];

export default function Seedance2() {
  const { user } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { download: resilientDownload, isDownloading: isResilientDownloading } = useResilientDownload();
  const [prompt, setPrompt] = useState(() => {
    const state = location.state as { prefillPrompt?: string } | null;
    return state?.prefillPrompt || "";
  });
  const [mode, setMode] = useState<Mode>(() => {
    const state = location.state as { prefillRefImage?: string } | null;
    return state?.prefillRefImage ? "multiref" : "multiref";
  });
  const [ratio, setRatio] = useState<Ratio>("9:16");
  const [quality, setQuality] = useState<Quality>("480p");
  const [duration, setDuration] = useState<Duration>("15");
  const [speed, setSpeed] = useState<Speed>("fast");
  const [generateAudio, setGenerateAudio] = useState(true);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [galleryTab, setGalleryTab] = useState<"creations" | "library">("creations");
  const [libraryItems, setLibraryItems] = useState<Generation[]>([]);
  const [loadingCreations, setLoadingCreations] = useState(false);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [startImage, setStartImage] = useState<string | null>(null);
  const [endImage, setEndImage] = useState<string | null>(null);
  const [refImages, setRefImages] = useState<string[]>([]);
  const [refVideos, setRefVideos] = useState<string[]>([]);
  const [refAudios, setRefAudios] = useState<string[]>([]);
  const [libraryVideoRefs, setLibraryVideoRefs] = useState<string[]>([]); // track library-added videos
  const [uploading, setUploading] = useState(false);
  const [previewGen, setPreviewGen] = useState<Generation | null>(null);
  const [selectedCharacters, setSelectedCharacters] = useState<CharacterItem[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showRatioModal, setShowRatioModal] = useState(false);
  const [showFaceWarning, setShowFaceWarning] = useState<{ accept: string; onSuccess: (url: string) => void } | null>(null);
  const [showCharacterTip, setShowCharacterTip] = useState(true);
  const [showTutorial, setShowTutorial] = useState(() => {
    return !localStorage.getItem("seedance2-tutorial-seen");
  });
  const [selectedModel, setSelectedModel] = useState<{ title: string; thumbnail: string } | null>(() => {
    const state = location.state as { prefillTitle?: string; prefillThumbnail?: string } | null;
    if (state?.prefillTitle && state?.prefillThumbnail) {
      return { title: state.prefillTitle, thumbnail: state.prefillThumbnail };
    }
    return null;
  });

  // Load prefill reference images from navigation state (e.g. from BibliotecaPrompts)
  useEffect(() => {
    const state = location.state as { prefillRefImage?: string; prefillRefImages?: string[] } | null;
    const images = state?.prefillRefImages?.length ? state.prefillRefImages : state?.prefillRefImage ? [state.prefillRefImage] : [];
    if (images.length > 0) {
      setRefImages(images);
      setLibraryVideoRefs(images);
    }
  }, []);

  const pollTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const creditCost = getSeedanceTotalCost(speed, quality, modeToGenType(mode), parseInt(duration) || 5);

  // Track active jobs that need polling resumed after page load
  const [pendingResume, setPendingResume] = useState<{ id: string; taskId?: string }[]>([]);

  // Fetch user creations (completed) + active jobs from seedance_jobs
  useEffect(() => {
    if (!user) return;
    const fetchCreations = async () => {
      setLoadingCreations(true);
      const { data: completedData } = await supabase
        .from("seedance_jobs")
        .select("id, prompt, output_url, aspect_ratio, duration, status, error_message, task_id, created_at")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .not("output_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);

      const { data: activeData } = await supabase
        .from("seedance_jobs")
        .select("id, prompt, output_url, aspect_ratio, duration, status, error_message, task_id, created_at")
        .eq("user_id", user.id)
        .in("status", ["pending", "queued", "running", "timeout_recovery"])
        .order("created_at", { ascending: false })
        .limit(10);

      const mapJob = (j: any): Generation => ({
        id: j.id,
        status: j.status === "completed" ? "completed" : j.status === "failed" ? "failed" : (j.status === "running" || j.status === "timeout_recovery") ? "processing" : "queued",
        prompt: j.prompt || "",
        ratio: j.aspect_ratio || "16:9",
        duration: String(j.duration || 5),
        videoUrl: j.output_url || undefined,
        error: j.error_message || undefined,
        taskId: j.task_id || undefined,
      });

      const completed = (completedData || []).map(mapJob);
      const active = (activeData || []).map(mapJob);
      setGenerations([...active, ...completed]);

      const toResume = active.map(j => ({ id: j.id, taskId: j.taskId }));
      if (toResume.length > 0) setPendingResume(toResume);

      setLoadingCreations(false);
    };
    fetchCreations();
  }, [user]);

  // Fetch library items from admin_prompts with category "Seedance 2"
  useEffect(() => {
    const fetchLibrary = async () => {
      setLoadingLibrary(true);
      const { data, error } = await supabase
        .from("admin_prompts")
        .select("id, title, prompt, image_url, thumbnail_url, reference_images")
        .eq("category", "Seedance 2")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!error && data) {
        setLibraryItems(data.map((p: any) => ({
          id: p.id,
          status: "completed" as const,
          prompt: p.prompt || p.title || "",
          ratio: "16:9",
          duration: "",
          videoUrl: p.image_url || undefined,
          referenceImage: p.reference_images?.[0] || undefined,
        })));
      }
      setLoadingLibrary(false);
    };
    fetchLibrary();
  }, []);

  useEffect(() => {
    return () => {
      Object.values(pollTimers.current).forEach(clearInterval);
    };
  }, []);

  const handleFileUpload = useCallback(async (
    file: File,
    onSuccess: (url: string) => void,
    folder: string,
  ) => {
    setUploading(true);
    const result = await uploadToStorage(file, folder);
    setUploading(false);
    if (result.success && result.url) onSuccess(result.url);
  }, []);

  const handleImageDrop = useCallback((e: React.DragEvent, onSuccess: (url: string) => void) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && /\.(jpg|jpeg|png|webp)$/i.test(file.name) && file.size <= 10 * 1024 * 1024) {
      handleFileUpload(file, onSuccess, "seedance-refs");
    }
  }, [handleFileUpload]);

  const handleVideoDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && /\.(mp4|mov)$/i.test(file.name) && refVideos.length < 3) {
      handleFileUpload(file, (url) => setRefVideos((prev) => [...prev, url]), "seedance-refs");
    }
  }, [handleFileUpload, refVideos.length]);

  const handleAudioDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && /\.(mp3|wav)$/i.test(file.name) && refAudios.length < 3) {
      handleFileUpload(file, (url) => setRefAudios((prev) => [...prev, url]), "seedance-refs");
    }
  }, [handleFileUpload, refAudios.length]);

  const openFilePicker = useCallback((accept: string, onSuccess: (url: string) => void) => {
    // Show face warning modal before opening file picker
    setShowFaceWarning({ accept, onSuccess });
  }, []);

  const confirmFilePicker = useCallback(() => {
    if (!showFaceWarning) return;
    const { accept, onSuccess } = showFaceWarning;
    setShowFaceWarning(null);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFileUpload(file, onSuccess, "seedance-refs");
    };
    input.click();
  }, [showFaceWarning, handleFileUpload]);

  // Use a library item: set prompt, and if it has a reference image switch to multiref and add it
  const handleUseLibraryItem = useCallback((item: Generation) => {
    setPrompt(item.prompt);
    if (item.referenceImage) {
      setMode("multiref");
      // Clear previous library refs, add reference image
      setRefImages(prev => {
        const withoutOldLibrary = prev.filter(v => !libraryVideoRefs.includes(v));
        return [item.referenceImage!, ...withoutOldLibrary];
      });
      setLibraryVideoRefs([item.referenceImage]);
    }
    // Update selected model preview
    const thumbnail = item.videoUrl || item.referenceImage || "";
    setSelectedModel({ title: item.prompt?.slice(0, 60) || "Modelo da biblioteca", thumbnail });
    setPreviewGen(null);
    setGalleryTab("creations");
  }, [libraryVideoRefs]);

  // Handle mode change: clear library-added inputs
  const handleModeChange = useCallback((newMode: Mode) => {
    if (newMode !== mode && libraryVideoRefs.length > 0) {
      setRefVideos(prev => prev.filter(v => !libraryVideoRefs.includes(v)));
      setRefImages(prev => prev.filter(v => !libraryVideoRefs.includes(v)));
      setLibraryVideoRefs([]);
    }
    setMode(newMode);
  }, [mode, libraryVideoRefs]);

  const getValidAccessToken = useCallback(async (): Promise<string> => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.access_token) return sessionData.session.access_token;

    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session?.access_token) {
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    return refreshed.session.access_token;
  }, []);

  const startPolling = useCallback((genId: string, jobId: string, initialTaskId?: string) => {
    let count = 0;
    let resolvedTaskId = initialTaskId;

    const timer = setInterval(async () => {
      count += 1;

      if (count > 180) {
        clearInterval(timer);
        delete pollTimers.current[genId];
        setGenerations((prev) => prev.map((g) => g.id === genId ? { ...g, status: "processing", error: "Geração demorando mais que o normal, tentando recuperar automaticamente..." } : g));
        supabase.from("seedance_jobs").update({ status: "timeout_recovery" }).eq("id", jobId);
        return;
      }

      try {
        if (!resolvedTaskId) {
          const { data: jobData } = await supabase
            .from("seedance_jobs")
            .select("status, task_id, output_url, error_message")
            .eq("id", jobId)
            .maybeSingle();

          if (jobData?.task_id) {
            resolvedTaskId = jobData.task_id;
            setGenerations((prev) => prev.map((g) => g.id === genId ? { ...g, taskId: jobData.task_id, status: "processing" } : g));
          } else if (jobData?.status === "completed" && jobData.output_url) {
            clearInterval(timer);
            delete pollTimers.current[genId];
            setGenerations((prev) => prev.map((g) => g.id === genId ? { ...g, status: "completed", videoUrl: jobData.output_url } : g));
            return;
          } else if (jobData?.status === "failed") {
            clearInterval(timer);
            delete pollTimers.current[genId];
            setGenerations((prev) => prev.map((g) => g.id === genId ? { ...g, status: "failed", error: jobData.error_message || "Falhou" } : g));
            return;
          } else {
            setGenerations((prev) => prev.map((g) => g.id === genId ? { ...g, status: "queued", pollCount: count } : g));
            return;
          }
        }

        const accessToken = await getValidAccessToken();
        const { data, error } = await supabase.functions.invoke("seedance-poll", {
          body: { taskId: resolvedTaskId, jobId },
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (error) {
          const errMsg = error.message || "Erro ao consultar geração";
          if (errMsg.includes("Invalid token") || errMsg.includes("JWT") || errMsg.includes("401")) {
            clearInterval(timer);
            delete pollTimers.current[genId];
            setGenerations((prev) => prev.map((g) => g.id === genId ? {
              ...g,
              status: "failed",
              error: "Sessão expirada. Faça login novamente para acompanhar a geração."
            } : g));
          }
          return;
        }

        if (data?.status === "completed") {
          clearInterval(timer);
          delete pollTimers.current[genId];
          setGenerations((prev) => prev.map((g) => g.id === genId ? { ...g, status: "completed", videoUrl: data.outputUrl } : g));
        } else if (data?.status === "failed") {
          clearInterval(timer);
          delete pollTimers.current[genId];
          setGenerations((prev) => prev.map((g) => g.id === genId ? { ...g, status: "failed", error: data.error } : g));
        } else {
          setGenerations((prev) => prev.map((g) => g.id === genId ? { ...g, status: "processing", pollCount: count } : g));
        }
      } catch (pollError: any) {
        if (pollError?.message?.includes("Sessão expirada")) {
          clearInterval(timer);
          delete pollTimers.current[genId];
          setGenerations((prev) => prev.map((g) => g.id === genId ? {
            ...g,
            status: "failed",
            error: "Sessão expirada. Faça login novamente para acompanhar a geração."
          } : g));
          return;
        }

        console.error("[Seedance2] Poll error:", pollError);
      }
    }, 5000);

    pollTimers.current[genId] = timer;
  }, [getValidAccessToken]);

  // Resume polling for active jobs loaded on page init
  useEffect(() => {
    if (pendingResume.length === 0) return;
    pendingResume.forEach(({ id, taskId }) => {
      if (!pollTimers.current[id]) {
        startPolling(id, id, taskId);
      }
    });
    setPendingResume([]);
  }, [pendingResume, startPolling]);

  const hasActiveJob = generations.some((g) => g.status === "queued" || g.status === "processing");

  const canGenerate = useCallback(() => {
    if (hasActiveJob) return false;
    if (!prompt.trim()) return false;
    if (mode === "startend" && !startImage) return false;
    if (mode === "startend" && !endImage) return false;
    if (mode === "multiref") {
      const selectedCharacterRefs = selectedCharacters
        .map((c) => (c as any).reference_image_url || c.image_url)
        .filter(Boolean);
      if (selectedCharacterRefs.length + refImages.length === 0) return false;
    }
    return true;
  }, [prompt, mode, startImage, endImage, refImages, selectedCharacters, hasActiveJob]);

  const handleGenerate = useCallback(async () => {
    if (!canGenerate() || !user) return;

    const model = MODEL_MAP[`${mode}-${speed}`];
    const genId = crypto.randomUUID();

    let finalPrompt = prompt.trim();
    const referenceImageUrls = mode === "startend"
      ? ([startImage, endImage].filter(Boolean) as string[])
      : mode === "multiref"
        ? [...selectedCharacters.map(c => (c as any).reference_image_url || c.image_url).filter(Boolean), ...refImages]
        : [];

    if (mode === "multiref" && referenceImageUrls.length === 0) {
      setGenerations((prev) => prev.filter((g) => g.id !== genId));
      return;
    }

    if (selectedCharacters.length > 0) {
      const genderPrefixes = selectedCharacters
        .filter(c => c.gender)
        .map(c => c.gender === 'male'
          ? 'The main subject is a man, male person.'
          : 'The main subject is a woman, female person.'
        );
      if (genderPrefixes.length > 0) {
        finalPrompt = genderPrefixes.join(' ') + ' ' + finalPrompt;
      }
    }

    setSelectedModel(null);
    setGalleryTab("creations");
    setGenerations((prev) => [{ id: genId, status: "queued", prompt: finalPrompt, ratio, duration }, ...prev]);

    let createdJobId: string | null = null;
    try {
      const accessToken = await getValidAccessToken();

      const { data: jobData, error: insertError } = await supabase
        .from("seedance_jobs")
        .insert({
          user_id: user.id,
          model,
          prompt: finalPrompt,
          duration: parseInt(duration),
          quality,
          aspect_ratio: ratio === "auto" ? undefined : ratio,
          generate_audio: generateAudio,
          input_image_urls: mode === "startend"
            ? ([startImage, endImage].filter(Boolean) as string[])
            : mode === "multiref"
              ? referenceImageUrls
              : undefined,
          input_video_urls: mode === "multiref" && refVideos.length > 0 ? refVideos : undefined,
          input_audio_urls: mode === "multiref" && refAudios.length > 0 ? refAudios : undefined,
          status: "queued",
        })
        .select("id")
        .single();

      if (insertError || !jobData) {
        setGenerations((prev) => prev.map((g) => g.id === genId ? { ...g, status: "failed", error: "Failed to create job" } : g));
        return;
      }

      createdJobId = jobData.id;
      setGenerations((prev) => prev.map((g) => g.id === genId ? { ...g, status: "queued" } : g));

      let data: any = null;
      let error: any = null;
      const MAX_INVOKE_RETRIES = 2;

      for (let attempt = 0; attempt <= MAX_INVOKE_RETRIES; attempt++) {
        const result = await supabase.functions.invoke("seedance-generate", {
          body: {
            model,
            prompt: finalPrompt,
            duration: parseInt(duration),
            quality,
            aspectRatio: ratio === "auto" ? undefined : ratio,
            generateAudio,
            imageUrls: mode === "startend" ? [startImage, endImage].filter(Boolean) : mode === "multiref" ? referenceImageUrls : undefined,
            videoUrls: mode === "multiref" && refVideos.length > 0 ? refVideos : undefined,
            audioUrls: mode === "multiref" && refAudios.length > 0 ? refAudios : undefined,
            jobId: jobData.id,
            creditCost,
          },
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        data = result.data;
        error = result.error;

        if (data?.success || data?.error) break;

        const isNetworkError = !data && error && (
          error.message?.includes('non-2xx') ||
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('NetworkError') ||
          error.message?.includes('FunctionsFetchError')
        );

        if (isNetworkError && attempt < MAX_INVOKE_RETRIES) {
          console.warn(`[Seedance2] Edge function retry ${attempt + 1}/${MAX_INVOKE_RETRIES}`);
          await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
          continue;
        }
        break;
      }

      let realError = data?.error || error?.message || "Erro desconhecido";
      if (!data && error?.context) {
        try {
          const ctx = typeof error.context.json === 'function' ? await error.context.json() : null;
          if (ctx?.error) realError = ctx.error;
        } catch (_) { /* ignore */ }
      }

      const ERROR_MESSAGES: Record<string, string> = {
        'Service busy': 'Servidores ocupados. Tente novamente em alguns minutos.',
        'Allocating resources': 'Servidores ocupados. Tente novamente em alguns minutos.',
        'photorealistic people': 'Imagem com pessoas reais não é suportada. Use estilo ilustração ou cartoon.',
        'Créditos insuficientes': 'Créditos insuficientes. Adquira mais créditos para continuar.',
        'Invalid token': 'Sessão expirada. Faça login novamente.',
        'non-2xx': 'Erro de conexão com o servidor. Tente novamente.',
      };

      const friendlyError = Object.entries(ERROR_MESSAGES).find(([key]) =>
        realError.toLowerCase().includes(key.toLowerCase())
      )?.[1] || realError;

      const isTransportError = !!error && !data;
      if (error || !data?.success) {
        if (isTransportError) {
          setGenerations((prev) => prev.map((g) => g.id === genId ? {
            ...g,
            status: "queued",
            error: "Conexão instável no envio. O sistema vai continuar tentando em segundo plano.",
          } : g));
          startPolling(genId, jobData.id);
          return;
        }

        setGenerations((prev) => prev.map((g) => g.id === genId ? { ...g, status: "failed", error: friendlyError } : g));
        await supabase.from("seedance_jobs").update({
          status: "failed",
          error_message: realError,
        }).eq("id", jobData.id);
        return;
      }

      const returnedTaskId = data.taskId as string | undefined;
      setGenerations((prev) => prev.map((g) => g.id === genId ? {
        ...g,
        status: returnedTaskId ? "processing" : "queued",
        taskId: returnedTaskId,
      } : g));
      startPolling(genId, jobData.id, returnedTaskId);
    } catch (err: any) {
      const maybeTransportError = err?.message?.includes("Failed to fetch") || err?.message?.includes("FunctionsFetchError");
      if (createdJobId && maybeTransportError) {
        setGenerations((prev) => prev.map((g) => g.id === genId ? {
          ...g,
          status: "queued",
          error: "Conexão instável no envio. O sistema vai continuar tentando em segundo plano.",
        } : g));
        startPolling(genId, createdJobId);
        return;
      }

      setGenerations((prev) => prev.map((g) => g.id === genId ? { ...g, status: "failed", error: err.message } : g));
      if (createdJobId) {
        await supabase.from("seedance_jobs").update({
          status: "failed",
          error_message: err.message || "Client-side error",
        }).eq("id", createdJobId);
      }
    }
  }, [prompt, mode, speed, ratio, quality, duration, generateAudio, startImage, endImage, refImages, refVideos, refAudios, selectedCharacters, user, canGenerate, creditCost, getValidAccessToken, startPolling]);

  const handleDownloadVideo = useCallback((videoUrl: string, videoPrompt: string) => {
    const filename = `seedance-${videoPrompt.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.mp4`;
    resilientDownload({
      url: videoUrl,
      filename,
      mediaType: 'video',
      timeout: 30000,
      locale: 'pt',
    });
  }, [resilientDownload]);

  const truncate = (value: string, length: number) => value.length > length ? `${value.slice(0, length)}…` : value;

  return (
    <AppLayout fullScreen>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mx-auto flex w-full max-w-[1400px] flex-1 min-h-0 flex-col px-2 sm:px-4 pt-3 sm:pt-4 pb-2 sm:pb-4 overflow-y-auto">
          <div className="mb-2 sm:mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-foreground">Seedance 2.0</h1>
              <button
                onClick={() => setShowTutorial(true)}
                className="flex items-center gap-1 rounded-md border border-border bg-accent0/10 px-2 py-0.5 text-[10px] sm:text-xs font-medium text-muted-foreground hover:bg-accent0/20 transition-colors"
              >
                <Play className="h-3 w-3" />
                Ver tutorial
              </button>
            </div>
            <div className="flex rounded-lg border border-border bg-white/[0.03] p-[2px]">
              <button
                onClick={() => setGalleryTab("creations")}
                className={`rounded-md border px-3 py-1 text-[11px] font-medium transition-all duration-200 ${
                  galleryTab === "creations" ? "border-border bg-accent0/20 text-muted-foreground shadow-sm shadow-primary/5" : "border-transparent text-muted-foreground hover:text-muted-foreground hover:bg-white/[0.04]"
                }`}
              >
                Minhas Criações
              </button>
              <button
                onClick={() => setGalleryTab("library")}
                className={`rounded-md border px-3 py-1 text-[11px] font-medium transition-all duration-200 ${
                  galleryTab === "library" ? "border-border bg-accent0/20 text-muted-foreground shadow-sm shadow-primary/5" : "border-transparent text-muted-foreground hover:text-muted-foreground hover:bg-white/[0.04]"
                }`}
              >
                Biblioteca
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-border bg-black/10 sm:min-h-[300px] lg:min-h-[420px]">
            {/* Selected model preview from library */}
            {selectedModel && (
              <div className="p-3 border-b border-border">
                <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-green-900/30 to-green-700/10 border border-green-500/30 p-3">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden shrink-0 border border-green-500/40">
                    {selectedModel.thumbnail.match(/\.(mp4|webm|mov)/i) ? (
                      <video src={selectedModel.thumbnail} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                    ) : (
                      <img src={selectedModel.thumbnail} alt={selectedModel.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-green-400 font-semibold mb-0.5">Modelo selecionado</p>
                    <p className="text-sm text-foreground font-medium truncate">{selectedModel.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Selecione seu personagem e clique em Gerar</p>
                  </div>
                  <button onClick={() => setSelectedModel(null)} className="shrink-0 p-1 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            {galleryTab === "creations" && (
              <>
                {galleryTab === "creations" && (
                  <div className="flex items-center gap-1.5 px-3 pt-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Vídeos armazenados por 24h</span>
                  </div>
                )}
                {loadingCreations ? (
                  <div className="flex h-full min-h-[320px] items-center justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-white/40" />
                  </div>
                ) : generations.length === 0 ? (
                  <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-6 text-center lg:min-h-[420px] gap-3">
                    <p className="text-sm text-muted-foreground">Você ainda não tem criações. Veja os modelos ou digite um prompt para começar.</p>
                    <button
                      onClick={() => setGalleryTab("library")}
                      className="rounded-lg border border-border bg-accent0/10 px-4 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-accent0/20"
                    >
                      Explorar modelos
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 p-3">
                    {generations.map((gen) => (
                      <VideoCard key={gen.id} gen={gen} onPreview={setPreviewGen} onDownload={handleDownloadVideo} />
                    ))}
                  </div>
                )}
              </>
            )}

            {galleryTab === "library" && (
              <>
                {loadingLibrary ? (
                  <div className="flex h-full min-h-[320px] items-center justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-white/40" />
                  </div>
                ) : libraryItems.length === 0 ? (
                  <div className="flex h-full min-h-[320px] items-center justify-center px-6 text-center lg:min-h-[420px]">
                    <p className="text-sm text-muted-foreground">Nenhum vídeo na biblioteca ainda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 p-3">
                    {libraryItems.map((gen) => (
                      <VideoCard key={gen.id} gen={gen} onPreview={setPreviewGen} onDownload={handleDownloadVideo} onUse={handleUseLibraryItem} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Preview Modal */}
          {previewGen && previewGen.videoUrl && (
             <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setPreviewGen(null)}>
              <div className="relative flex w-full max-w-4xl flex-col px-4 max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                {/* Controls bar - always visible */}
               <div className="flex items-center justify-end gap-2 pb-2 shrink-0">
                  {libraryItems.some(li => li.id === previewGen.id) && (
                    <button
                      onClick={() => handleUseLibraryItem(previewGen)}
                      className="rounded-full bg-secondary/80 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent0 transition-colors"
                    >
                      Usar modelo
                    </button>
                  )}
                  <button
                    onClick={() => previewGen.videoUrl && handleDownloadVideo(previewGen.videoUrl, previewGen.prompt)}
                    className="rounded-full bg-accent p-2 text-foreground hover:bg-white/20 transition-colors"
                    title="Baixar vídeo"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setPreviewGen(null)}
                    className="rounded-full bg-accent p-2 text-foreground hover:bg-white/20 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <video
                  src={previewGen.videoUrl}
                  controls
                  autoPlay
                  className="w-full rounded-xl max-h-[calc(90vh-4rem)] object-contain"
                />
                <p className="mt-2 text-xs text-muted-foreground truncate shrink-0">{previewGen.prompt} · {previewGen.ratio} · {previewGen.duration}s</p>
              </div>
            </div>
          )}


          <div className="mt-4 shrink-0 rounded-2xl border border-border bg-background/95 p-3 backdrop-blur-sm">
            {mode !== "text" && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {mode === "startend" && (
                  <>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Imagens</span>
                    <div className="flex gap-1.5">
                      <UploadSlot
                        url={startImage}
                        onRemove={() => setStartImage(null)}
                        onDrop={(e) => handleImageDrop(e, (url) => setStartImage(url))}
                        onClickUpload={() => openFilePicker("image/jpeg,image/png,image/webp", (url) => setStartImage(url))}
                        size={48}
                      />
                      <UploadSlot
                        url={endImage}
                        onRemove={() => setEndImage(null)}
                        onDrop={(e) => handleImageDrop(e, (url) => setEndImage(url))}
                        onClickUpload={() => openFilePicker("image/jpeg,image/png,image/webp", (url) => setEndImage(url))}
                        size={48}
                      />
                    </div>
                  </>
                )}

                {mode === "multiref" && (
                  <>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Refs</span>
                    <div className="flex flex-wrap gap-1">
                      {refImages.map((url, index) => (
                        <UploadSlot key={index} url={url} onRemove={() => setRefImages((prev) => prev.filter((_, i) => i !== index))} size={40} />
                      ))}
                      {refImages.length < 8 && (
                        <UploadSlot
                          url={null}
                          onClickUpload={() => openFilePicker("image/jpeg,image/png,image/webp", (url) => setRefImages((prev) => [...prev, url]))}
                          onDrop={(e) => handleImageDrop(e, (url) => setRefImages((prev) => [...prev, url]))}
                          size={40}
                        />
                      )}
                    </div>
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleVideoDrop}
                      onClick={() => refVideos.length < 3 && openFilePicker("video/mp4,video/quicktime", (url) => setRefVideos((prev) => [...prev, url]))}
                      className="flex h-[28px] cursor-pointer items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-muted/50 px-3 text-[10px] text-muted-foreground transition-colors hover:border-border"
                    >
                      {refVideos.length > 0 ? `${refVideos.length} vídeo(s)` : "+ vídeo"}
                      {refVideos.length > 0 && <button onClick={(e) => { e.stopPropagation(); setRefVideos([]); }} className="ml-1 text-muted-foreground hover:text-foreground">×</button>}
                    </div>
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleAudioDrop}
                      onClick={() => refAudios.length < 3 && openFilePicker("audio/mpeg,audio/wav", (url) => setRefAudios((prev) => [...prev, url]))}
                      className="flex h-[28px] cursor-pointer items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-muted/50 px-3 text-[10px] text-muted-foreground transition-colors hover:border-border"
                    >
                      {refAudios.length > 0 ? `${refAudios.length} áudio(s)` : "+ áudio"}
                      {refAudios.length > 0 && <button onClick={(e) => { e.stopPropagation(); setRefAudios([]); }} className="ml-1 text-muted-foreground hover:text-foreground">×</button>}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* MOBILE: Generate button FIRST, then prompt, then controls */}
            {isMobile ? (
              <div className="flex flex-col gap-2 pb-16">
                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate() || uploading}
                  className={`group relative flex h-[44px] items-center justify-center gap-2 overflow-hidden rounded-xl px-4 text-sm font-semibold transition-all duration-300 ${
                    canGenerate() && !uploading
                      ? "bg-gradient-to-r from-purple-700 to-purple-500 text-white shadow-lg shadow-purple-700/40 active:scale-[0.98]"
                      : "cursor-not-allowed bg-accent text-muted-foreground"
                  }`}
                >
                  {uploading ? "Enviando..." : hasActiveJob ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <span className="text-base">✦</span>
                      Gerar vídeo
                      <span className="flex items-center gap-1 rounded-md bg-accent px-1.5 py-0.5 text-[11px]">
                        <Coins className="h-3 w-3" />
                        {creditCost}
                      </span>
                    </>
                  )}
                </button>

                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value.slice(0, 2000))}
                  placeholder="Descreva o vídeo que deseja gerar..."
                  className="min-h-[60px] max-h-[100px] resize-none rounded-xl border border-border bg-white/[0.04] px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-purple-500/40"
                  rows={2}
                />
                <span className="text-right text-[10px] text-muted-foreground -mt-1">{prompt.length}/2000</span>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Modo</span>
                    <div className="flex rounded-lg border border-border bg-white/[0.03] p-[2px]">
                      {MODE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleModeChange(option.value)}
                          className={`rounded-md border px-2 py-1 text-[10px] font-medium transition-all ${
                            mode === option.value ? "border-border bg-accent0/20 text-muted-foreground" : "border-transparent text-muted-foreground"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="flex items-center gap-1 rounded-lg border border-border bg-white/[0.03] px-2 py-1 text-[10px] font-medium text-muted-foreground"
                  >
                    Config
                    <ChevronDown className={`h-3 w-3 transition-transform ${showSettings ? "rotate-180" : ""}`} />
                  </button>

                  {mode === "multiref" && (
                    <div className="relative">
                      <CharacterPicker
                        selectedCharacters={selectedCharacters}
                        onCharactersChange={setSelectedCharacters}
                        maxCharacters={3}
                        compact
                        useSavedCharacters
                      />
                      {showCharacterTip && selectedCharacters.length === 0 && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 animate-bounce">
                          <div className="relative rounded-xl px-4 py-2.5 shadow-[0_0_20px_rgba(148,163,184,0.4)] whitespace-nowrap bg-gradient-to-r from-purple-600 via-purple-500 to-purple-500 animate-pulse-glow">
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-secondary rotate-45 rounded-sm" />
                            <div className="flex items-center gap-2 relative">
                              <span className="text-[11px] sm:text-sm text-foreground font-bold drop-shadow-sm">👆 Adicione seu rosto aqui!</span>
                              <button onClick={() => setShowCharacterTip(false)} className="text-muted-foreground hover:text-foreground text-sm shrink-0 font-bold">✕</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value.slice(0, 2000))}
                    placeholder="Descreva o vídeo que deseja gerar..."
                    className="min-h-[80px] max-h-[160px] min-w-0 resize-y rounded-xl border border-border bg-white/[0.04] px-3.5 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-purple-500/40 focus:min-h-[100px]"
                    rows={3}
                  />
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleGenerate}
                      disabled={!canGenerate() || uploading}
                      className={`group relative flex h-[48px] items-center justify-center gap-2.5 overflow-hidden rounded-xl px-5 text-sm font-semibold transition-all duration-300 ${
                        canGenerate() && !uploading
                          ? "bg-gradient-to-r from-purple-700 to-purple-500 text-white shadow-lg shadow-purple-700/40 hover:shadow-purple-600/60 hover:scale-[1.02] active:scale-[0.98]"
                          : "cursor-not-allowed bg-accent text-muted-foreground"
                      }`}
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-gray-400/0 via-white/10 to-gray-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      {uploading ? "Enviando..." : hasActiveJob ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <span className="text-base">✦</span>
                          Gerar vídeo
                          <span className="flex items-center gap-1 rounded-md bg-accent px-1.5 py-0.5 text-[11px]">
                            <Coins className="h-3 w-3" />
                            {creditCost}
                          </span>
                        </>
                      )}
                    </button>
                    <span className="text-right text-[10px] text-muted-foreground">{prompt.length}/2000</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 pb-1">
                  <div className="flex items-center gap-1.5 group/ctrl">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Modo</span>
                    <div className="flex rounded-lg border border-border bg-white/[0.03] p-[2px]">
                      {MODE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleModeChange(option.value)}
                          className={`rounded-md border px-3 py-1 text-[11px] font-medium transition-all duration-200 hover:scale-[1.04] ${
                            mode === option.value ? "border-border bg-accent0/20 text-muted-foreground shadow-sm shadow-primary/5" : "border-transparent text-muted-foreground hover:text-muted-foreground hover:bg-white/[0.04]"
                          }`}
                          title={option.desc}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-4 w-px bg-white/[0.06]" />

                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="flex items-center gap-1 rounded-lg border border-border bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-muted-foreground transition-all duration-200 hover:border-border hover:text-muted-foreground"
                  >
                    Configurações
                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showSettings ? "rotate-180" : ""}`} />
                  </button>

                  {mode === "multiref" && (
                    <>
                      <div className="h-4 w-px bg-white/[0.06]" />
                      <div className="relative">
                        <CharacterPicker
                          selectedCharacters={selectedCharacters}
                          onCharactersChange={setSelectedCharacters}
                          maxCharacters={3}
                          compact
                          useSavedCharacters
                        />
                        {showCharacterTip && selectedCharacters.length === 0 && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 animate-bounce">
                            <div className="relative rounded-xl px-4 py-2.5 shadow-[0_0_20px_rgba(148,163,184,0.4)] whitespace-nowrap bg-gradient-to-r from-purple-600 via-purple-500 to-purple-500 animate-pulse-glow">
                              <div className="flex items-center gap-2 relative">
                                <span className="text-sm text-foreground font-bold drop-shadow-sm">👆 Adicione seu rosto aqui!</span>
                                <button onClick={() => setShowCharacterTip(false)} className="text-muted-foreground hover:text-foreground text-sm shrink-0 font-bold">✕</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {showSettings && (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-white/[0.02] px-3 py-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Motor</span>
                  <div className="flex rounded-lg border border-border bg-white/[0.03] p-[2px]">
                    {(["standard", "fast"] as Speed[]).map((value) => (
                      <button
                        key={value}
                        onClick={() => setSpeed(value)}
                        className={`rounded-md border px-3 py-1 text-[11px] font-medium transition-all ${
                          speed === value ? "border-border bg-accent0/20 text-muted-foreground" : "border-transparent text-muted-foreground hover:text-muted-foreground"
                        }`}
                      >
                        {value === "standard" ? "Standard" : "Fast"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-4 w-px bg-white/[0.06]" />

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Tamanho</span>
                  <select
                    value={ratio}
                    onChange={(e) => setRatio(e.target.value as Ratio)}
                    className="hidden sm:block rounded-lg border border-border bg-card px-2 py-1 text-[11px] text-foreground outline-none hover:border-border cursor-pointer [&>option]:bg-popover [&>option]:text-popover-foreground"
                  >
                    {RATIOS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                  <button
                    onClick={() => setShowRatioModal(true)}
                    className="sm:hidden rounded-lg border border-border bg-card px-2 py-1 text-[11px] text-foreground"
                  >
                    {RATIOS.find((r) => r.value === ratio)?.label || ratio}
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Qualidade</span>
                  <div className="flex rounded-lg border border-border bg-white/[0.03] p-[2px]">
                    {(["480p", "720p"] as Quality[]).map((value) => (
                      <button
                        key={value}
                        onClick={() => setQuality(value)}
                        className={`rounded-md border px-3 py-1 text-[11px] font-medium transition-all ${
                          quality === value ? "border-border bg-accent0/20 text-muted-foreground" : "border-transparent text-muted-foreground hover:text-muted-foreground"
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 min-w-[140px]">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Duração</span>
                  <input
                    type="range" min={4} max={15} step={1}
                    value={parseInt(duration)}
                    onChange={(e) => setDuration(e.target.value)}
                    className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-accent accent-slate-500 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-muted-foreground"
                  />
                  <span className="min-w-[24px] text-center text-[11px] font-medium text-muted-foreground">{duration}s</span>
                </div>

                <div className="h-4 w-px bg-white/[0.06]" />

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Áudio</span>
                  <button
                    onClick={() => setGenerateAudio(!generateAudio)}
                    className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${generateAudio ? "bg-emerald-500" : "bg-accent"}`}
                  >
                    <div className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-all duration-200 ${generateAudio ? "left-[16px]" : "left-[2px]"}`} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Ratio picker modal - mobile */}
      {showRatioModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:hidden" onClick={() => setShowRatioModal(false)}>
          <div className="w-full max-w-sm rounded-t-2xl border-t border-border bg-background p-4 animate-in slide-in-from-bottom duration-200" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 text-center text-xs font-medium text-muted-foreground">Escolha o tamanho</p>
            <div className="grid grid-cols-2 gap-2">
              {RATIOS.map((item) => (
                <button
                  key={item.value}
                  onClick={() => { setRatio(item.value); setShowRatioModal(false); }}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-medium transition-all ${
                    ratio === item.value
                      ? "border-purple-500/40 bg-accent0/20 text-muted-foreground"
                      : "border-border bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowRatioModal(false)} className="mt-3 w-full rounded-xl bg-white/[0.06] py-2 text-xs text-muted-foreground">Fechar</button>
          </div>
        </div>
      )}
      {/* Face warning modal */}
      {showFaceWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowFaceWarning(null)}>
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-background p-5" onClick={(e) => e.stopPropagation()}>
            <p className="mb-2 text-sm font-semibold text-foreground">⚠️ Atenção</p>
            <p className="mb-1 text-xs leading-relaxed text-muted-foreground">
              O Seedance 2 <span className="font-medium text-foreground">não aceita imagens com rostos reais</span> de pessoas.
            </p>
            <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
              Se quiser adicionar um rosto, crie um <span className="font-medium text-muted-foreground">Personagem</span> usando o botão abaixo do prompt.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFaceWarning(null)}
                className="flex-1 rounded-xl bg-white/[0.06] py-2 text-xs font-medium text-muted-foreground hover:bg-white/[0.1] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmFilePicker}
                className="flex-1 rounded-xl bg-secondary/80 py-2 text-xs font-medium text-foreground hover:bg-accent0 transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
      <Seedance2TutorialModal
        open={showTutorial}
        onClose={() => {
          localStorage.setItem("seedance2-tutorial-seen", "true");
          setShowTutorial(false);
        }}
      />
    </AppLayout>
  );
}

function UploadSlot({
  url,
  onRemove,
  onDrop,
  onClickUpload,
  size,
}: {
  url?: string | null;
  onRemove?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onClickUpload?: () => void;
  size?: number;
}) {
  const dimension = size || 68;

  if (url) {
    return (
      <div className="relative overflow-hidden rounded-lg border border-border" style={{ width: dimension, height: dimension }}>
        <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
        {onRemove && (
          <button onClick={onRemove} className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-[10px] text-muted-foreground hover:text-foreground">×</button>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onClick={onClickUpload}
      className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 text-base text-muted-foreground transition-all duration-200 hover:border-border hover:bg-accent0/5 hover:text-muted-foreground hover:scale-105"
      style={{ width: dimension, height: dimension }}
    >
      +
    </div>
  );
}

function VideoCard({ gen, onPreview, onDownload, onUse }: { gen: Generation; onPreview: (g: Generation) => void; onDownload?: (url: string, prompt: string) => void; onUse?: (g: Generation) => void }) {
  return (
    <div
      className={`relative flex aspect-video items-center justify-center overflow-hidden rounded-xl cursor-pointer group ${
        gen.status === "queued" ? "border border-dashed border-border" : "border border-border bg-card"
      }`}
      onClick={() => gen.status === "completed" && gen.videoUrl && onPreview(gen)}
    >
      {gen.status === "completed" && gen.videoUrl && (
        <>
          <HoverVideo src={gen.videoUrl} prompt={gen.prompt} ratio={gen.ratio} duration={gen.duration} />
          <button
            onClick={(e) => { e.stopPropagation(); onDownload?.(gen.videoUrl!, gen.prompt); }}
            className="absolute top-2 right-2 z-10 rounded-full bg-black/60 p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all hover:bg-black/80 hover:text-foreground hover:scale-110"
            title="Baixar vídeo"
          >
            <Download className="h-4 w-4" />
          </button>
          {onUse && (
            <button
              onClick={(e) => { e.stopPropagation(); onUse(gen); }}
              className="absolute bottom-2 left-2 right-2 z-10 rounded-lg bg-secondary/80 px-2 py-1 text-[10px] font-medium text-foreground opacity-0 group-hover:opacity-100 transition-all hover:bg-accent0"
            >
              Usar modelo
            </button>
          )}
        </>
      )}
      {gen.status === "processing" && (
        <div className="text-center">
          <div className="mx-auto mb-1.5 h-5 w-5 animate-spin rounded-full border-2 border-border border-t-white/40" />
          <span className="text-[10px] text-muted-foreground">gerando...</span>
        </div>
      )}
      {gen.status === "failed" && (
        <span className="px-3 text-center text-[10px] text-red-400/60">{gen.error || "Falhou"}</span>
      )}
    </div>
  );
}

function HoverVideo({ src, prompt, ratio, duration }: { src: string; prompt: string; ratio: string; duration: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Show the first frame on mount
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    el.currentTime = 0.1; // seek to show first frame
  }, [src]);

  const handleMouseEnter = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    el.play().catch(() => {});
  };

  const handleMouseLeave = () => {
    const el = videoRef.current;
    if (!el) return;
    el.pause();
  };

  return (
    <>
      <video
        ref={videoRef}
        src={src + "#t=0.1"}
        muted
        playsInline
        preload="auto"
        className="h-full w-full object-cover"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <span className="absolute bottom-1.5 left-2 text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {prompt.length > 40 ? prompt.slice(0, 40) + "…" : prompt} · {ratio} · {duration}s
      </span>
    </>
  );
}