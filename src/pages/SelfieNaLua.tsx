import { useState, useRef, useCallback, useEffect } from "react";
import { Loader2, Download, RefreshCw, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ToolsHeader from "@/components/ToolsHeader";
import defaultSceneRef from "@/assets/selfie-lua-default-scene.png";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useCredits } from "@/contexts/CreditsContext";
import { useAIToolSettings } from "@/hooks/useAIToolSettings";

import { useProcessingButton } from "@/hooks/useProcessingButton";
import { useQueueSessionCleanup } from "@/hooks/useQueueSessionCleanup";
import { useJobStatusSync } from "@/hooks/useJobStatusSync";
import { useJobPendingWatchdog } from "@/hooks/useJobPendingWatchdog";
import { useAIJob } from "@/contexts/AIJobContext";
import { useResilientDownload } from "@/hooks/useResilientDownload";
import { optimizeForAI } from "@/hooks/useImageOptimizer";
import { createJob, startJob, checkActiveJob, cancelJob as centralCancelJob, uploadToStorage } from "@/ai/JobManager";
import { getAIErrorMessage } from "@/utils/errorMessages";
import ArcanoClonerAuthModal from "@/components/arcano-cloner/ArcanoClonerAuthModal";
import ActiveJobBlockModal from "@/components/ai-tools/ActiveJobBlockModal";
import { DownloadProgressOverlay } from "@/components/ai-tools";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

const PLACE_OPTIONS = [
  { label: "McDonald's", value: "McDonald's com arcos dourados icônicos, letreiro iluminado e fachada reconhecível" },
  { label: "Lanchonete / fast food", value: "lanchonete fast food com fachada colorida e letreiro luminoso" },
  { label: "Bar / boteco", value: "bar ou boteco com mesas na calçada e placa de néon" },
  { label: "Shopping / loja", value: "shopping com fachada de vidro e lojas com vitrines iluminadas" },
  { label: "Posto de gasolina", value: "posto de gasolina com toldos e bombas de combustível" },
  { label: "Academia", value: "academia gym com logo e janelas de vidro" },
  { label: "Restaurante", value: "restaurante com fachada rústica e placa iluminada" },
  { label: "Hotel", value: "hotel com entrada principal e marquise iluminada" },
  { label: "Outro", value: "__outro__" },
];

const EXPRESSION_OPTIONS = [
  { label: "Grito épico", value: "mouth wide open in a raw primal scream of excitement, eyes wild and bulging" },
  { label: "Gargalhada", value: "huge genuine laughing expression, eyes squinting, mouth wide open, teeth fully showing" },
  { label: "Sorriso amplo", value: "massive natural smile, eyes bright and joyful, radiating happiness" },
  { label: "Surpresa", value: "shocked expression, eyebrows raised high, mouth slightly open, eyes wide in disbelief" },
  { label: "Raiva épica", value: "intense angry expression, brow deeply furrowed, gritting teeth, fierce stare" },
  { label: "Sedutor", value: "confident smirk, one eyebrow subtly raised, mysterious and cool" },
  { label: "Expressão séria", value: "calm stoic neutral expression, composed, serious, looking directly into the lens" },
  { label: "Piscadela", value: "playful winking, one eye closed, slight mischievous smile" },
  { label: "Terror total", value: "terrified expression, wide eyes, mouth agape, pure panic on face" },
  { label: "Choro dramático", value: "dramatic crying, tears streaming down face, over-the-top emotional" },
];

const STYLE_OPTIONS = [
  { label: "Realista", value: "hyperrealistic photojournalism, 8K, cold blue-grey shadows, warm golden highlights on face, ISO 800 grain, no oversaturation" },
  { label: "Épico", value: "cinematic epic, high contrast, dramatic shadows, teal and orange color grade, blockbuster atmosphere" },
  { label: "NASA", value: "NASA documentary style, desaturated, authentic space photography, archival quality" },
];

const SIZE_OPTIONS = [
  { label: "Wide", value: "16:9", desc: "16:9" },
  { label: "Feed Vert.", value: "3:4", desc: "3:4" },
  { label: "Stories", value: "9:16", desc: "9:16" },
];

interface UploadState {
  done: boolean;
  thumb: string;
  file: File | null;
}

export default function SelfieNaLua() {
  const navigate = useNavigate();
  const { user } = usePremiumStatus();
  const { refetch: refetchCredits, checkBalance } = useCredits();
  const { getCreditCost } = useAIToolSettings();
  const { isSubmitting, startSubmit, endSubmit } = useProcessingButton();
  const { registerJob } = useAIJob();
  const { isDownloading, progress: downloadProgress, download: resilientDownload } = useResilientDownload();

  const [uploads, setUploads] = useState<Record<string, UploadState>>({
    face: { done: false, thumb: "", file: null },
    place: { done: false, thumb: "", file: null },
    ref: { done: true, thumb: defaultSceneRef, file: null },
  });
  const [placeType, setPlaceType] = useState("__outro__");
  const [expression, setExpression] = useState(EXPRESSION_OPTIONS[0].value);
  const [activeStyle, setActiveStyle] = useState(0);
  const [activeSize, setActiveSize] = useState(0);

  // Job state — cloned from GerarImagemTool
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number>(0);
  const [progress, setProgress] = useState(0);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNoCredits, setShowNoCredits] = useState(false);
  const [showActiveJobModal, setShowActiveJobModal] = useState(false);
  const [activeJobToolName, setActiveJobToolName] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | undefined>();
  const [activeStatus, setActiveStatus] = useState<string | undefined>();
  const [showReconcileButton, setShowReconcileButton] = useState(false);

  const faceRef = useRef<HTMLInputElement>(null);
  const placeRef = useRef<HTMLInputElement>(null);
  const refRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef(crypto.randomUUID());
  const reconcileTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const fileRefs: Record<string, React.RefObject<HTMLInputElement>> = {
    face: faceRef, place: placeRef, ref: refRef,
  };

  // Load default scene reference as File on mount
  useEffect(() => {
    fetch(defaultSceneRef)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'default-scene.png', { type: 'image/png' });
        setUploads(prev => ({ ...prev, ref: { done: true, thumb: defaultSceneRef, file } }));
      })
      .catch(() => {});
  }, []);

  const creditCost = getCreditCost('gerar_imagem', 100);
  const isProcessing = ['pending', 'starting', 'running', 'queued'].includes(status);

  // Session cleanup
  useQueueSessionCleanup(sessionIdRef.current, status);

  // Triple sync
  useJobStatusSync({
    jobId,
    toolType: 'image_generator',
    enabled: isProcessing && !!jobId,
    onStatusChange: (update) => {
      setStatus(update.status);
      if (update.position !== undefined) setQueuePosition(update.position);
      if (update.currentStep) {
        const stepProgress: Record<string, number> = {
          'validating': 10, 'downloading_ref_image_1': 15, 'uploading_ref_image_1': 20,
          'consuming_credits': 30, 'delegating_to_queue': 40, 'starting': 50, 'running': 60,
        };
        setProgress(stepProgress[update.currentStep] || progress);
      }
      if (update.status === 'completed' && update.outputUrl) {
        setResultUrl(update.outputUrl);
        setProgress(100);
        refetchCredits();
        toast.success('Selfie gerada com sucesso!');
      } else if (update.status === 'failed') {
        setErrorMessage(update.errorMessage || 'Erro ao gerar selfie');
        const errInfo = getAIErrorMessage(update.errorMessage || 'Erro desconhecido');
        toast.error(errInfo.message);
        refetchCredits();
      }
    },
    onGlobalStatusChange: (s) => {
      if (jobId) registerJob(jobId, 'image_generator', s);
    },
  });

  // Pending watchdog
  useJobPendingWatchdog({
    jobId,
    toolType: 'image_generator',
    enabled: status === 'pending',
    onJobFailed: (msg: string) => {
      setStatus('failed');
      setErrorMessage(msg || 'Servidor não respondeu. Tente novamente.');
      refetchCredits();
    },
  });

  // Reconcile timer
  useEffect(() => {
    if (reconcileTimerRef.current) clearTimeout(reconcileTimerRef.current);
    if (isProcessing && jobId) {
      reconcileTimerRef.current = setTimeout(() => setShowReconcileButton(true), 60000);
    } else {
      setShowReconcileButton(false);
    }
    return () => { if (reconcileTimerRef.current) clearTimeout(reconcileTimerRef.current); };
  }, [isProcessing, jobId]);

  const handleUpload = useCallback((key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploads((prev) => ({ ...prev, [key]: { done: true, thumb: ev.target?.result as string, file } }));
    };
    reader.readAsDataURL(file);
  }, []);

  const buildPrompt = useCallback(() => {
    const style = STYLE_OPTIONS[activeStyle].value;
    const sizeInfo = SIZE_OPTIONS[activeSize];
    return `POV extreme close-up selfie shot of an astronaut on the lunar surface. The astronaut's face must match the reference face exactly — same facial structure, skin texture, beard stubble and eye color. Expression: ${expression}. Face fills the lower-center frame pressed close to the camera lens, fisheye wide-angle perspective.

Spacesuit: heavily weathered NASA-style EVA suit, grey-white with dust and grime, mission patches on shoulders, chest control unit with toggle switches. One gloved hand reaching toward the camera in the foreground, slightly motion-blurred.

Background: ${placeType === '__outro__' ? 'the exact building/establishment shown in the uploaded place reference photo, reproduced faithfully on the lunar surface — same architecture, signage, colors and proportions as in the reference image' : `a fully built ${placeType}`} constructed directly on the lunar surface — same architecture, signage and proportions as in the reference image, adapted to the lunar environment with no atmosphere, hard single-source solar shadows and vacuum blackness above. The structure sits naturally on grey cratered regolith.

Sky: deep absolute black, zero atmosphere. Milky Way galaxy core visible as a luminous streak in the upper frame. Earth in the upper-left corner — vivid blue oceans and white cloud systems against the void.

Lighting: single harsh directional sunlight from upper-left, sharp hard-edged shadows with no diffusion. Strong rim light on the right side of the spacesuit. Helmet visor partially reflects the lunar landscape. Face lit by two small interior helmet LED lights. No ambient light, extreme contrast.

Camera: Canon EOS R5, 14mm f/2.8 ultra-wide, 1/2000s, ISO 800. Focus on face, background sharp with slight depth-of-field fall-off. Image aspect ratio: ${sizeInfo.desc}. ${style}.`;
  }, [placeType, expression, activeStyle, activeSize]);

  const resetJobState = () => {
    setJobId(null);
    setStatus('idle');
    setResultUrl(null);
    setErrorMessage(null);
    setQueuePosition(0);
    setProgress(0);
    setShowReconcileButton(false);
  };

  // Generate — cloned from GerarImagemTool
  const handleGenerate = async () => {
    if (!user?.id) { setShowAuthModal(true); return; }
    
    // Validate required uploads
    if (!uploads.face.done || !uploads.face.file) {
      toast.error('Envie a foto do seu rosto antes de gerar.');
      return;
    }
    
    if (!startSubmit()) return;

    resetJobState();

    try {
      // Check active job
      const activeCheck = await checkActiveJob(user.id);
      if (activeCheck.hasActiveJob) {
        setActiveJobToolName(activeCheck.activeTool || 'outra ferramenta');
        setActiveJobId(activeCheck.activeJobId);
        setActiveStatus(activeCheck.activeStatus);
        setShowActiveJobModal(true);
        endSubmit();
        return;
      }

      // Check credits
      const freshCredits = await checkBalance();
      if (freshCredits < creditCost) {
        toast.error('Créditos insuficientes para gerar a selfie.');
        setShowNoCredits(true);
        endSubmit();
        return;
      }
      setShowNoCredits(false);

      setStatus('pending');
      setProgress(5);

      // Collect uploaded files and optimize/upload them
      const uploadKeys = ['face', 'place', 'ref'];
      const uploadedUrls: string[] = [];
      const filesToUpload = uploadKeys.filter(k => uploads[k].done && uploads[k].file).map(k => uploads[k].file!);

      for (let i = 0; i < filesToUpload.length; i++) {
        toast.info(`Otimizando imagem ${i + 1}/${filesToUpload.length}...`);
        const optimized = await optimizeForAI(filesToUpload[i]);
        const uploadResult = await uploadToStorage(optimized.file, 'image-generator', user.id);
        if (!uploadResult.url) throw new Error(`Falha ao enviar imagem ${i + 1}`);
        uploadedUrls.push(uploadResult.url);
        setProgress(5 + Math.round((i + 1) / filesToUpload.length * 15));
      }

      const prompt = buildPrompt();
      const aspectRatio = SIZE_OPTIONS[activeSize].value;

      // Create job in DB
      const { jobId: newJobId, error: createError } = await createJob('image_generator', user.id, sessionIdRef.current, {
        prompt: prompt.trim(),
        aspect_ratio: aspectRatio,
        model: 'runninghub',
        input_urls: uploadedUrls,
      });

      if (createError || !newJobId) {
        throw new Error(createError || 'Falha ao criar job');
      }

      setJobId(newJobId);
      registerJob(newJobId, 'image_generator', 'pending');

      // Start job via edge function
      const result = await startJob('image_generator', newJobId, {
        referenceImageUrls: uploadedUrls,
        aspectRatio,
        creditCost,
        prompt: prompt.trim(),
      });

      if (!result.success) {
        if (result.code === 'INSUFFICIENT_CREDITS') {
          setShowAuthModal(true);
          resetJobState();
        } else {
          setStatus('failed');
          setErrorMessage(result.error || 'Erro desconhecido');
          const errInfo = getAIErrorMessage(result.error || 'Erro desconhecido');
          toast.error(errInfo.message);
        }
        endSubmit();
        return;
      }

      if (result.queued) {
        setStatus('queued');
        setQueuePosition(result.position || 0);
        toast.info(`Na fila — posição ${result.position}`);
      }

    } catch (error: any) {
      console.error('[SelfieNaLua] Error:', error);
      setStatus('failed');
      setErrorMessage(error.message || 'Erro ao gerar selfie');
      const errInfo = getAIErrorMessage(error.message || 'Erro desconhecido');
      toast.error(errInfo.message);

      if (jobId) {
        try {
          await supabase.rpc('mark_pending_job_as_failed' as any, { p_table_name: 'image_generator_jobs', p_job_id: jobId });
        } catch {}
      }
    } finally {
      endSubmit();
    }
  };

  const handleReconcile = async () => {
    if (!jobId) return;
    toast.info('Verificando status...');
    try {
      const { data } = await supabase.functions.invoke('runninghub-image-generator/reconcile', {
        body: { jobId },
      });
      if (data?.reconciled && data?.status === 'completed' && data?.outputUrl) {
        setStatus('completed');
        setResultUrl(data.outputUrl);
        setProgress(100);
        toast.success('Selfie recuperada!');
        refetchCredits();
      } else if (data?.reconciled && data?.status === 'failed') {
        setStatus('failed');
        setErrorMessage('Falha confirmada pelo servidor');
        toast.error('Geração falhou.');
        refetchCredits();
      } else if (data?.alreadyFinalized) {
        if (data.status === 'completed' && data.outputUrl) {
          setStatus('completed');
          setResultUrl(data.outputUrl);
          setProgress(100);
        }
      } else {
        toast.info('Ainda processando...');
      }
    } catch {
      toast.error('Erro ao verificar status');
    }
  };

  const handleDownload = () => {
    if (resultUrl) {
      resilientDownload({ url: resultUrl, filename: `selfie-lua-${Date.now()}.png` });
    }
  };

  const handleNewGeneration = () => {
    resetJobState();
  };

  const handleCancel = async () => {
    if (!jobId) return;
    const result = await centralCancelJob('image_generator', jobId);
    if (result.success) {
      resetJobState();
      toast.success(result.refundedAmount > 0 ? `Cancelado. ${result.refundedAmount} créditos estornados.` : 'Cancelado.');
      refetchCredits();
    }
  };

  const uploadItems: { key: string; emoji: string; name: string; sub: string }[] = [
    { key: "face", emoji: "👤", name: "Seu rosto", sub: "Substitui o astronauta" },
    { key: "place", emoji: "🏢", name: "Local / estabelecimento", sub: "Aparece ao fundo na lua" },
    { key: "ref", emoji: "🌙", name: "Referência de cena", sub: "Composição e ângulo" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
        .snl-app *,.snl-app *::before,.snl-app *::after{box-sizing:border-box;margin:0;padding:0}
        .snl-app{
          --bg:#0c0d1a;--panel:#101220;--card:#161829;--input-bg:#0e0f1e;
          --border:rgba(255,255,255,0.06);--border-hl:rgba(124,58,237,0.45);
          --purple:#7c3aed;--purple-lt:#a78bfa;
          --text-1:#eeeef5;--text-2:#7b7fa8;--text-3:#3d4060;
          --green:#34d399;--radius:12px;
          display:grid;grid-template-columns:320px 1fr;height:calc(100vh - 56px);
          font-family:'DM Sans',sans-serif;font-size:14px;color:var(--text-1);background:var(--bg);
          overflow:hidden;
        }
        .snl-sidebar{
          background:var(--panel);border-right:1px solid var(--border);
          display:flex;flex-direction:column;padding:32px 24px 28px;gap:26px;overflow-y:auto;
        }
        .snl-brand{display:flex;flex-direction:column;gap:4px}
        .snl-brand-tag{font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--purple-lt);opacity:0.65}
        .snl-brand h1{font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:var(--text-1);letter-spacing:-0.4px}
        .snl-sep{height:1px;background:var(--border)}
        .snl-field{display:flex;flex-direction:column;gap:8px}
        .snl-label{font-size:10.5px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text-2)}
        .snl-upload-item{
          display:flex;align-items:center;gap:12px;padding:10px 13px;
          background:var(--input-bg);border:1px solid var(--border);border-radius:var(--radius);
          cursor:pointer;transition:border-color 0.18s;position:relative;overflow:hidden;
        }
        .snl-upload-item:hover{border-color:rgba(124,58,237,0.3)}
        .snl-upload-item.done{border-color:rgba(52,211,153,0.3)}
        .snl-upload-item input{position:absolute;inset:0;opacity:0;cursor:pointer}
        .snl-upload-thumb{
          width:32px;height:32px;border-radius:7px;object-fit:cover;flex-shrink:0;
          border:1px solid var(--border);
        }
        .snl-upload-placeholder{
          width:32px;height:32px;border-radius:7px;background:var(--card);
          border:1px dashed rgba(124,58,237,0.3);
          display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;
        }
        .snl-upload-info{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}
        .snl-upload-name{font-size:12.5px;font-weight:500;color:var(--text-1)}
        .snl-upload-sub{font-size:11px;color:var(--text-3)}
        .snl-upload-item.done .snl-upload-sub{color:var(--green)}
        .snl-upload-arrow{font-size:12px;color:var(--text-3);transition:color 0.18s}
        .snl-upload-item.done .snl-upload-arrow{color:var(--green)}
        .snl-sel-wrap{position:relative}
        .snl-sel-wrap select{
          width:100%;padding:10px 34px 10px 12px;background:var(--input-bg);
          border:1px solid var(--border);border-radius:var(--radius);color:var(--text-1);
          font-family:'DM Sans',sans-serif;font-size:13px;appearance:none;cursor:pointer;
          transition:border-color 0.18s;
        }
        .snl-sel-wrap select:focus{outline:none;border-color:var(--border-hl)}
        .snl-sel-wrap select option{background:#181a2e}
        .snl-sel-wrap::after{
          content:'';position:absolute;right:12px;top:50%;transform:translateY(-50%);
          border-left:4px solid transparent;border-right:4px solid transparent;
          border-top:5px solid var(--text-2);pointer-events:none;
        }
        .snl-style-pills{display:flex;gap:6px}
        .snl-style-pill{
          flex:1;padding:8px 0;border-radius:9px;border:1px solid var(--border);
          background:var(--input-bg);color:var(--text-2);font-family:'Syne',sans-serif;
          font-size:11px;font-weight:700;cursor:pointer;text-align:center;
          transition:all 0.15s;letter-spacing:0.2px;
        }
        .snl-style-pill:hover{border-color:rgba(124,58,237,0.3);color:var(--text-1)}
        .snl-style-pill.on{background:rgba(124,58,237,0.14);border-color:var(--border-hl);color:var(--purple-lt)}
        .snl-cta{
          margin-top:auto;width:100%;padding:13px 0;border:none;border-radius:var(--radius);
          background:var(--purple);color:#fff;font-family:'Syne',sans-serif;
          font-size:13.5px;font-weight:700;letter-spacing:0.3px;cursor:pointer;
          display:flex;align-items:center;justify-content:center;gap:8px;
          transition:opacity 0.18s,transform 0.12s;box-shadow:0 4px 24px rgba(124,58,237,0.28);
        }
        .snl-cta:hover{opacity:0.87}
        .snl-cta:active{transform:scale(0.98)}
        .snl-cta:disabled{opacity:0.5;cursor:not-allowed;transform:none}
        .snl-main{display:flex;flex-direction:column;background:var(--bg);min-height:100vh;overflow-y:auto}
        .snl-topbar{
          display:flex;align-items:center;padding:20px 36px;
          border-bottom:1px solid var(--border);gap:7px;
        }
        .snl-dot{width:9px;height:9px;border-radius:50%}
        .snl-d-r{background:#ef4444}.snl-d-y{background:#f59e0b}.snl-d-g{background:#22c55e}
        .snl-content{
          flex:1;display:flex;align-items:flex-start;justify-content:center;
          padding:44px 36px 60px;
        }
        .snl-empty{
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          gap:14px;min-height:380px;text-align:center;
        }
        .snl-empty-icon{
          width:58px;height:58px;border-radius:18px;background:var(--panel);
          border:1px solid var(--border);display:flex;align-items:center;justify-content:center;
          font-size:26px;
        }
        .snl-empty h2{font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:var(--text-1)}
        .snl-empty p{font-size:13px;color:var(--text-2);max-width:260px;line-height:1.7}
        .snl-credit-badge{
          display:inline-flex;align-items:center;gap:4px;
          font-size:11px;color:var(--purple-lt);opacity:0.8;
        }
      `}</style>

      <ToolsHeader title="Moon Selfie" subtitle="Gere selfies épicas na lua com IA" showBackButton={true} />
      <div className="snl-app">
        <aside className="snl-sidebar">
          <div className="snl-brand">
            <span className="snl-brand-tag">Arcano · VoxVisual</span>
            <h1>Moon Selfie</h1>
          </div>

          <div className="snl-sep" />

          <div className="snl-field">
            <span className="snl-label">Referências</span>
            {uploadItems.map((item) => {
              const u = uploads[item.key];
              return (
                <div
                  key={item.key}
                  className={`snl-upload-item${u.done ? " done" : ""}`}
                  onClick={(e) => { if ((e.target as HTMLElement).tagName !== 'INPUT') fileRefs[item.key].current?.click(); }}
                >
                  <input
                    type="file"
                    ref={fileRefs[item.key] as any}
                    accept="image/*"
                    onChange={(e) => handleUpload(item.key, e)}
                  />
                  {u.done ? (
                    <img className="snl-upload-thumb" src={u.thumb} alt="" />
                  ) : (
                    <div className="snl-upload-placeholder">{item.emoji}</div>
                  )}
                  <div className="snl-upload-info">
                    <span className="snl-upload-name">{item.name}</span>
                    <span className="snl-upload-sub">{u.done ? "✓ Carregado" : item.sub}</span>
                  </div>
                  <span className="snl-upload-arrow">{u.done ? "✓" : "↑"}</span>
                </div>
              );
            })}
          </div>

          <div className="snl-sep" />

          <div className="snl-field">
            <span className="snl-label">Tipo de local</span>
            <div className="snl-sel-wrap">
              <select value={placeType} onChange={(e) => setPlaceType(e.target.value)}>
                {PLACE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="snl-field">
            <span className="snl-label">Expressão</span>
            <div className="snl-sel-wrap">
              <select value={expression} onChange={(e) => setExpression(e.target.value)}>
                {EXPRESSION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="snl-field">
            <span className="snl-label">Estilo visual</span>
            <div className="snl-style-pills">
              {STYLE_OPTIONS.map((s, i) => (
                <button
                  key={s.label}
                  className={`snl-style-pill${activeStyle === i ? " on" : ""}`}
                  onClick={() => setActiveStyle(i)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="snl-field">
            <span className="snl-label">Tamanho da imagem</span>
            <div className="snl-style-pills">
              {SIZE_OPTIONS.map((s, i) => (
                <button
                  key={s.value}
                  className={`snl-style-pill${activeSize === i ? " on" : ""}`}
                  onClick={() => setActiveSize(i)}
                >
                  {s.label}
                  <span style={{ display: 'block', fontSize: 9, opacity: 0.6, marginTop: 2 }}>{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            className="snl-cta"
            onClick={handleGenerate}
            disabled={isSubmitting || isProcessing}
          >
            {isSubmitting || isProcessing ? (
              <>
                <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                {status === 'queued' ? 'Na fila...' : 'Gerando...'}
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                Gerar Selfie
                <span className="snl-credit-badge">
                  ✦ {creditCost}
                </span>
              </>
            )}
          </button>
        </aside>

        <main className="snl-main">
          <div className="snl-topbar">
            <span className="snl-dot snl-d-r" />
            <span className="snl-dot snl-d-y" />
            <span className="snl-dot snl-d-g" />
          </div>

          <div className="snl-content">
            {isDownloading && <DownloadProgressOverlay isVisible={isDownloading} progress={downloadProgress} />}

            {resultUrl ? (
              <div style={{ width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(124,58,237,0.2)', background: 'rgba(0,0,0,0.3)' }}>
                  <TransformWrapper>
                    <TransformComponent wrapperClass="!w-full" contentClass="!w-full">
                      <img src={resultUrl} alt="Selfie na Lua" style={{ width: '100%', height: 'auto' }} />
                    </TransformComponent>
                  </TransformWrapper>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button
                    onClick={handleDownload}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                      borderRadius: 9, border: '1px solid rgba(52,211,153,0.4)', background: 'rgba(52,211,153,0.15)',
                      color: '#34d399', fontFamily: "'Syne',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    <Download style={{ width: 14, height: 14 }} /> Baixar
                  </button>
                  <button
                    onClick={handleNewGeneration}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                      borderRadius: 9, border: '1px solid rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.1)',
                      color: '#a78bfa', fontFamily: "'Syne',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Nova Selfie
                  </button>
                </div>
              </div>
            ) : isProcessing ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, color: '#a78bfa' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', border: '2px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader2 style={{ width: 32, height: 32, color: '#d946ef', animation: 'spin 1s linear infinite' }} />
                </div>
                {status === 'queued' && queuePosition > 0 ? (
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 14, fontWeight: 500 }}>Na fila — posição {queuePosition}</p>
                    <p style={{ fontSize: 12, color: '#7b7fa8', marginTop: 4 }}>Aguardando vaga...</p>
                  </div>
                ) : (
                  <p style={{ fontSize: 14 }}>Gerando sua selfie...</p>
                )}
                <div style={{ width: 192, height: 6, borderRadius: 9999, background: 'rgba(124,58,237,0.2)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 9999, background: '#d946ef', transition: 'width 0.7s', width: `${progress}%` }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {status === 'queued' && (
                    <button onClick={handleCancel} style={{ fontSize: 12, color: '#f87171', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>Cancelar</button>
                  )}
                  {showReconcileButton && (
                    <button onClick={handleReconcile} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <RefreshCw style={{ width: 12, height: 12 }} /> Verificar status
                    </button>
                  )}
                </div>
              </div>
            ) : status === 'failed' ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: '#f87171' }}>
                <p style={{ fontSize: 14, textAlign: 'center', fontWeight: 500 }}>{(() => { const info = getAIErrorMessage(errorMessage || ''); return info.message; })()}</p>
                <p style={{ fontSize: 12, textAlign: 'center', color: 'rgba(248,113,113,0.7)' }}>{(() => { const info = getAIErrorMessage(errorMessage || ''); return info.solution; })()}</p>
                <button onClick={resetJobState} style={{ fontSize: 12, color: '#a78bfa', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>Tentar novamente</button>
              </div>
            ) : showNoCredits ? (
              <div className="snl-empty">
                <div className="snl-empty-icon"><Coins style={{ width: 28, height: 28, color: '#f59e0b' }} /></div>
                <h2>Créditos insuficientes</h2>
                <p>Você não tem créditos suficientes para gerar uma selfie. Recarregue seus créditos para continuar.</p>
                <button
                  onClick={() => navigate('/planos-2')}
                  style={{
                    marginTop: 8, padding: '10px 24px', borderRadius: 10,
                    background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', color: '#fff',
                    border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                    fontFamily: "'Syne', sans-serif",
                  }}
                >
                  Recarregar créditos
                </button>
              </div>
            ) : (
              <div className="snl-empty">
                <div className="snl-empty-icon">🌙</div>
                <h2>Sua selfie aparece aqui</h2>
                <p>Configure as opções ao lado e clique em Gerar Selfie.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      <ArcanoClonerAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={() => { setShowAuthModal(false); refetchCredits(); }}
        redirectPath="/selfie-na-lua"
      />
      <ActiveJobBlockModal isOpen={showActiveJobModal} onClose={() => setShowActiveJobModal(false)} activeTool={activeJobToolName} activeJobId={activeJobId} activeStatus={activeStatus} onCancelJob={centralCancelJob} />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
