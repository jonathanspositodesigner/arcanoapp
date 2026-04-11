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
    folder: string
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
      handleFileUpload(file, (url) => setRefVideos(prev => [...prev, url]), "seedance-refs");
    }
  }, [handleFileUpload, refVideos.length]);

  const handleAudioDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && /\.(mp3|wav)$/i.test(file.name) && refAudios.length < 3) {
      handleFileUpload(file, (url) => setRefAudios(prev => [...prev, url]), "seedance-refs");
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
      count++;
      if (count > 60) {
        clearInterval(timer);
        delete pollTimers.current[genId];
        setGenerations(prev => prev.map(g => g.id === genId ? { ...g, status: "failed", error: "Timeout" } : g));
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
          setGenerations(prev => prev.map(g => g.id === genId ? { ...g, status: "completed", videoUrl: data.outputUrl } : g));
        } else if (data?.status === "failed") {
          clearInterval(timer);
          delete pollTimers.current[genId];
          setGenerations(prev => prev.map(g => g.id === genId ? { ...g, status: "failed", error: data.error } : g));
        } else {
          setGenerations(prev => prev.map(g => g.id === genId ? { ...g, pollCount: count } : g));
        }
      } catch {}
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
    setGenerations(prev => [{ id: genId, status: "queued", prompt: prompt.trim(), ratio, duration }, ...prev]);

    try {
      const { data: jobData, error: insertError } = await supabase
        .from("seedance_jobs")
        .insert({
          user_id: user.id, model, prompt: prompt.trim(),
          duration: parseInt(duration), quality,
          aspect_ratio: ratio === "auto" ? undefined : ratio,
          generate_audio: generateAudio,
          input_image_urls: mode === "startend" ? [startImage, endImage].filter(Boolean) as string[] : mode === "multiref" ? refImages : undefined,
          input_video_urls: mode === "multiref" && refVideos.length > 0 ? refVideos : undefined,
          input_audio_urls: mode === "multiref" && refAudios.length > 0 ? refAudios : undefined,
          status: "queued",
        })
        .select("id").single();

      if (insertError || !jobData) {
        setGenerations(prev => prev.map(g => g.id === genId ? { ...g, status: "failed", error: "Failed to create job" } : g));
        return;
      }
      setGenerations(prev => prev.map(g => g.id === genId ? { ...g, status: "processing" } : g));

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("seedance-generate", {
        body: {
          model, prompt: prompt.trim(), duration: parseInt(duration), quality,
          aspectRatio: ratio === "auto" ? undefined : ratio, generateAudio,
          imageUrls: mode === "startend" ? [startImage, endImage].filter(Boolean) : mode === "multiref" ? refImages : undefined,
          videoUrls: mode === "multiref" && refVideos.length > 0 ? refVideos : undefined,
          audioUrls: mode === "multiref" && refAudios.length > 0 ? refAudios : undefined,
          jobId: jobData.id,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error || !data?.success) {
        setGenerations(prev => prev.map(g => g.id === genId ? { ...g, status: "failed", error: data?.error || "API error" } : g));
        return;
      }
      setGenerations(prev => prev.map(g => g.id === genId ? { ...g, taskId: data.taskId } : g));
      startPolling(genId, data.taskId, jobData.id);
    } catch (err: any) {
      setGenerations(prev => prev.map(g => g.id === genId ? { ...g, status: "failed", error: err.message } : g));
    }
  }, [prompt, mode, speed, ratio, quality, duration, generateAudio, startImage, endImage, refImages, refVideos, refAudios, user, canGenerate, startPolling]);

  const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n) + "…" : s;

  return (
    <AppLayout fullScreen>
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col h-full overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-4 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-white">Seedance 2.0</h1>
            <span className="text-[11px] text-gray-400 border border-white/10 bg-white/5 rounded-md px-2 py-0.5">
              {generations.length} gerações
            </span>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' }}>
            {generations.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-500">Nenhuma geração ainda. Comece descrevendo um vídeo abaixo.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {generations.map(gen => (
                  <div key={gen.id} className={`aspect-video rounded-xl overflow-hidden relative flex items-center justify-center ${
                    gen.status === "queued" ? "border border-dashed border-white/10" : "bg-[#1a1a2e] border border-white/10"
                  }`}>
                    {gen.status === "completed" && gen.videoUrl && (
                      <>
                        <video src={gen.videoUrl} controls className="w-full h-full object-cover rounded-xl" />
                        <span className="absolute bottom-1.5 left-2 text-[9px] text-gray-500">
                          {truncate(gen.prompt, 30)} · {gen.ratio} · {gen.duration}s
                        </span>
                      </>
                    )}
                    {gen.status === "processing" && (
                      <div className="text-center">
                        <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-white/40 animate-spin mx-auto mb-1.5" />
                        <span className="text-[10px] text-gray-500">gerando...</span>
                      </div>
                    )}
                    {gen.status === "failed" && (
                      <span className="text-[10px] text-red-400/60 px-3 text-center">{gen.error || "Falhou"}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom - Controls */}
        <div className="shrink-0 border-t border-white/10 bg-[#0D0221]">
          <div className="px-4 py-3 flex gap-3">
            {/* Left - Prompt & Settings */}
            <div className="flex-1 flex flex-col gap-2.5 min-w-0">
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Descreva o vídeo que deseja gerar..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 resize-vertical outline-none focus:border-white/20 transition-colors"
                style={{ minHeight: 64 }}
              />

              {/* Row 1: Motor + Modo */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase text-gray-500 font-medium">Motor</span>
                  <div className="flex bg-black/40 border border-white/10 rounded-lg p-0.5">
                    {(["standard", "fast"] as Speed[]).map(s => (
                      <button
                        key={s}
                        onClick={() => setSpeed(s)}
                        className={`px-3 py-1.5 text-[11px] rounded-md font-medium transition-all ${
                          speed === s ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"
                        }`}
                      >
                        {s === "standard" ? "Standard" : "Fast"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase text-gray-500 font-medium">Modo</span>
                  <div className="flex bg-black/40 border border-white/10 rounded-lg p-0.5">
                    {MODE_OPTIONS.map(m => (
                      <button
                        key={m.value}
                        onClick={() => setMode(m.value)}
                        className={`px-3 py-1.5 text-[11px] rounded-md font-medium transition-all ${
                          mode === m.value ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"
                        }`}
                        title={m.desc}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2: Tamanho + Qualidade + Duração + Áudio */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase text-gray-500 font-medium">Tamanho</span>
                  <select
                    value={ratio}
                    onChange={e => setRatio(e.target.value as Ratio)}
                    className="bg-black/40 border border-white/10 rounded-md text-gray-200 text-[11px] px-1.5 py-1 outline-none"
                  >
                    {RATIOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase text-gray-500 font-medium">Qualidade</span>
                  <select
                    value={quality}
                    onChange={e => setQuality(e.target.value as Quality)}
                    className="bg-black/40 border border-white/10 rounded-md text-gray-200 text-[11px] px-1.5 py-1 outline-none"
                  >
                    <option value="720p">720p</option>
                    <option value="480p">480p</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase text-gray-500 font-medium">Duração</span>
                  <select
                    value={duration}
                    onChange={e => setDuration(e.target.value as Duration)}
                    className="bg-black/40 border border-white/10 rounded-md text-gray-200 text-[11px] px-1.5 py-1 outline-none"
                  >
                    {DURATIONS.map(d => <option key={d} value={d}>{d}s</option>)}
                  </select>
                </div>

                <button
                  onClick={() => setGenerateAudio(!generateAudio)}
                  className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
                    generateAudio
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-white/10 bg-black/40 text-gray-500"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${generateAudio ? "bg-emerald-400" : "bg-gray-600"}`} />
                  Áudio
                </button>
              </div>
            </div>

            {/* Right - Uploads + Generate */}
            <div className="w-[164px] shrink-0 flex flex-col gap-2 justify-end">
              {mode === "startend" && (
                <>
                  <span className="text-[10px] uppercase text-gray-500 font-medium">Imagens</span>
                  <div className="flex gap-1.5">
                    <UploadSlot url={startImage} onRemove={() => setStartImage(null)} onDrop={e => handleImageDrop(e, url => setStartImage(url))} onClickUpload={() => openFilePicker("image/jpeg,image/png,image/webp", url => setStartImage(url))} />
                    <UploadSlot url={endImage} onRemove={() => setEndImage(null)} onDrop={e => handleImageDrop(e, url => setEndImage(url))} onClickUpload={() => openFilePicker("image/jpeg,image/png,image/webp", url => setEndImage(url))} />
                  </div>
                </>
              )}

              {mode === "multiref" && (
                <>
                  <span className="text-[10px] uppercase text-gray-500 font-medium">Referências</span>
                  <div className="flex gap-1 flex-wrap">
                    {refImages.map((url, i) => (
                      <UploadSlot key={i} url={url} onRemove={() => setRefImages(prev => prev.filter((_, j) => j !== i))} size={44} />
                    ))}
                    {refImages.length < 9 && (
                      <UploadSlot url={null} onClickUpload={() => openFilePicker("image/jpeg,image/png,image/webp", url => setRefImages(prev => [...prev, url]))} onDrop={e => handleImageDrop(e, url => setRefImages(prev => [...prev, url]))} size={44} />
                    )}
                  </div>
                  <div onDragOver={e => e.preventDefault()} onDrop={handleVideoDrop} onClick={() => refVideos.length < 3 && openFilePicker("video/mp4,video/quicktime", url => setRefVideos(prev => [...prev, url]))}
                    className="h-[30px] w-full border border-dashed border-white/10 rounded-lg bg-black/30 flex items-center justify-center cursor-pointer text-[10px] text-gray-500 gap-1 hover:border-white/20 transition-colors">
                    {refVideos.length > 0 ? `${refVideos.length} vídeo(s)` : "+ vídeo"}
                    {refVideos.length > 0 && <button onClick={e => { e.stopPropagation(); setRefVideos([]); }} className="text-gray-400 ml-1 hover:text-white">×</button>}
                  </div>
                  <div onDragOver={e => e.preventDefault()} onDrop={handleAudioDrop} onClick={() => refAudios.length < 3 && openFilePicker("audio/mpeg,audio/wav", url => setRefAudios(prev => [...prev, url]))}
                    className="h-[30px] w-full border border-dashed border-white/10 rounded-lg bg-black/30 flex items-center justify-center cursor-pointer text-[10px] text-gray-500 gap-1 hover:border-white/20 transition-colors">
                    {refAudios.length > 0 ? `${refAudios.length} áudio(s)` : "+ áudio"}
                    {refAudios.length > 0 && <button onClick={e => { e.stopPropagation(); setRefAudios([]); }} className="text-gray-400 ml-1 hover:text-white">×</button>}
                  </div>
                </>
              )}

              <button
                onClick={handleGenerate}
                disabled={!canGenerate() || uploading}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  canGenerate() && !uploading
                    ? "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white hover:from-purple-400 hover:to-fuchsia-400 shadow-lg shadow-purple-500/20"
                    : "bg-white/5 text-gray-500 cursor-not-allowed"
                }`}
              >
                {uploading ? "Enviando..." : (
                  <>
                    Gerar vídeo
                    <span className="flex items-center gap-0.5 text-[11px] opacity-80">
                      <Coins className="w-3 h-3" />
                      {creditCost}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function UploadSlot({ url, onRemove, onDrop, onClickUpload, size }: {
  url?: string | null;
  onRemove?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onClickUpload?: () => void;
  size?: number;
}) {
  const s = size || 68;
  if (url) {
    return (
      <div className="relative rounded-lg overflow-hidden border border-white/10" style={{ width: s, height: s }}>
        <img src={url} className="w-full h-full object-cover" />
        {onRemove && (
          <button onClick={onRemove} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-gray-300 text-[10px] flex items-center justify-center hover:text-white">×</button>
        )}
      </div>
    );
  }
  return (
    <div onDragOver={e => e.preventDefault()} onDrop={onDrop} onClick={onClickUpload}
      className="rounded-lg border border-dashed border-white/10 bg-black/30 flex items-center justify-center cursor-pointer text-gray-500 text-base hover:border-white/20 transition-colors"
      style={{ width: s, height: s }}>
      +
    </div>
  );
}
