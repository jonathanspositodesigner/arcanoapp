import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Download, Upload, Sparkles, Loader2, Video, Coins, Clock, Search, X, Type, ImageIcon, RotateCcw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useCredits } from '@/contexts/CreditsContext';
import { useSmartBackNavigation } from '@/hooks/useSmartBackNavigation';
import { useProcessingButton } from '@/hooks/useProcessingButton';
import { useJobPendingWatchdog } from '@/hooks/useJobPendingWatchdog';
import { useJobStatusSync } from '@/hooks/useJobStatusSync';
import { useQueueSessionCleanup } from '@/hooks/useQueueSessionCleanup';
import { useAIJob } from '@/contexts/AIJobContext';
import { markJobAsFailedInDb } from '@/utils/markJobAsFailedInDb';
import { checkActiveJob } from '@/ai/JobManager';
import { getAIErrorMessage } from '@/utils/errorMessages';
import { optimizeForAI } from '@/hooks/useImageOptimizer';
import NoCreditsModal from '@/components/upscaler/NoCreditsModal';
import ActiveJobBlockModal from '@/components/ai-tools/ActiveJobBlockModal';
import { cancelJob as centralCancelJob } from '@/ai/JobManager';
import AppLayout from '@/components/layout/AppLayout';

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

interface LibraryItem {
  id: string;
  title: string;
  image_url: string; // video preview
  reference_images: string[] | null;
  prompt: string;
}

const ENGINES = [
  { id: 'wan2.2', name: 'Wan 2.2', cost: 500, duration: '15s', resolution: '720p', time: '4 a 5 min' },
  { id: 'veo3.1', name: 'Veo 3.1', cost: 850, duration: '8s', resolution: '1080p', time: '3 a 4 min' },
] as const;

const MovieLedMakerTool = () => {
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramentas-ia-aplicativo' });
  const { user } = usePremiumStatus();
  const { balance: credits, refetch: refetchCredits, checkBalance } = useCredits();
  const { isSubmitting, startSubmit, endSubmit } = useProcessingButton();
  const { registerJob, updateJobStatus, clearJob: clearGlobalJob } = useAIJob();

  // Engine selection
  const [selectedEngine, setSelectedEngine] = useState<string>('wan2.2');
  const currentEngine = ENGINES.find(e => e.id === selectedEngine) || ENGINES[0];

  // Image input
  const [selectedLibraryItem, setSelectedLibraryItem] = useState<LibraryItem | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [librarySearch, setLibrarySearch] = useState('');
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  // Text input
  const [inputText, setInputText] = useState('');

  // Job state
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isQueued, setIsQueued] = useState(false);
  const [queuePosition, setQueuePosition] = useState(0);

  // Modals
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [noCreditsReason, setNoCreditsReason] = useState<'not_logged' | 'insufficient'>('insufficient');
  const [showActiveJobModal, setShowActiveJobModal] = useState(false);
  const [activeToolName, setActiveToolName] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | undefined>();
  const [activeStatus, setActiveStatus] = useState<string | undefined>();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef(crypto.randomUUID());

  // Cleanup queued jobs
  useQueueSessionCleanup(sessionIdRef.current, status);

  // Watchdog for stuck pending jobs
  const handleWatchdogFailed = useCallback((msg: string) => {
    const errInfo = getAIErrorMessage(msg);
    setErrorMessage(errInfo.message);
    setStatus('error');
    setIsQueued(false);
    refetchCredits();
    toast.error(`${errInfo.message}. ${errInfo.solution}`);
    endSubmit();
  }, [refetchCredits, endSubmit]);

  useJobPendingWatchdog({
    jobId,
    toolType: 'movieled_maker' as any,
    enabled: !!jobId && (status === 'processing' || status === 'uploading' || isQueued),
    onJobFailed: handleWatchdogFailed,
  });

  // Triple sync
  useJobStatusSync({
    jobId,
    toolType: 'movieled_maker' as any,
    enabled: !!jobId && (status === 'processing' || status === 'uploading' || isQueued),
    onStatusChange: useCallback((update) => {
      console.log('[MovieLed] StatusSync update:', update.status);
      if (update.status === 'queued') {
        setIsQueued(true);
        setQueuePosition(update.position || 1);
      } else if (update.status === 'starting' || update.status === 'running') {
        setIsQueued(false);
        setQueuePosition(0);
        setStatus('processing');
      } else if (update.status === 'completed') {
        if (update.outputUrl) setResultUrl(update.outputUrl);
        setStatus('completed');
        setIsQueued(false);
        refetchCredits();
        toast.success('Movie para telão gerado com sucesso!');
      } else if (update.status === 'failed' || update.status === 'cancelled') {
        const errInfo = getAIErrorMessage(update.errorMessage || 'Erro na geração');
        setErrorMessage(errInfo.message);
        setStatus('error');
        setIsQueued(false);
        refetchCredits();
        if (update.errorMessage) toast.error(`${errInfo.message}. ${errInfo.solution}`);
        endSubmit();
      }
    }, [refetchCredits, endSubmit]),
    onGlobalStatusChange: updateJobStatus,
  });

  // Register job globally
  useEffect(() => {
    if (jobId) {
      registerJob(jobId, 'MovieLed Maker', 'pending');
    }
  }, [jobId, registerJob]);

  // Load library items
  const loadLibrary = useCallback(async () => {
    setLoadingLibrary(true);
    try {
      let query = supabase
        .from('admin_prompts')
        .select('id, title, image_url, reference_images, prompt')
        .eq('category', 'movies-para-telao')
        .order('title', { ascending: true });

      if (librarySearch.trim()) {
        query = query.ilike('title', `%${librarySearch.trim()}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      setLibraryItems(data || []);
    } catch (err) {
      console.error('[MovieLed] Error loading library:', err);
      toast.error('Erro ao carregar biblioteca');
    } finally {
      setLoadingLibrary(false);
    }
  }, [librarySearch]);

  useEffect(() => {
    if (showLibrary) loadLibrary();
  }, [showLibrary, loadLibrary]);

  // Handle file upload
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx. 10MB)');
      return;
    }

    try {
      const { file: optimized } = await optimizeForAI(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
        setUploadedFileName(file.name);
        setSelectedLibraryItem(null);
      };
      reader.readAsDataURL(optimized);
    } catch {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
        setUploadedFileName(file.name);
        setSelectedLibraryItem(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Select library item
  const selectLibraryItem = (item: LibraryItem) => {
    setSelectedLibraryItem(item);
    setUploadedImage(null);
    setUploadedFileName('');
    setShowLibrary(false);
  };

  // Get effective image URL for processing
  const getEffectiveImageUrl = (): string | null => {
    if (selectedLibraryItem) {
      return selectedLibraryItem.reference_images?.[0] || null;
    }
    return uploadedImage;
  };

  // Handle generate
  const handleGenerate = async () => {
    if (!startSubmit()) return;

    const effectiveImageUrl = getEffectiveImageUrl();
    if (!effectiveImageUrl) {
      toast.error('Selecione uma imagem de referência');
      endSubmit();
      return;
    }
    if (!inputText.trim()) {
      toast.error('Digite o nome para o telão');
      endSubmit();
      return;
    }
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

    const freshCredits = await checkBalance();
    if (freshCredits < currentEngine.cost) {
      setNoCreditsReason('insufficient');
      setShowNoCreditsModal(true);
      endSubmit();
      return;
    }

    setStatus('uploading');
    setErrorMessage(null);
    setResultUrl(null);
    setIsQueued(false);
    setQueuePosition(0);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        toast.error('Sessão expirada. Faça login novamente.');
        setStatus('idle');
        endSubmit();
        return;
      }

      // If uploading from device, upload to storage first
      let imageUrlForBackend = effectiveImageUrl;
      
      if (uploadedImage && !selectedLibraryItem) {
        const base64Data = uploadedImage.split(',')[1];
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        
        const tempId = crypto.randomUUID();
        const storagePath = `movieled/${user.id}/${tempId}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from('artes-cloudinary')
          .upload(storagePath, bytes.buffer, { contentType: 'image/jpeg', upsert: true });
        
        if (uploadError) throw new Error('Erro no upload: ' + uploadError.message);
        
        const { data: publicUrlData } = supabase.storage
          .from('artes-cloudinary')
          .getPublicUrl(storagePath);
        
        imageUrlForBackend = publicUrlData.publicUrl;
      }

      setStatus('processing');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/runninghub-movieled-maker/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          imageUrl: imageUrlForBackend,
          inputText: inputText.trim(),
          engine: selectedEngine,
          referencePromptId: selectedLibraryItem?.id || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'INSUFFICIENT_CREDITS') {
          setNoCreditsReason('insufficient');
          setShowNoCreditsModal(true);
        } else if (data.code === 'USER_HAS_ACTIVE_JOB') {
          toast.error(data.error);
        } else {
          toast.error(data.error || 'Erro ao iniciar geração');
          setErrorMessage(data.error || 'Erro ao iniciar geração');
        }
        setStatus('idle');
        endSubmit();
        return;
      }

      setJobId(data.job_id);

      if (data.queued) {
        setIsQueued(true);
        setQueuePosition(data.position || 1);
        toast.info(`Você está na fila (posição ${data.position || 1}). Aguarde...`);
      } else {
        toast.success('Geração iniciada! Aguarde...');
      }

      refetchCredits();
    } catch (err: any) {
      console.error('[MovieLed] Error:', err);
      const errMsg = err?.message || 'Erro ao gerar movie';
      toast.error(errMsg);
      setStatus('error');
      setErrorMessage(errMsg);
      if (jobId) {
        markJobAsFailedInDb(jobId, 'movieled_maker', errMsg);
      }
    } finally {
      endSubmit();
    }
  };

  // Handle new generation (keep inputs)
  const handleNewGeneration = () => {
    setResultUrl(null);
    setJobId(null);
    setErrorMessage(null);
    setStatus('idle');
    setIsQueued(false);
    setQueuePosition(0);
    clearGlobalJob();
  };

  // Handle download
  const handleDownload = () => {
    if (resultUrl) {
      const link = document.createElement('a');
      link.href = resultUrl;
      link.download = `movieled-${selectedEngine}-${Date.now()}.mp4`;
      link.target = '_blank';
      link.click();
    }
  };

  // Cancel queue
  const cancelQueue = async () => {
    if (!jobId) return;
    try {
      const result = await centralCancelJob('movieled_maker' as any, jobId);
      if (result.success) {
        setStatus('idle');
        setIsQueued(false);
        setQueuePosition(0);
        setJobId(null);
        endSubmit();
        if (result.refundedAmount > 0) {
          toast.success(`Cancelado! ${result.refundedAmount} créditos devolvidos.`);
        } else {
          toast.info('Saiu da fila');
        }
        refetchCredits();
      }
    } catch {
      toast.error('Erro ao cancelar');
    }
  };

  const isProcessing = status === 'processing' || status === 'uploading' || isQueued;
  const hasImage = !!selectedLibraryItem || !!uploadedImage;
  const canGenerate = hasImage && inputText.trim().length > 0 && !isProcessing && status !== 'completed';

  return (
    <AppLayout fullScreen>
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-4 flex flex-col h-full overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 lg:gap-5 flex-1 min-h-0">
          
          {/* Left Panel - Controls */}
          <div className="lg:col-span-2 min-h-0 overflow-hidden">
            <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-5 flex flex-col gap-5 overflow-y-auto h-full max-h-full"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' }}
            >
              {/* Title */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <button onClick={goBack} className="text-purple-300 hover:text-white transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <h1 className="text-xl font-bold text-white flex items-center gap-2">
                    <Video className="h-5 w-5 text-fuchsia-400" />
                    MovieLed Maker
                  </h1>
                </div>
                <p className="text-xs text-gray-400">IA que gera movies para telão de LED com um clique.</p>
              </div>

              {/* Engine Selector */}
              <div>
                <span className="text-sm font-medium text-white mb-2 block">Motor</span>
                <div className="grid grid-cols-2 gap-0 bg-black/40 border border-white/10 rounded-lg p-1">
                  {ENGINES.map(engine => (
                    <button
                      key={engine.id}
                      onClick={() => setSelectedEngine(engine.id)}
                      disabled={isProcessing}
                      className={`py-2.5 px-3 text-sm rounded-md transition-all font-medium ${
                        selectedEngine === engine.id
                          ? 'bg-white/10 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {engine.name}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                    {currentEngine.duration} • {currentEngine.resolution}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {currentEngine.time}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Coins className="h-2.5 w-2.5" />
                    {currentEngine.cost}
                  </span>
                </div>
              </div>

              {/* Image Source */}
              <div>
                <span className="text-sm font-medium text-white mb-2 block">Telão de Referência</span>
                <div className="grid grid-cols-2 gap-0 bg-black/40 border border-white/10 rounded-lg p-1 mb-3">
                  <button
                    onClick={() => { setImageSource('library'); setUploadedImage(null); }}
                    disabled={isProcessing}
                    className={`py-2 px-3 text-xs rounded-md transition-all font-medium ${
                      imageSource === 'library' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Search className="h-3 w-3 inline mr-1" />
                    Biblioteca
                  </button>
                  <button
                    onClick={() => { setImageSource('upload'); setSelectedLibraryItem(null); }}
                    disabled={isProcessing}
                    className={`py-2 px-3 text-xs rounded-md transition-all font-medium ${
                      imageSource === 'upload' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Upload className="h-3 w-3 inline mr-1" />
                    Minha Imagem
                  </button>
                </div>

                {imageSource === 'library' ? (
                  <>
                    {selectedLibraryItem ? (
                      <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                        {/* Show the video as preview */}
                        <video
                          src={selectedLibraryItem.image_url}
                          className="w-16 h-10 object-cover rounded-lg"
                          muted
                          loop
                          autoPlay
                          playsInline
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white truncate">{selectedLibraryItem.title}</p>
                          <button
                            onClick={() => { setSelectedLibraryItem(null); setShowLibrary(true); }}
                            className="text-[10px] text-fuchsia-400 hover:text-fuchsia-300"
                            disabled={isProcessing}
                          >
                            Trocar telão
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowLibrary(true)}
                        disabled={isProcessing}
                        className="w-full bg-black/40 border border-white/10 border-dashed rounded-xl p-4 text-center hover:bg-black/60 transition-colors"
                      >
                        <ImageIcon className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                        <p className="text-sm text-white">Explorar Biblioteca</p>
                        <p className="text-[10px] text-gray-500">Escolha um telão da nossa coleção</p>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div
                      className="bg-black/40 border border-white/10 border-dashed rounded-xl p-4 cursor-pointer hover:bg-black/60 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadedImage ? (
                        <div className="flex items-center gap-3">
                          <img src={uploadedImage} alt="Preview" className="w-12 h-8 object-cover rounded-lg" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white truncate">{uploadedFileName}</p>
                            <p className="text-[10px] text-gray-500">Clique para trocar</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <Upload className="h-6 w-6 text-gray-400" />
                          <p className="text-sm text-white">Enviar imagem</p>
                          <p className="text-[10px] text-gray-500">PNG, JPEG, WEBP - Máx 10MB</p>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-2 px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <AlertCircle className="h-3 w-3 text-amber-400 flex-shrink-0" />
                      <p className="text-[10px] text-amber-300">
                        Para melhores resultados, use uma imagem <strong>1920x1080</strong> (16:9).
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Text Input */}
              <div>
                <span className="text-sm font-medium text-white mb-2 block flex items-center gap-1.5">
                  <Type className="h-3.5 w-3.5 text-fuchsia-400" />
                  Nome no Telão
                </span>
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ex: DJ MARCOS"
                  disabled={isProcessing}
                  className="bg-black/40 border-white/10 text-white placeholder:text-gray-500 text-sm"
                  maxLength={50}
                />
                <p className="text-[10px] text-gray-500 mt-1">{inputText.length}/50 caracteres</p>
              </div>

              {/* Generate Button */}
              {status !== 'completed' && status !== 'error' && !isProcessing && (
                <Button
                  className="w-full py-4 text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl shadow-lg disabled:opacity-50"
                  onClick={handleGenerate}
                  disabled={isSubmitting || !canGenerate}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Gerar Movie
                      <span className="ml-2 flex items-center gap-1 text-xs opacity-90">
                        <Coins className="w-3.5 h-3.5" />
                        {currentEngine.cost}
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
                    onClick={handleDownload}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Movie
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full py-3 text-sm border-white/10 text-gray-300 hover:bg-white/5 rounded-xl"
                    onClick={handleNewGeneration}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Gerar Novo
                  </Button>
                </div>
              )}

              {/* Error State */}
              {status === 'error' && errorMessage && (
                <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300">{errorMessage}</p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-2 py-2 text-xs border-white/10 text-gray-300 hover:bg-white/5 rounded-lg"
                    onClick={handleNewGeneration}
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Tentar Novamente
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Result */}
          <div className="lg:col-span-5 min-h-0 overflow-hidden">
            <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl overflow-hidden flex flex-col min-h-[400px] h-full">
              {/* Warning Banner */}
              {isProcessing && (
                <div className="bg-amber-500/20 border-b border-amber-500/50 px-3 py-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <p className="text-xs text-amber-200">Não feche esta página enquanto o vídeo está sendo gerado.</p>
                </div>
              )}

              <div className="flex-1 flex items-center justify-center p-4 min-h-0">
                {/* Queue */}
                {isQueued ? (
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center animate-pulse">
                      <Clock className="w-8 h-8 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-yellow-300">🔥 Na fila!</p>
                      <p className="text-3xl font-bold text-white mt-2">Posição {queuePosition}</p>
                      <p className="text-sm text-purple-300/70 mt-2">Aguarde, já já é sua vez!</p>
                    </div>
                    <Button
                      variant="ghost" size="sm"
                      onClick={cancelQueue}
                      className="text-red-300 hover:text-red-100 hover:bg-red-500/20"
                    >
                      Sair da fila
                    </Button>
                  </div>
                ) : status === 'completed' && resultUrl ? (
                  /* Result Video */
                  <div className="w-full h-full flex items-center justify-center">
                    <video
                      src={resultUrl}
                      controls
                      autoPlay
                      loop
                      className="max-w-full max-h-full rounded-lg"
                    />
                  </div>
                ) : (status === 'uploading' || status === 'processing') && !isQueued ? (
                  /* Processing */
                  <div className="flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
                    <div className="text-center">
                      <p className="text-lg font-medium text-white">
                        {status === 'uploading' ? 'Enviando imagem...' : 'Gerando movie para telão...'}
                      </p>
                      <p className="text-sm text-purple-300/70">
                        Tempo estimado: {currentEngine.time}
                      </p>
                    </div>
                  </div>
                ) : selectedLibraryItem ? (
                  /* Preview selected library item video */
                  <div className="w-full h-full flex items-center justify-center">
                    <video
                      src={selectedLibraryItem.image_url}
                      controls
                      loop
                      muted
                      autoPlay
                      playsInline
                      className="max-w-full max-h-full rounded-lg"
                    />
                  </div>
                ) : uploadedImage ? (
                  /* Preview uploaded image */
                  <div className="w-full h-full flex items-center justify-center">
                    <img src={uploadedImage} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg" />
                  </div>
                ) : (
                  /* Empty State */
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 border border-fuchsia-500/20 flex items-center justify-center">
                      <Video className="w-10 h-10 text-fuchsia-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">MovieLed Maker</h2>
                      <p className="text-sm text-gray-400 mt-1 max-w-sm">
                        Selecione um telão da biblioteca ou envie sua imagem, digite o nome e gere seu movie para telão de LED!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Library Modal */}
      {showLibrary && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">Telões para LED</h3>
              <button onClick={() => setShowLibrary(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 border-b border-white/10">
              <Input
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                placeholder="Buscar telão..."
                className="bg-black/40 border-white/10 text-white text-sm"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loadingLibrary ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                </div>
              ) : libraryItems.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Nenhum telão encontrado</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {libraryItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => selectLibraryItem(item)}
                      className="group bg-black/40 border border-white/10 rounded-xl overflow-hidden hover:border-fuchsia-500/50 transition-all text-left"
                    >
                      <div className="aspect-video relative overflow-hidden">
                        <video
                          src={item.image_url}
                          muted
                          loop
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-white truncate">{item.title}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <NoCreditsModal
        isOpen={showNoCreditsModal}
        onClose={() => setShowNoCreditsModal(false)}
        reason={noCreditsReason}
      />
      <ActiveJobBlockModal
        isOpen={showActiveJobModal}
        onClose={() => setShowActiveJobModal(false)}
        activeTool={activeToolName}
        activeJobId={activeJobId}
        activeStatus={activeStatus}
        onCancelJob={centralCancelJob}
      />
    </AppLayout>
  );
};

export default MovieLedMakerTool;
