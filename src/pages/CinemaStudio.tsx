import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Sparkles, Download, RotateCcw, Loader2, AlertCircle, Coins, X, Film, Zap, Video, Image, Music, FileVideo } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSmartBackNavigation } from '@/hooks/useSmartBackNavigation';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useCredits } from '@/contexts/CreditsContext';
import { useProcessingButton } from '@/hooks/useProcessingButton';
import { useAIJob } from '@/contexts/AIJobContext';
import AppLayout from '@/components/layout/AppLayout';
import NoCreditsModal from '@/components/upscaler/NoCreditsModal';
import ActiveJobBlockModal from '@/components/ai-tools/ActiveJobBlockModal';
import { NotificationPromptToast } from '@/components/ai-tools';
import { cancelJob as centralCancelJob, checkActiveJob } from '@/ai/JobManager';
import { useResilientDownload } from '@/hooks/useResilientDownload';
import { DownloadProgressOverlay } from '@/components/ai-tools';
import NavigationBlockerModal from '@/components/NavigationBlockerModal';
import { uploadToStorage } from '@/hooks/useStorageUpload';

// ━━━ MODELS ━━━
const MODELS = {
  'standard-t2v': 'seedance-2.0-text-to-video',
  'standard-i2v': 'seedance-2.0-image-to-video',
  'standard-r2v': 'seedance-2.0-reference-to-video',
  'fast-t2v': 'seedance-2.0-fast-text-to-video',
  'fast-i2v': 'seedance-2.0-fast-image-to-video',
  'fast-r2v': 'seedance-2.0-fast-reference-to-video',
} as const;

// ━━━ CREDIT COSTS ━━━
const CREDIT_COSTS: Record<string, Record<string, number>> = {
  standard: { '480p': 4.63, '720p': 10 },
  fast: { '480p': 2.5, '720p': 5 },
};

const DURATIONS = [4, 5, 8, 10, 15];
const QUALITIES = ['480p', '720p'];
const ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'];

type Speed = 'standard' | 'fast';
type GenType = 't2v' | 'i2v' | 'r2v';
type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

const CinemaStudio: React.FC = () => {
  const navigate = useNavigate();
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramentas-ia-aplicativo' });
  const { user } = usePremiumStatus();
  const { balance: credits, isLoading: creditsLoading, refetch: refetchCredits, checkBalance } = useCredits();
  const { registerJob, updateJobStatus, clearJob: clearGlobalJob } = useAIJob();
  const { isSubmitting, startSubmit, endSubmit } = useProcessingButton();
  const { isDownloading, progress: downloadProgress, download, cancel: cancelDownload } = useResilientDownload();

  // ━━━ STATE ━━━
  const [speed, setSpeed] = useState<Speed>('standard');
  const [genType, setGenType] = useState<GenType>('t2v');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(5);
  const [quality, setQuality] = useState('720p');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [generateAudio, setGenerateAudio] = useState(true);

  // Upload state
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [audios, setAudios] = useState<File[]>([]);

  // Processing state
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Modal state
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [noCreditsReason, setNoCreditsReason] = useState<'not_logged' | 'insufficient'>('insufficient');
  const [showActiveJobModal, setShowActiveJobModal] = useState(false);
  const [activeToolName, setActiveToolName] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | undefined>();
  const [activeStatus, setActiveStatus] = useState<string | undefined>();
  const [showNavBlocker, setShowNavBlocker] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const elapsedIntervalRef = useRef<number | null>(null);

  // ━━━ COMPUTED ━━━
  const modelKey = `${speed}-${genType}` as keyof typeof MODELS;
  const selectedModel = MODELS[modelKey];
  const costPerSecond = CREDIT_COSTS[speed][quality] || 10;
  const estimatedCredits = Math.ceil(costPerSecond * duration);
  const isProcessing = status === 'processing' || status === 'uploading';

  const maxImages = genType === 'i2v' ? 2 : genType === 'r2v' ? 9 : 0;
  const maxVideos = genType === 'r2v' ? 3 : 0;
  const maxAudios = genType === 'r2v' ? 3 : 0;

  const canGenerate = prompt.trim().length > 0
    && !isSubmitting
    && status !== 'processing'
    && status !== 'uploading'
    && (genType === 't2v' || images.length > 0);

  // ━━━ ELAPSED TIMER ━━━
  useEffect(() => {
    if (isProcessing) {
      setElapsedTime(0);
      elapsedIntervalRef.current = window.setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
        elapsedIntervalRef.current = null;
      }
    }
    return () => {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    };
  }, [isProcessing]);

  // Progress animation
  useEffect(() => {
    if (status !== 'processing') return;
    const interval = setInterval(() => {
      setProgress(prev => prev >= 90 ? prev : prev + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, [status]);

  // Register job globally
  useEffect(() => {
    if (jobId) registerJob(jobId, 'Cinema Studio', 'pending');
  }, [jobId, registerJob]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // ━━━ FILE HANDLERS ━━━
  const handleImageUpload = useCallback((files: FileList | null) => {
    if (!files) return;
    const max = maxImages - images.length;
    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    
    for (let i = 0; i < Math.min(files.length, max); i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} excede 10MB`); continue; }
      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    setImages(prev => [...prev, ...newFiles]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
  }, [images.length, maxImages]);

  const removeImage = useCallback((index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  }, [imagePreviews]);

  const handleVideoUpload = useCallback((files: FileList | null) => {
    if (!files) return;
    const max = maxVideos - videos.length;
    for (let i = 0; i < Math.min(files.length, max); i++) {
      const file = files[i];
      if (!file.type.startsWith('video/')) continue;
      if (file.size > 50 * 1024 * 1024) { toast.error(`${file.name} excede 50MB`); continue; }
      setVideos(prev => [...prev, file]);
    }
  }, [videos.length, maxVideos]);

  const handleAudioUpload = useCallback((files: FileList | null) => {
    if (!files) return;
    const max = maxAudios - audios.length;
    for (let i = 0; i < Math.min(files.length, max); i++) {
      const file = files[i];
      if (file.size > 20 * 1024 * 1024) { toast.error(`${file.name} excede 20MB`); continue; }
      setAudios(prev => [...prev, file]);
    }
  }, [audios.length, maxAudios]);

  // ━━━ POLLING ━━━
  const startPolling = useCallback((tId: string, jId: string, creditsToCharge: number) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('seedance-poll', {
          body: { taskId: tId, jobId: jId, creditsToCharge },
        });

        if (error) {
          console.error('[CinemaStudio] Poll error:', error);
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
          toast.success('Vídeo gerado com sucesso!');
        } else if (data.status === 'failed') {
          clearInterval(pollIntervalRef.current!);
          pollIntervalRef.current = null;
          setStatus('error');
          setErrorMessage(data.error || 'Falha na geração');
          updateJobStatus('failed');
          toast.error('Erro na geração do vídeo');
          endSubmit();
        } else if (data.progress) {
          setProgress(Math.max(progress, data.progress));
        }
      } catch (err) {
        console.error('[CinemaStudio] Poll exception:', err);
      }
    }, 5000);
  }, [endSubmit, refetchCredits, updateJobStatus, progress]);

  // ━━━ GENERATE ━━━
  const handleGenerate = async () => {
    if (!startSubmit()) return;

    if (!user?.id) {
      setNoCreditsReason('not_logged');
      setShowNoCreditsModal(true);
      endSubmit();
      return;
    }

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

    // Check credits
    const freshCredits = await checkBalance();
    if (freshCredits < estimatedCredits) {
      setNoCreditsReason('insufficient');
      setShowNoCreditsModal(true);
      endSubmit();
      return;
    }

    setErrorMessage(null);
    setStatus('uploading');
    setProgress(5);

    try {
      // Upload files to storage
      const timestamp = Date.now();
      const folder = `seedance/${user.id}/${timestamp}`;
      const uploadedImageUrls: string[] = [];
      const uploadedVideoUrls: string[] = [];
      const uploadedAudioUrls: string[] = [];

      if (images.length > 0) {
        setProgress(10);
        for (const file of images) {
          const result = await uploadToStorage(file, folder);
          if (result.success && result.url) uploadedImageUrls.push(result.url);
          else throw new Error(`Upload failed: ${result.error}`);
        }
      }

      if (videos.length > 0) {
        setProgress(20);
        for (const file of videos) {
          const result = await uploadToStorage(file, folder);
          if (result.success && result.url) uploadedVideoUrls.push(result.url);
          else throw new Error(`Upload failed: ${result.error}`);
        }
      }

      if (audios.length > 0) {
        setProgress(25);
        for (const file of audios) {
          const result = await uploadToStorage(file, folder);
          if (result.success && result.url) uploadedAudioUrls.push(result.url);
          else throw new Error(`Upload failed: ${result.error}`);
        }
      }

      setProgress(30);

      // Create job in DB
      const { data: job, error: jobError } = await supabase
        .from('seedance_jobs')
        .insert({
          user_id: user.id,
          model: selectedModel,
          prompt: prompt.trim(),
          duration,
          quality,
          aspect_ratio: aspectRatio,
          generate_audio: generateAudio,
          input_image_urls: uploadedImageUrls.length > 0 ? uploadedImageUrls : null,
          input_video_urls: uploadedVideoUrls.length > 0 ? uploadedVideoUrls : null,
          input_audio_urls: uploadedAudioUrls.length > 0 ? uploadedAudioUrls : null,
          status: 'pending',
        })
        .select()
        .single();

      if (jobError || !job) throw new Error('Erro ao criar job: ' + (jobError?.message || 'Unknown'));

      setJobId(job.id);
      setProgress(40);

      // Call edge function
      const { data: response, error: fnError } = await supabase.functions.invoke('seedance-generate', {
        body: {
          model: selectedModel,
          prompt: prompt.trim(),
          imageUrls: uploadedImageUrls,
          videoUrls: uploadedVideoUrls,
          audioUrls: uploadedAudioUrls,
          duration,
          quality,
          aspectRatio,
          generateAudio,
          jobId: job.id,
        },
      });

      if (fnError) throw new Error('Erro na função: ' + fnError.message);
      if (!response?.success) throw new Error(response?.error || 'Erro desconhecido');

      setTaskId(response.taskId);
      setProgress(50);
      setStatus('processing');

      // Start polling
      startPolling(response.taskId, job.id, estimatedCredits);

    } catch (error: any) {
      console.error('[CinemaStudio] Error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Erro desconhecido');
      toast.error('Erro ao gerar vídeo');
      endSubmit();
    }
  };

  // ━━━ DOWNLOAD ━━━
  const downloadResult = useCallback(async () => {
    if (!outputUrl) return;
    await download({
      url: outputUrl,
      filename: `cinema-studio-${Date.now()}.mp4`,
      mediaType: 'video',
      timeout: 30000,
      onSuccess: () => toast.success('Download concluído!'),
      locale: 'pt',
    });
  }, [outputUrl, download]);

  // ━━━ RESET ━━━
  const resetTool = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setPrompt('');
    setImages([]);
    setImagePreviews([]);
    setVideos([]);
    setAudios([]);
    setStatus('idle');
    setProgress(0);
    setOutputUrl(null);
    setErrorMessage(null);
    setJobId(null);
    setTaskId(null);
    setElapsedTime(0);
    endSubmit();
    clearGlobalJob();
  }, [endSubmit, clearGlobalJob, imagePreviews]);

  // ━━━ CANCEL ━━━
  const cancelGeneration = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setStatus('idle');
    setProgress(0);
    endSubmit();
    clearGlobalJob();
    toast.info('Geração cancelada');
  }, [endSubmit, clearGlobalJob]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Clear files when switching gen type
  useEffect(() => {
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setImages([]);
    setImagePreviews([]);
    setVideos([]);
    setAudios([]);
  }, [genType]);

  return (
    <AppLayout fullScreen>
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-4 flex flex-col h-full overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 lg:gap-5 flex-1 min-h-0">

          {/* ━━━ LEFT PANEL ━━━ */}
          <div className="lg:col-span-2 min-h-0 overflow-hidden">
            <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-5 flex flex-col gap-4 overflow-y-auto h-full max-h-full"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' }}
            >
              {/* Title */}
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Film className="w-5 h-5 text-purple-400" />
                  Cinema Studio
                </h1>
                <p className="text-xs text-gray-400 mt-1">Seedance 2 · AI Video Generation</p>
              </div>


              {/* Speed selector */}
              <div>
                <span className="text-sm font-medium text-white mb-2 block">Velocidade</span>
                <div className="grid grid-cols-2 gap-0 bg-black/40 border border-white/10 rounded-lg p-1">
                  <button
                    onClick={() => setSpeed('standard')}
                    className={`py-2.5 px-3 text-sm rounded-md transition-all font-medium ${
                      speed === 'standard' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => setSpeed('fast')}
                    className={`py-2.5 px-3 text-sm rounded-md transition-all font-medium flex items-center justify-center gap-1 ${
                      speed === 'fast' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Fast <Zap className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Gen type selector */}
              <div>
                <span className="text-sm font-medium text-white mb-2 block">Tipo</span>
                <div className="grid grid-cols-3 gap-0 bg-black/40 border border-white/10 rounded-lg p-1">
                  {([
                    { key: 't2v' as GenType, label: 'Texto', icon: <Sparkles className="w-3.5 h-3.5" /> },
                    { key: 'i2v' as GenType, label: 'Imagem', icon: <Image className="w-3.5 h-3.5" /> },
                    { key: 'r2v' as GenType, label: 'Referência', icon: <Video className="w-3.5 h-3.5" /> },
                  ]).map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() => setGenType(key)}
                      className={`py-2 px-2 text-xs rounded-md transition-all font-medium flex items-center justify-center gap-1 ${
                        genType === key ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">Prompt</span>
                  <span className={`text-xs ${prompt.length > 900 ? 'text-amber-400' : 'text-gray-500'}`}>
                    {prompt.length}/1000
                  </span>
                </div>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
                  placeholder="Describe the video you want to create..."
                  className="bg-black/40 border-white/10 text-white text-sm min-h-[80px] resize-none placeholder:text-gray-500"
                />
              </div>

              {/* Image uploads for I2V */}
              {genType === 'i2v' && (
                <div>
                  <span className="text-sm font-medium text-white mb-1 block">Images (max {maxImages})</span>
                  <p className="text-[10px] text-gray-500 mb-2">Controls the visual reference for generation</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {imagePreviews.map((url, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => removeImage(i)} className="absolute top-0 right-0 bg-black/70 rounded-bl p-0.5">
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                    {images.length < maxImages && (
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        className="w-16 h-16 rounded-lg border border-dashed border-white/20 flex items-center justify-center hover:bg-white/5 transition-colors"
                      >
                        <Upload className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                  <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
                    onChange={(e) => { handleImageUpload(e.target.files); e.target.value = ''; }}
                  />
                </div>
              )}

              {/* Reference uploads for R2V */}
              {genType === 'r2v' && (
                <div className="space-y-3">
                  {/* Reference images */}
                  <div>
                    <span className="text-xs font-medium text-white mb-1 block">Reference Images (max 9)</span>
                    <p className="text-[10px] text-gray-500 mb-2">Controls composition, character, environment and style</p>
                    <div className="flex flex-wrap gap-2 mb-1">
                      {imagePreviews.map((url, i) => (
                        <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/10">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => removeImage(i)} className="absolute top-0 right-0 bg-black/70 rounded-bl p-0.5">
                            <X className="w-2.5 h-2.5 text-white" />
                          </button>
                        </div>
                      ))}
                      {images.length < maxImages && (
                        <button
                          onClick={() => imageInputRef.current?.click()}
                          className="w-12 h-12 rounded-lg border border-dashed border-white/20 flex items-center justify-center hover:bg-white/5"
                        >
                          <Image className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      )}
                    </div>
                    <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
                      onChange={(e) => { handleImageUpload(e.target.files); e.target.value = ''; }}
                    />
                  </div>

                  {/* Reference videos */}
                  <div>
                    <span className="text-xs font-medium text-white mb-1 block">Reference Videos (max 3)</span>
                    <p className="text-[10px] text-gray-500 mb-2">Controls camera movement and motion dynamics</p>
                    {videos.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 bg-black/30 rounded-lg px-2 py-1.5 mb-1">
                        <FileVideo className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                        <span className="text-xs text-gray-300 truncate flex-1">{file.name}</span>
                        <button onClick={() => setVideos(prev => prev.filter((_, idx) => idx !== i))}>
                          <X className="w-3 h-3 text-gray-400 hover:text-white" />
                        </button>
                      </div>
                    ))}
                    {videos.length < maxVideos && (
                      <button
                        onClick={() => videoInputRef.current?.click()}
                        className="w-full py-2 rounded-lg border border-dashed border-white/20 flex items-center justify-center gap-1 hover:bg-white/5 text-xs text-gray-400"
                      >
                        <Upload className="w-3.5 h-3.5" /> Add video
                      </button>
                    )}
                    <input ref={videoInputRef} type="file" accept="video/mp4,video/webm" multiple className="hidden"
                      onChange={(e) => { handleVideoUpload(e.target.files); e.target.value = ''; }}
                    />
                  </div>

                  {/* Reference audio */}
                  <div>
                    <span className="text-xs font-medium text-white mb-1 block">Reference Audio (max 3)</span>
                    <p className="text-[10px] text-gray-500 mb-2">Controls rhythm, beat and audio sync</p>
                    {audios.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 bg-black/30 rounded-lg px-2 py-1.5 mb-1">
                        <Music className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                        <span className="text-xs text-gray-300 truncate flex-1">{file.name}</span>
                        <button onClick={() => setAudios(prev => prev.filter((_, idx) => idx !== i))}>
                          <X className="w-3 h-3 text-gray-400 hover:text-white" />
                        </button>
                      </div>
                    ))}
                    {audios.length < maxAudios && (
                      <button
                        onClick={() => audioInputRef.current?.click()}
                        className="w-full py-2 rounded-lg border border-dashed border-white/20 flex items-center justify-center gap-1 hover:bg-white/5 text-xs text-gray-400"
                      >
                        <Upload className="w-3.5 h-3.5" /> Add audio
                      </button>
                    )}
                    <input ref={audioInputRef} type="file" accept="audio/mpeg,audio/wav,audio/aac,audio/mp3" multiple className="hidden"
                      onChange={(e) => { handleAudioUpload(e.target.files); e.target.value = ''; }}
                    />
                  </div>
                </div>
              )}

              {/* Settings row */}
              <div className="space-y-3">
                {/* Duration */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-white">Duration</span>
                    <span className="text-xs text-purple-300 font-medium">{duration}s</span>
                  </div>
                  <Slider
                    min={4}
                    max={15}
                    step={1}
                    value={[duration]}
                    onValueChange={([v]) => setDuration(v)}
                    className="w-full [&_[data-radix-slider-track]]:bg-white/10 [&_[data-radix-slider-range]]:bg-purple-500 [&_[data-radix-slider-thumb]]:border-purple-500"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-gray-500">4s</span>
                    <span className="text-[10px] text-gray-500">15s</span>
                  </div>
                </div>

                {/* Quality */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <span className="text-xs font-medium text-white mb-1.5 block">Quality</span>
                    <div className="grid grid-cols-2 gap-0 bg-black/40 border border-white/10 rounded-lg p-1">
                      {QUALITIES.map(q => (
                        <button
                          key={q}
                          onClick={() => setQuality(q)}
                          className={`py-1.5 text-xs rounded-md transition-all ${
                            quality === q ? 'bg-white/10 text-white font-medium' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1">
                    <span className="text-xs font-medium text-white mb-1.5 block">Aspect Ratio</span>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger className="bg-black/40 border-white/10 text-white text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-white/10">
                        {ASPECT_RATIOS.map(ar => (
                          <SelectItem key={ar} value={ar} className="text-white text-xs">{ar}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Audio toggle */}
                <div className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white">Generate Audio</span>
                    <span className="text-[10px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded-full">Free</span>
                  </div>
                  <Switch
                    checked={generateAudio}
                    onCheckedChange={setGenerateAudio}
                    className="data-[state=checked]:bg-white/30 data-[state=unchecked]:bg-white/10 [&>span]:bg-white"
                  />
                </div>
              </div>

              {/* Cost estimate */}
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2 text-center">
                <span className="text-sm text-purple-300">
                  {duration}s · {quality} ≈{' '}
                  <span className="font-bold text-white">{estimatedCredits} créditos</span>
                  {speed === 'fast' && <span className="text-[10px] text-gray-400 ml-1">(estimativa)</span>}
                </span>
              </div>

              {/* Generate button */}
              {!isProcessing && status !== 'completed' && (
                <Button
                  className="w-full py-4 text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl shadow-lg disabled:opacity-50"
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Iniciando...</>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Video
                      <span className="ml-2 flex items-center gap-1 text-xs opacity-90">
                        <Coins className="w-3.5 h-3.5" /> {estimatedCredits}
                      </span>
                    </>
                  )}
                </Button>
              )}

              {/* Completed actions */}
              {status === 'completed' && (
                <div className="space-y-2">
                  <Button
                    className="w-full py-4 text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl"
                    onClick={downloadResult}
                  >
                    <Download className="w-4 h-4 mr-2" /> Download MP4
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full py-3 text-sm border-white/10 text-gray-300 hover:bg-white/5 rounded-xl"
                    onClick={resetTool}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" /> Generate Another
                  </Button>
                </div>
              )}

              {/* Error state */}
              {status === 'error' && errorMessage && (
                <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-medium text-red-300">{errorMessage}</p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-2 py-2 text-xs border-white/10 text-gray-300 hover:bg-white/5 rounded-lg"
                    onClick={resetTool}
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Try Again
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* ━━━ RIGHT PANEL ━━━ */}
          <div className="lg:col-span-5 min-h-0 overflow-hidden">
            <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl overflow-hidden flex flex-col min-h-[400px] h-full">
              {/* Warning banner */}
              {isProcessing && (
                <div className="bg-amber-500/20 border-b border-amber-500/50 px-3 py-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <p className="text-xs text-amber-200">Don't close this page. Video generation takes 1-3 minutes.</p>
                </div>
              )}

              <div className="flex-1 flex items-center justify-center p-4 min-h-0">
                {status === 'completed' && outputUrl ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                    <video
                      src={outputUrl}
                      autoPlay
                      muted
                      controls
                      loop
                      playsInline
                      className="max-w-full max-h-[70vh] rounded-lg"
                    />
                    <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg px-4 py-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <p className="text-xs text-amber-200">⚠️ This video expires in 24 hours. Download it now.</p>
                    </div>
                  </div>
                ) : isProcessing ? (
                  <div className="flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
                    <div className="text-center">
                      <p className="text-lg font-medium text-white">
                        {status === 'uploading' ? 'Sending request...' : progress < 60 ? 'Processing video...' : 'Almost ready...'}
                      </p>
                      <p className="text-sm text-purple-300/70 mt-1">
                        Video generation takes 1-3 minutes
                      </p>
                      <p className="text-xs text-gray-400 mt-2 font-mono">
                        {formatTime(elapsedTime)} elapsed
                      </p>
                    </div>
                    <div className="w-48 h-2 bg-purple-900/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelGeneration}
                      className="text-red-300 hover:text-red-100 hover:bg-red-500/20"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <Film className="w-10 h-10 text-purple-400/50" />
                    </div>
                    <p className="text-sm text-gray-400">
                      Configure your settings and click Generate Video
                    </p>
                    <p className="text-xs text-gray-500">
                      Powered by Seedance 2.0
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <NoCreditsModal isOpen={showNoCreditsModal} onClose={() => setShowNoCreditsModal(false)} reason={noCreditsReason} />
      <ActiveJobBlockModal
        isOpen={showActiveJobModal} onClose={() => setShowActiveJobModal(false)}
        activeTool={activeToolName} activeJobId={activeJobId} activeStatus={activeStatus}
        onCancelJob={centralCancelJob}
      />
      <DownloadProgressOverlay isVisible={isDownloading} progress={downloadProgress} onCancel={cancelDownload} mediaType="video" locale="pt" />
      <NavigationBlockerModal
        open={showNavBlocker} onConfirmLeave={() => { setShowNavBlocker(false); navigate(-1); }}
        onCancelLeave={() => setShowNavBlocker(false)} toolName="Cinema Studio"
      />
      <NotificationPromptToast toolName="cinema-studio" />
    </AppLayout>
  );
};

export default CinemaStudio;
