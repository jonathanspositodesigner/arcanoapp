import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage } from "@/hooks/useStorageUpload";

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

const RATIOS: Ratio[] = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "auto"];
const DURATIONS: Duration[] = ["4", "5", "6", "8", "10", "12", "15"];

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
    if (result.success && result.url) {
      onSuccess(result.url);
    }
  }, []);

  const handleImageDrop = useCallback((
    e: React.DragEvent,
    onSuccess: (url: string) => void
  ) => {
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
        setGenerations(prev => prev.map(g =>
          g.id === genId ? { ...g, status: "failed", error: "Timeout" } : g
        ));
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
          setGenerations(prev => prev.map(g =>
            g.id === genId ? { ...g, status: "completed", videoUrl: data.outputUrl } : g
          ));
        } else if (data?.status === "failed") {
          clearInterval(timer);
          delete pollTimers.current[genId];
          setGenerations(prev => prev.map(g =>
            g.id === genId ? { ...g, status: "failed", error: data.error } : g
          ));
        } else {
          setGenerations(prev => prev.map(g =>
            g.id === genId ? { ...g, pollCount: count } : g
          ));
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

    const newGen: Generation = {
      id: genId,
      status: "queued",
      prompt: prompt.trim(),
      ratio,
      duration,
    };

    setGenerations(prev => [newGen, ...prev]);

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
            ? [startImage, endImage].filter(Boolean) as string[]
            : mode === "multiref" ? refImages : undefined,
          input_video_urls: mode === "multiref" && refVideos.length > 0 ? refVideos : undefined,
          input_audio_urls: mode === "multiref" && refAudios.length > 0 ? refAudios : undefined,
          status: "queued",
        })
        .select("id")
        .single();

      if (insertError || !jobData) {
        setGenerations(prev => prev.map(g =>
          g.id === genId ? { ...g, status: "failed", error: "Failed to create job" } : g
        ));
        return;
      }

      setGenerations(prev => prev.map(g =>
        g.id === genId ? { ...g, status: "processing" } : g
      ));

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
          imageUrls: mode === "startend"
            ? [startImage, endImage].filter(Boolean)
            : mode === "multiref" ? refImages : undefined,
          videoUrls: mode === "multiref" && refVideos.length > 0 ? refVideos : undefined,
          audioUrls: mode === "multiref" && refAudios.length > 0 ? refAudios : undefined,
          jobId: jobData.id,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error || !data?.success) {
        setGenerations(prev => prev.map(g =>
          g.id === genId ? { ...g, status: "failed", error: data?.error || "API error" } : g
        ));
        return;
      }

      setGenerations(prev => prev.map(g =>
        g.id === genId ? { ...g, taskId: data.taskId } : g
      ));

      startPolling(genId, data.taskId, jobData.id);
    } catch (err: any) {
      setGenerations(prev => prev.map(g =>
        g.id === genId ? { ...g, status: "failed", error: err.message } : g
      ));
    }
  }, [prompt, mode, speed, ratio, quality, duration, generateAudio, startImage, endImage, refImages, refVideos, refAudios, user, canGenerate, startPolling]);

  const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n) + "…" : s;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#080808", color: "#f0f0f0", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px 4px" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#f0f0f0" }}>Seedance 2.0</span>
          <span style={{ fontSize: 11, color: "#888", border: "1px solid #2a2a2a", background: "#111", borderRadius: 6, padding: "2px 8px" }}>
            {generations.length} gerações
          </span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {generations.map(gen => (
              <div key={gen.id} style={{
                aspectRatio: "16/9",
                borderRadius: 8,
                background: gen.status === "queued" ? "transparent" : "#111",
                border: gen.status === "queued" ? "1px dashed #1e1e1e" : "0.5px solid #1e1e1e",
                position: "relative",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {gen.status === "completed" && gen.videoUrl && (
                  <>
                    <video
                      src={gen.videoUrl}
                      controls
                      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }}
                    />
                    <span style={{
                      position: "absolute", bottom: 4, left: 6,
                      fontSize: 9, color: "#3a3a3a",
                    }}>
                      {truncate(gen.prompt, 30)} · {gen.ratio} · {gen.duration}s
                    </span>
                  </>
                )}
                {gen.status === "processing" && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%",
                      border: "2px solid #1e1e1e", borderTopColor: "#444",
                      animation: "spin 1s linear infinite",
                      margin: "0 auto 6px",
                    }} />
                    <span style={{ fontSize: 10, color: "#2a2a2a" }}>gerando...</span>
                  </div>
                )}
                {gen.status === "failed" && (
                  <span style={{ fontSize: 10, color: "#662222", padding: 8, textAlign: "center" }}>
                    {gen.error || "Falhou"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        padding: "14px 16px",
        borderTop: "0.5px solid #1e1e1e",
        display: "flex",
        gap: 12,
      }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Descreva o vídeo que deseja gerar..."
            style={{
              background: "#0f0f0f", border: "1px solid #222", borderRadius: 8,
              padding: "10px 12px", minHeight: 72, resize: "vertical",
              color: "#e8e8e8", fontSize: 13, outline: "none",
              fontFamily: "inherit", width: "100%",
            }}
          />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <LabelSelect label="modo" value={mode} onChange={v => setMode(v as Mode)} options={[
              { value: "text", label: "só prompt" },
              { value: "startend", label: "start + end frame" },
              { value: "multiref", label: "multi-referência" },
            ]} />
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10, color: "#3a3a3a", textTransform: "uppercase", marginRight: 4 }}>ratio</span>
              {RATIOS.map(r => (
                <button
                  key={r}
                  onClick={() => setRatio(r)}
                  style={{
                    fontSize: 11, padding: "3px 8px", borderRadius: 6, cursor: "pointer",
                    background: ratio === r ? "#161616" : "transparent",
                    border: `1px solid ${ratio === r ? "#3a3a3a" : "#1e1e1e"}`,
                    color: ratio === r ? "#e0e0e0" : "#3a3a3a",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <LabelSelect label="qualidade" value={quality} onChange={v => setQuality(v as Quality)} options={[
              { value: "720p", label: "720p" },
              { value: "480p", label: "480p" },
            ]} />
            <LabelSelect label="duração" value={duration} onChange={v => setDuration(v as Duration)} options={
              DURATIONS.map(d => ({ value: d, label: `${d}s` }))
            } />
            <LabelSelect label="velocidade" value={speed} onChange={v => setSpeed(v as Speed)} options={[
              { value: "standard", label: "standard" },
              { value: "fast", label: "fast" },
            ]} />
          </div>
        </div>

        <div style={{ width: 164, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {mode === "startend" && (
            <>
              <span style={{ fontSize: 10, textTransform: "uppercase", color: "#3a3a3a" }}>imagens</span>
              <div style={{ display: "flex", gap: 6 }}>
                <UploadSlot url={startImage} onUpload={url => setStartImage(url)} onRemove={() => setStartImage(null)} onDrop={e => handleImageDrop(e, url => setStartImage(url))} onClickUpload={() => openFilePicker("image/jpeg,image/png,image/webp", url => setStartImage(url))} />
                <UploadSlot url={endImage} onUpload={url => setEndImage(url)} onRemove={() => setEndImage(null)} onDrop={e => handleImageDrop(e, url => setEndImage(url))} onClickUpload={() => openFilePicker("image/jpeg,image/png,image/webp", url => setEndImage(url))} />
              </div>
            </>
          )}

          {mode === "multiref" && (
            <>
              <span style={{ fontSize: 10, textTransform: "uppercase", color: "#3a3a3a" }}>referências</span>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {refImages.map((url, i) => (
                  <UploadSlot key={i} url={url} onRemove={() => setRefImages(prev => prev.filter((_, j) => j !== i))} size={48} />
                ))}
                {refImages.length < 9 && (
                  <UploadSlot
                    url={null}
                    onClickUpload={() => openFilePicker("image/jpeg,image/png,image/webp", url => setRefImages(prev => [...prev, url]))}
                    onDrop={e => handleImageDrop(e, url => setRefImages(prev => [...prev, url]))}
                    size={48}
                  />
                )}
              </div>
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleVideoDrop}
                onClick={() => refVideos.length < 3 && openFilePicker("video/mp4,video/quicktime", url => setRefVideos(prev => [...prev, url]))}
                style={{
                  height: 34, width: "100%", border: "1px dashed #1e1e1e", borderRadius: 6,
                  background: "#0c0c0c", display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", fontSize: 10, color: "#2a2a2a", gap: 4,
                }}
              >
                {refVideos.length > 0 ? `${refVideos.length} vídeo(s)` : "+ vídeo"}
                {refVideos.length > 0 && (
                  <button onClick={e => { e.stopPropagation(); setRefVideos([]); }} style={{ color: "#444", marginLeft: 4, cursor: "pointer", background: "none", border: "none", fontSize: 12 }}>×</button>
                )}
              </div>
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleAudioDrop}
                onClick={() => refAudios.length < 3 && openFilePicker("audio/mpeg,audio/wav", url => setRefAudios(prev => [...prev, url]))}
                style={{
                  height: 34, width: "100%", border: "1px dashed #1e1e1e", borderRadius: 6,
                  background: "#0c0c0c", display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", fontSize: 10, color: "#2a2a2a", gap: 4,
                }}
              >
                {refAudios.length > 0 ? `${refAudios.length} áudio(s)` : "+ áudio"}
                {refAudios.length > 0 && (
                  <button onClick={e => { e.stopPropagation(); setRefAudios([]); }} style={{ color: "#444", marginLeft: 4, cursor: "pointer", background: "none", border: "none", fontSize: 12 }}>×</button>
                )}
              </div>
            </>
          )}

          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "#0f0f0f", border: "0.5px solid #1e1e1e", borderRadius: 8,
            padding: "8px 10px",
          }}>
            <span style={{ fontSize: 11, color: "#888" }}>áudio</span>
            <button
              onClick={() => setGenerateAudio(!generateAudio)}
              style={{
                width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
                background: generateAudio ? "#1d9e75" : "#1a1a1a",
                position: "relative", transition: "background 0.2s",
              }}
            >
              <div style={{
                width: 14, height: 14, borderRadius: "50%", background: "#fff",
                position: "absolute", top: 3,
                left: generateAudio ? 19 : 3,
                transition: "left 0.2s",
              }} />
            </button>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!canGenerate() || uploading}
            style={{
              width: "100%", padding: 11, borderRadius: 8, border: "none",
              background: canGenerate() && !uploading ? "#f0f0f0" : "#2a2a2a",
              color: canGenerate() && !uploading ? "#080808" : "#555",
              fontSize: 13, fontWeight: 500, cursor: canGenerate() && !uploading ? "pointer" : "not-allowed",
            }}
          >
            {uploading ? "Enviando..." : "Gerar vídeo"}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function LabelSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 10, color: "#3a3a3a", textTransform: "uppercase" }}>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          background: "#0f0f0f", border: "1px solid #222", borderRadius: 6,
          color: "#e0e0e0", fontSize: 11, padding: "3px 6px", outline: "none",
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function UploadSlot({ url, onUpload, onRemove, onDrop, onClickUpload, size }: {
  url?: string | null;
  onUpload?: (url: string) => void;
  onRemove?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onClickUpload?: () => void;
  size?: number;
}) {
  const s = size || 72;
  if (url) {
    return (
      <div style={{ width: s, height: s, borderRadius: 6, overflow: "hidden", position: "relative", border: "0.5px solid #1e1e1e" }}>
        <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {onRemove && (
          <button
            onClick={onRemove}
            style={{
              position: "absolute", top: 2, right: 2,
              width: 16, height: 16, borderRadius: "50%",
              background: "#000", color: "#888", border: "none",
              fontSize: 10, cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}
          >
            ×
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={e => e.preventDefault()}
      onDrop={onDrop}
      onClick={onClickUpload}
      style={{
        width: s, height: s, borderRadius: 6,
        border: "1px dashed #1e1e1e", background: "#0c0c0c",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", color: "#2a2a2a", fontSize: 16,
      }}
    >
      +
    </div>
  );
}
