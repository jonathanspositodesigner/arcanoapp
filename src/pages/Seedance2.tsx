import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage } from "@/hooks/useStorageUpload";
import AppLayout from "@/components/layout/AppLayout";
import { Coins } from "lucide-react";

type Mode = "text" | "startend" | "multiref";
type Speed = "standard" | "fast";
type Ratio = "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9" | "auto";
type Quality = "720p" | "480p";
type Duration = "4" | "5" | "6" | "8" | "10" | "12" | "15";

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

const CREDIT_COSTS: Record<string, number> = {
  "text-standard": 800,
  "text-fast": 500,
  "startend-standard": 1000,
  "startend-fast": 700,
  "multiref-standard": 1200,
  "multiref-fast": 900,
};

const RATIOS: { value: Ratio; label: string }[] = [
  { value: "16:9", label: "16:9 Paisagem" },
  { value: "9:16", label: "9:16 Retrato" },
  { value: "1:1", label: "1:1 Quadrado" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
  { value: "21:9", label: "21:9 Ultra-wide" },
  { value: "auto", label: "Auto" },
];

const DURATIONS: Duration[] = ["4", "5", "6", "8", "10", "12", "15"];

const MODE_OPTIONS: { value: Mode; label: string; desc: string }[] = [
  { value: "text", label: "Só Prompt", desc: "Texto → vídeo" },
  { value: "startend", label: "Start + End", desc: "Imagens de início e fim" },
  { value: "multiref", label: "Multi-ref", desc: "Múltiplas referências" },
];

export default function Seedance2() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<Mode>("text");
  const [ratio, setRatio] = useState<Ratio>("16:9");
  const [quality, setQuality] = useState<Quality>("720p");
  const [duration, setDuration] = useState<Duration>("5");
  const [speed, setSpeed] = useState<Speed>("standard");
  const [generateAudio, setGenerateAudio] = useState(true);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [startImage, setStartImage] = useState<string | null>(null);
  const [endImage, setEndImage] = useState<string | null>(null);
  const [refImages, setRefImages] = useState<string[]>([]);
  const [refVideos, setRefVideos] = useState<string[]>([]);
  const [refAudios, setRefAudios] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const pollTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const creditCost = CREDIT_COSTS[`${mode}-${speed}`] || 500;

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

  const startPolling = useCallback((genId: string, taskId: string, jobId: string) => {
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
          body: { taskId, jobId },
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
    if (mode === "multiref" && refImages.length === 0) return false;
    return true;
  }, [prompt, mode, startImage, refImages]);

  const handleGenerate = useCallback(async () => {
    if (!canGenerate() || !user) return;

    const model = MODEL_MAP[`${mode}-${speed}`];
    const genId = crypto.randomUUID();

    setGenerations((prev) => [{ id: genId, status: "queued", prompt: prompt.trim(), ratio, duration }, ...prev]);

    try {
      const { data: jobData, error: insertError } = await supabase
        .from("seedance_jobs")
        .insert({
          user_id: user.id,
          model,
          prompt: prompt.trim(),
          duration: parseInt(duration),
          quality,
          aspect_ratio: ratio === "auto" ? undefined : ratio,
          generate_audio: generateAudio,
          input_image_urls: mode === "startend"
            ? ([startImage, endImage].filter(Boolean) as string[])
            : mode === "multiref"
              ? refImages
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
          prompt: prompt.trim(),
          duration: parseInt(duration),
          quality,
          aspectRatio: ratio === "auto" ? undefined : ratio,
          generateAudio,
          imageUrls: mode === "startend" ? [startImage, endImage].filter(Boolean) : mode === "multiref" ? refImages : undefined,
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
      startPolling(genId, data.taskId, jobData.id);
    } catch (err: any) {
      setGenerations((prev) => prev.map((g) => g.id === genId ? { ...g, status: "failed", error: err.message } : g));
    }
  }, [prompt, mode, speed, ratio, quality, duration, generateAudio, startImage, endImage, refImages, refVideos, refAudios, user, canGenerate, startPolling]);

  const truncate = (value: string, length: number) => value.length > length ? `${value.slice(0, length)}…` : value;

  return (
    <AppLayout fullScreen>
      <div className="flex flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">Seedance 2.0</h1>
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-400">
              {generations.length} gerações
            </span>
          </div>

          <div className="min-h-[280px] overflow-y-auto rounded-2xl border border-white/5 bg-black/10 lg:min-h-[360px]">
            {generations.length === 0 ? (
              <div className="flex min-h-[280px] items-center justify-center px-6 text-center lg:min-h-[360px]">
                <p className="text-sm text-gray-500">Nenhuma geração ainda. Comece descrevendo um vídeo abaixo.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 p-2 lg:grid-cols-4">
                {generations.map((gen) => (
                  <div
                    key={gen.id}
                    className={`relative flex aspect-video items-center justify-center overflow-hidden rounded-xl ${
                      gen.status === "queued" ? "border border-dashed border-white/10" : "border border-white/10 bg-[#1a1a2e]"
                    }`}
                  >
                    {gen.status === "completed" && gen.videoUrl && (
                      <>
                        <video src={gen.videoUrl} controls className="h-full w-full rounded-xl object-cover" />
                        <span className="absolute bottom-1.5 left-2 text-[9px] text-gray-500">
                          {truncate(gen.prompt, 30)} · {gen.ratio} · {gen.duration}s
                        </span>
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
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#0a0a18]/95 p-3 backdrop-blur-sm">
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
                      {refImages.length < 9 && (
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

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_200px]">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Descreva o vídeo que deseja gerar..."
                className="h-[44px] min-w-0 resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-purple-500/40"
                rows={1}
              />

              <button
                onClick={handleGenerate}
                disabled={!canGenerate() || uploading}
                className={`flex h-[44px] items-center justify-center gap-2.5 rounded-xl px-5 text-sm font-semibold transition-all xl:min-w-[200px] ${
                  canGenerate() && !uploading
                    ? "bg-white text-[#0D0221] shadow-lg shadow-white/10 hover:bg-gray-100"
                    : "cursor-not-allowed bg-white/5 text-gray-600"
                }`}
              >
                {uploading ? "Enviando..." : (
                  <>
                    Gerar vídeo
                    <span className="flex items-center gap-1 text-xs opacity-60">
                      <Coins className="h-3.5 w-3.5" />
                      {creditCost}
                    </span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 overflow-x-auto pb-1">
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
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-600">Modo</span>
                <div className="flex rounded-lg border border-white/[0.06] bg-white/[0.03] p-[2px]">
                  {MODE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setMode(option.value)}
                      className={`rounded-md border px-3 py-1 text-[11px] font-medium transition-all ${
                        mode === option.value ? "border-purple-500/30 bg-purple-500/20 text-purple-300" : "border-transparent text-gray-500 hover:text-gray-300"
                      }`}
                      title={option.desc}
                    >
                      {option.label}
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
                  className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[11px] text-gray-300 outline-none transition-colors hover:border-white/[0.12]"
                >
                  {RATIOS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-600">Qualidade</span>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value as Quality)}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[11px] text-gray-300 outline-none transition-colors hover:border-white/[0.12]"
                >
                  <option value="720p">720p</option>
                  <option value="480p">480p</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-600">Duração</span>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value as Duration)}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[11px] text-gray-300 outline-none transition-colors hover:border-white/[0.12]"
                >
                  {DURATIONS.map((item) => <option key={item} value={item}>{item}s</option>)}
                </select>
              </div>

              <button
                onClick={() => setGenerateAudio(!generateAudio)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] transition-colors ${
                  generateAudio
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                    : "border-white/[0.06] bg-white/[0.03] text-gray-500"
                }`}
              >
                <div className={`h-1.5 w-1.5 rounded-full ${generateAudio ? "bg-emerald-400" : "bg-gray-600"}`} />
                Áudio
              </button>
            </div>
          </div>
        </div>
      </div>
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
      className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-white/10 bg-black/30 text-base text-gray-500 transition-colors hover:border-white/20"
      style={{ width: dimension, height: dimension }}
    >
      +
    </div>
  );
}
