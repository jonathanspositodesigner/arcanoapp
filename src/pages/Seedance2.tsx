import { useState, useRef, useCallback, useEffect, Fragment } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage } from "@/hooks/useStorageUpload";
import AppLayout from "@/components/layout/AppLayout";
import { Coins, X, Download, Clock, ChevronDown } from "lucide-react";
import CharacterPicker, { type CharacterItem } from "@/components/shared/CharacterPicker";
import { getSeedanceTotalCost, modeToGenType } from "@/config/seedance-pricing";
import { useIsMobile } from "@/hooks/use-mobile";
import { useResilientDownload } from "@/hooks/useResilientDownload";

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
  const [mode, setMode] = useState<Mode>("multiref");
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

  const pollTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const creditCost = getSeedanceTotalCost(speed, quality, modeToGenType(mode), parseInt(duration) || 5);

  // Fetch user creations from seedance_jobs
  useEffect(() => {
    if (!user) return;
    const fetchCreations = async () => {
      setLoadingCreations(true);
      const { data, error } = await supabase
        .from("seedance_jobs")
        .select("id, prompt, output_url, aspect_ratio, duration, status, error_message, task_id, created_at")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .not("output_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!error && data) {
        setGenerations(data.map((j: any) => ({
          id: j.id,
          status: j.status === "completed" ? "completed" : j.status === "failed" ? "failed" : j.status === "running" ? "processing" : "queued",
          prompt: j.prompt || "",
          ratio: j.aspect_ratio || "16:9",
          duration: String(j.duration || 5),
          videoUrl: j.output_url || undefined,
          error: j.error_message || undefined,
          taskId: j.task_id || undefined,
        })));
      }
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
        .select("id, title, prompt, image_url, thumbnail_url")
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
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFileUpload(file, onSuccess, "seedance-refs");
    };
    input.click();
  }, [handleFileUpload]);

  // Use a library item: switch to multiref, set prompt, add video as ref
  const handleUseLibraryItem = useCallback((item: Generation) => {
    setMode("multiref");
    setPrompt(item.prompt);
    if (item.videoUrl) {
      // Clear previous library refs, add this one
      setRefVideos(prev => {
        const withoutOldLibrary = prev.filter(v => !libraryVideoRefs.includes(v));
        return [item.videoUrl!, ...withoutOldLibrary];
      });
      setLibraryVideoRefs([item.videoUrl]);
    }
    setPreviewGen(null);
    setGalleryTab("creations");
  }, [libraryVideoRefs]);

  const startPolling = useCallback((genId: string, taskId: string, jobId: string, creditsToCharge: number) => {
    let count = 0;
    const timer = setInterval(async () => {
      count += 1;

      if (count > 60) {
        clearInterval(timer);
        delete pollTimers.current[genId];
        setGenerations((prev) => prev.map((g) => g.id === genId ? { ...g, status: "failed", error: "Timeout" } : g));
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase.functions.invoke("seedance-poll", {
          body: { taskId, jobId, creditsToCharge },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (error) return;

        if (data?.status === "completed") {
          clearInterval(timer);
          delete pollTimers.current[genId];
          setGenerations((prev) => prev.map((g) => g.id === genId ? { ...g, status: "completed", videoUrl: data.outputUrl } : g));
        } else if (data?.status === "failed") {
          clearInterval(timer);
          delete pollTimers.current[genId];
          setGenerations((prev) => prev.map((g) => g.id === genId ? { ...g, status: "failed", error: data.error } : g));
        } else {
          setGenerations((prev) => prev.map((g) => g.id === genId ? { ...g, pollCount: count } : g));
        }
      } catch {
      }
    }, 5000);

    pollTimers.current[genId] = timer;
  }, []);

  const canGenerate = useCallback(() => {
    if (!prompt.trim()) return false;
    if (mode === "startend" && !startImage) return false;
    if (mode === "multiref" && refImages.length === 0 && selectedCharacters.length === 0) return false;
    return true;
  }, [prompt, mode, startImage, refImages, selectedCharacters]);

  const handleGenerate = useCallback(async () => {
    if (!canGenerate() || !user) return;

    const model = MODEL_MAP[`${mode}-${speed}`];
    const genId = crypto.randomUUID();

    // Build prompt with gender prefix from selected characters
    let finalPrompt = prompt.trim();
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

    setGenerations((prev) => [{ id: genId, status: "queued", prompt: finalPrompt, ratio, duration }, ...prev]);

    try {
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
              ? [...selectedCharacters.map(c => (c as any).reference_image_url || c.image_url).filter(Boolean), ...refImages]
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

      setGenerations((prev) => prev.map((g) => g.id === genId ? { ...g, status: "processing" } : g));

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("seedance-generate", {
        body: {
          model,
          prompt: finalPrompt,
          duration: parseInt(duration),
          quality,
          aspectRatio: ratio === "auto" ? undefined : ratio,
          generateAudio,
          imageUrls: mode === "startend" ? [startImage, endImage].filter(Boolean) : mode === "multiref" ? [...selectedCharacters.map(c => (c as any).reference_image_url || c.image_url).filter(Boolean), ...refImages] : undefined,
          videoUrls: mode === "multiref" && refVideos.length > 0 ? refVideos : undefined,
          audioUrls: mode === "multiref" && refAudios.length > 0 ? refAudios : undefined,
          jobId: jobData.id,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error || !data?.success) {
        setGenerations((prev) => prev.map((g) => g.id === genId ? { ...g, status: "failed", error: data?.error || "API error" } : g));
        return;
      }

      setGenerations((prev) => prev.map((g) => g.id === genId ? { ...g, taskId: data.taskId } : g));
      startPolling(genId, data.taskId, jobData.id, creditCost);
    } catch (err: any) {
      setGenerations((prev) => prev.map((g) => g.id === genId ? { ...g, status: "failed", error: err.message } : g));
    }
  }, [prompt, mode, speed, ratio, quality, duration, generateAudio, startImage, endImage, refImages, refVideos, refAudios, selectedCharacters, user, canGenerate, startPolling]);

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
            <h1 className="text-lg sm:text-xl font-bold text-white">Seedance 2.0</h1>
            <div className="flex rounded-lg border border-white/[0.06] bg-white/[0.03] p-[2px]">
              <button
                onClick={() => setGalleryTab("creations")}
                className={`rounded-md border px-3 py-1 text-[11px] font-medium transition-all duration-200 ${
                  galleryTab === "creations" ? "border-purple-500/30 bg-purple-500/20 text-purple-300 shadow-sm shadow-purple-500/10" : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
                }`}
              >
                Minhas Criações
              </button>
              <button
                onClick={() => setGalleryTab("library")}
                className={`rounded-md border px-3 py-1 text-[11px] font-medium transition-all duration-200 ${
                  galleryTab === "library" ? "border-purple-500/30 bg-purple-500/20 text-purple-300 shadow-sm shadow-purple-500/10" : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
                }`}
              >
                Biblioteca
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-white/5 bg-black/10 sm:min-h-[300px] lg:min-h-[420px]">
            {galleryTab === "creations" && (
              <>
                {galleryTab === "creations" && (
                  <div className="flex items-center gap-1.5 px-3 pt-2">
                    <Clock className="h-3 w-3 text-gray-600" />
                    <span className="text-[10px] text-gray-600">Vídeos armazenados por 24h</span>
                  </div>
                )}
                {loadingCreations ? (
                  <div className="flex h-full min-h-[320px] items-center justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-white/40" />
                  </div>
                ) : generations.length === 0 ? (
                  <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-6 text-center lg:min-h-[420px] gap-3">
                    <p className="text-sm text-gray-500">Você ainda não tem criações. Veja os modelos ou digite um prompt para começar.</p>
                    <button
                      onClick={() => setGalleryTab("library")}
                      className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs font-medium text-purple-300 transition-all hover:bg-purple-500/20"
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
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-white/40" />
                  </div>
                ) : libraryItems.length === 0 ? (
                  <div className="flex h-full min-h-[320px] items-center justify-center px-6 text-center lg:min-h-[420px]">
                    <p className="text-sm text-gray-500">Nenhum vídeo na biblioteca ainda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 p-3">
                    {libraryItems.map((gen) => (
                      <VideoCard key={gen.id} gen={gen} onPreview={setPreviewGen} onDownload={handleDownloadVideo} />
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
                  <button
                    onClick={() => previewGen.videoUrl && handleDownloadVideo(previewGen.videoUrl, previewGen.prompt)}
                    className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
                    title="Baixar vídeo"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setPreviewGen(null)}
                    className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
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
                <p className="mt-2 text-xs text-gray-400 truncate shrink-0">{previewGen.prompt} · {previewGen.ratio} · {previewGen.duration}s</p>
              </div>
            </div>
          )}

  // Handle mode change: clear library-added inputs
  const handleModeChange = useCallback((newMode: Mode) => {
    if (newMode !== mode && libraryVideoRefs.length > 0) {
      setRefVideos(prev => prev.filter(v => !libraryVideoRefs.includes(v)));
      setLibraryVideoRefs([]);
    }
    setMode(newMode);
  }, [mode, libraryVideoRefs]);


          <div className="mt-4 shrink-0 rounded-2xl border border-white/5 bg-[#0a0a18]/95 p-3 backdrop-blur-sm">
            {mode !== "text" && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {mode === "startend" && (
                  <>
                    <span className="text-[10px] uppercase tracking-wider text-gray-500">Imagens</span>
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
                    <span className="text-[10px] uppercase tracking-wider text-gray-500">Refs</span>
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
                      className="flex h-[28px] cursor-pointer items-center justify-center gap-1 rounded-lg border border-dashed border-white/10 bg-black/30 px-3 text-[10px] text-gray-500 transition-colors hover:border-white/20"
                    >
                      {refVideos.length > 0 ? `${refVideos.length} vídeo(s)` : "+ vídeo"}
                      {refVideos.length > 0 && <button onClick={(e) => { e.stopPropagation(); setRefVideos([]); }} className="ml-1 text-gray-400 hover:text-white">×</button>}
                    </div>
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleAudioDrop}
                      onClick={() => refAudios.length < 3 && openFilePicker("audio/mpeg,audio/wav", (url) => setRefAudios((prev) => [...prev, url]))}
                      className="flex h-[28px] cursor-pointer items-center justify-center gap-1 rounded-lg border border-dashed border-white/10 bg-black/30 px-3 text-[10px] text-gray-500 transition-colors hover:border-white/20"
                    >
                      {refAudios.length > 0 ? `${refAudios.length} áudio(s)` : "+ áudio"}
                      {refAudios.length > 0 && <button onClick={(e) => { e.stopPropagation(); setRefAudios([]); }} className="ml-1 text-gray-400 hover:text-white">×</button>}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* MOBILE: Generate button FIRST, then prompt, then controls */}
            {isMobile ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate() || uploading}
                  className={`group relative flex h-[44px] items-center justify-center gap-2 overflow-hidden rounded-xl px-4 text-sm font-semibold transition-all duration-300 ${
                    canGenerate() && !uploading
                      ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/25 active:scale-[0.98]"
                      : "cursor-not-allowed bg-white/5 text-gray-600"
                  }`}
                >
                  {uploading ? "Enviando..." : (
                    <>
                      <span className="text-base">✦</span>
                      Gerar vídeo
                      <span className="flex items-center gap-1 rounded-md bg-white/10 px-1.5 py-0.5 text-[11px]">
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
                  className="min-h-[60px] max-h-[100px] resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600 focus:border-purple-500/40"
                  rows={2}
                />
                <span className="text-right text-[10px] text-gray-600 -mt-1">{prompt.length}/2000</span>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-gray-600">Modo</span>
                    <div className="flex rounded-lg border border-white/[0.06] bg-white/[0.03] p-[2px]">
                      {MODE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setMode(option.value)}
                          className={`rounded-md border px-2 py-1 text-[10px] font-medium transition-all ${
                            mode === option.value ? "border-purple-500/30 bg-purple-500/20 text-purple-300" : "border-transparent text-gray-500"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[10px] font-medium text-gray-500"
                  >
                    Config
                    <ChevronDown className={`h-3 w-3 transition-transform ${showSettings ? "rotate-180" : ""}`} />
                  </button>

                  {mode === "multiref" && (
                    <CharacterPicker
                      selectedCharacters={selectedCharacters}
                      onCharactersChange={setSelectedCharacters}
                      maxCharacters={3}
                      compact
                      useSavedCharacters
                    />
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
                    className="min-h-[80px] max-h-[160px] min-w-0 resize-y rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none transition-all placeholder:text-gray-600 focus:border-purple-500/40 focus:min-h-[100px]"
                    rows={3}
                  />
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleGenerate}
                      disabled={!canGenerate() || uploading}
                      className={`group relative flex h-[48px] items-center justify-center gap-2.5 overflow-hidden rounded-xl px-5 text-sm font-semibold transition-all duration-300 ${
                        canGenerate() && !uploading
                          ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]"
                          : "cursor-not-allowed bg-white/5 text-gray-600"
                      }`}
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-white/10 to-purple-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      {uploading ? "Enviando..." : (
                        <>
                          <span className="text-base">✦</span>
                          Gerar vídeo
                          <span className="flex items-center gap-1 rounded-md bg-white/10 px-1.5 py-0.5 text-[11px]">
                            <Coins className="h-3 w-3" />
                            {creditCost}
                          </span>
                        </>
                      )}
                    </button>
                    <span className="text-right text-[10px] text-gray-600">{prompt.length}/2000</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 pb-1">
                  <div className="flex items-center gap-1.5 group/ctrl">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-gray-600">Modo</span>
                    <div className="flex rounded-lg border border-white/[0.06] bg-white/[0.03] p-[2px]">
                      {MODE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setMode(option.value)}
                          className={`rounded-md border px-3 py-1 text-[11px] font-medium transition-all duration-200 hover:scale-[1.04] ${
                            mode === option.value ? "border-purple-500/30 bg-purple-500/20 text-purple-300 shadow-sm shadow-purple-500/10" : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
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
                    className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-gray-500 transition-all duration-200 hover:border-white/[0.1] hover:text-gray-300"
                  >
                    Configurações
                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showSettings ? "rotate-180" : ""}`} />
                  </button>

                  {mode === "multiref" && (
                    <>
                      <div className="h-4 w-px bg-white/[0.06]" />
                      <CharacterPicker
                        selectedCharacters={selectedCharacters}
                        onCharactersChange={setSelectedCharacters}
                        maxCharacters={3}
                        compact
                        useSavedCharacters
                      />
                    </>
                  )}
                </div>
              </>
            )}

            {showSettings && (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-gray-600">Motor</span>
                  <div className="flex rounded-lg border border-white/[0.06] bg-white/[0.03] p-[2px]">
                    {(["standard", "fast"] as Speed[]).map((value) => (
                      <button
                        key={value}
                        onClick={() => setSpeed(value)}
                        className={`rounded-md border px-3 py-1 text-[11px] font-medium transition-all ${
                          speed === value ? "border-purple-500/30 bg-purple-500/20 text-purple-300" : "border-transparent text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        {value === "standard" ? "Standard" : "Fast"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-4 w-px bg-white/[0.06]" />

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-gray-600">Tamanho</span>
                  <select
                    value={ratio}
                    onChange={(e) => setRatio(e.target.value as Ratio)}
                    className="hidden sm:block rounded-lg border border-white/[0.08] bg-black px-2 py-1 text-[11px] text-white outline-none hover:border-purple-500/30 cursor-pointer [&>option]:bg-black [&>option]:text-white"
                  >
                    {RATIOS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                  <button
                    onClick={() => setShowRatioModal(true)}
                    className="sm:hidden rounded-lg border border-white/[0.08] bg-black px-2 py-1 text-[11px] text-white"
                  >
                    {RATIOS.find((r) => r.value === ratio)?.label || ratio}
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-gray-600">Qualidade</span>
                  <div className="flex rounded-lg border border-white/[0.06] bg-white/[0.03] p-[2px]">
                    {(["480p", "720p"] as Quality[]).map((value) => (
                      <button
                        key={value}
                        onClick={() => setQuality(value)}
                        className={`rounded-md border px-3 py-1 text-[11px] font-medium transition-all ${
                          quality === value ? "border-purple-500/30 bg-purple-500/20 text-purple-300" : "border-transparent text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 min-w-[140px]">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-gray-600">Duração</span>
                  <input
                    type="range" min={4} max={15} step={1}
                    value={parseInt(duration)}
                    onChange={(e) => setDuration(e.target.value)}
                    className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-purple-500 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-400"
                  />
                  <span className="min-w-[24px] text-center text-[11px] font-medium text-purple-300">{duration}s</span>
                </div>

                <div className="h-4 w-px bg-white/[0.06]" />

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-gray-600">Áudio</span>
                  <button
                    onClick={() => setGenerateAudio(!generateAudio)}
                    className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${generateAudio ? "bg-emerald-500" : "bg-white/10"}`}
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
          <div className="w-full max-w-sm rounded-t-2xl border-t border-white/10 bg-[#111] p-4 animate-in slide-in-from-bottom duration-200" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 text-center text-xs font-medium text-gray-400">Escolha o tamanho</p>
            <div className="grid grid-cols-2 gap-2">
              {RATIOS.map((item) => (
                <button
                  key={item.value}
                  onClick={() => { setRatio(item.value); setShowRatioModal(false); }}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-medium transition-all ${
                    ratio === item.value
                      ? "border-purple-500/40 bg-purple-500/20 text-purple-300"
                      : "border-white/[0.08] bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowRatioModal(false)} className="mt-3 w-full rounded-xl bg-white/[0.06] py-2 text-xs text-gray-400">Fechar</button>
          </div>
        </div>
      )}
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
      <div className="relative overflow-hidden rounded-lg border border-white/10" style={{ width: dimension, height: dimension }}>
        <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
        {onRemove && (
          <button onClick={onRemove} className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-[10px] text-gray-300 hover:text-white">×</button>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onClick={onClickUpload}
      className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-white/10 bg-black/30 text-base text-gray-500 transition-all duration-200 hover:border-purple-500/30 hover:bg-purple-500/5 hover:text-purple-400 hover:scale-105"
      style={{ width: dimension, height: dimension }}
    >
      +
    </div>
  );
}

function VideoCard({ gen, onPreview, onDownload }: { gen: Generation; onPreview: (g: Generation) => void; onDownload?: (url: string, prompt: string) => void }) {
  return (
    <div
      className={`relative flex aspect-video items-center justify-center overflow-hidden rounded-xl cursor-pointer group ${
        gen.status === "queued" ? "border border-dashed border-white/10" : "border border-white/10 bg-[#1a1a2e]"
      }`}
      onClick={() => gen.status === "completed" && gen.videoUrl && onPreview(gen)}
    >
      {gen.status === "completed" && gen.videoUrl && (
        <>
          <HoverVideo src={gen.videoUrl} prompt={gen.prompt} ratio={gen.ratio} duration={gen.duration} />
          <button
            onClick={(e) => { e.stopPropagation(); onDownload?.(gen.videoUrl!, gen.prompt); }}
            className="absolute top-2 right-2 z-10 rounded-full bg-black/60 p-1.5 text-white/70 opacity-0 group-hover:opacity-100 transition-all hover:bg-black/80 hover:text-white hover:scale-110"
            title="Baixar vídeo"
          >
            <Download className="h-4 w-4" />
          </button>
        </>
      )}
      {gen.status === "processing" && (
        <div className="text-center">
          <div className="mx-auto mb-1.5 h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-white/40" />
          <span className="text-[10px] text-gray-500">gerando...</span>
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
      <span className="absolute bottom-1.5 left-2 text-[9px] text-white/70 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {prompt.length > 40 ? prompt.slice(0, 40) + "…" : prompt} · {ratio} · {duration}s
      </span>
    </>
  );
}
