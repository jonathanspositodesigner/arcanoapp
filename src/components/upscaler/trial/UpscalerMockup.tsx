import { useState, useRef } from "react";
import { Upload, Wand2, Lock, Sparkles, Loader2, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Slider } from "@/components/ui/slider";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

type PromptCategory = 'pessoas_perto' | 'pessoas_longe' | 'comida' | 'fotoAntiga' | 'logo' | 'render3d';
type PessoasFraming = 'perto' | 'longe';
type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

interface UpscalerMockupProps {
  isActive?: boolean;
  usesRemaining?: number;
  onGenerate?: () => void;
  isProcessing?: boolean;
  resultUrl?: string | null;
  inputPreviewUrl?: string | null;
  uploadedFile?: File | null;
  onFileSelect?: (file: File) => void;
  // Category controls
  selectedCategory?: PromptCategory;
  pessoasFraming?: PessoasFraming;
  comidaDetailLevel?: number;
  onCategoryChange?: (category: PromptCategory) => void;
  onFramingChange?: (framing: PessoasFraming) => void;
  onDetailLevelChange?: (level: number) => void;
  // Progress
  progress?: number;
  status?: ProcessingStatus;
}

export default function UpscalerMockup({
  isActive = false,
  usesRemaining = 3,
  onGenerate,
  isProcessing = false,
  resultUrl,
  inputPreviewUrl,
  uploadedFile,
  onFileSelect,
  selectedCategory = 'pessoas_perto',
  pessoasFraming = 'perto',
  comidaDetailLevel = 0.85,
  onCategoryChange,
  onFramingChange,
  onDetailLevelChange,
  progress = 0,
  status = 'idle',
}: UpscalerMockupProps) {
  const previewUrl = uploadedFile ? URL.createObjectURL(uploadedFile) : null;
  const [showProMessage, setShowProMessage] = useState(false);
  
  // Before/After slider state
  const [sliderPosition, setSliderPosition] = useState(50);
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const isHorizontalDrag = useRef(false);

  const displayCategory = selectedCategory.startsWith('pessoas') ? 'pessoas' : selectedCategory;
  const isPessoas = selectedCategory.startsWith('pessoas');
  const isComida = selectedCategory === 'comida';

  const handleCategorySelect = (value: string) => {
    if (!value || !onCategoryChange) return;
    if (value === 'pessoas') {
      onCategoryChange(`pessoas_${pessoasFraming}` as PromptCategory);
    } else {
      onCategoryChange(value as PromptCategory);
    }
  };

  const handleFramingSelect = (value: string) => {
    if (!value || !onFramingChange || !onCategoryChange) return;
    onFramingChange(value as PessoasFraming);
    onCategoryChange(`pessoas_${value}` as PromptCategory);
  };

  // Before/After slider handlers
  const handleSliderMove = (clientX: number) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleMouseDown = () => { isDragging.current = true; };
  const handleMouseUp = () => { isDragging.current = false; };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) handleSliderMove(e.clientX);
  };
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    isHorizontalDrag.current = false;
    isDragging.current = true;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    if (deltaX > deltaY && deltaX > 10) isHorizontalDrag.current = true;
    if (isHorizontalDrag.current) e.preventDefault();
    handleSliderMove(touch.clientX);
  };
  const handleTouchEnd = () => {
    isDragging.current = false;
    isHorizontalDrag.current = false;
  };

  return (
    <TooltipProvider>
    <div className="w-full max-w-2xl mx-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center">
          <Wand2 className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-semibold text-lg">Upscaler Arcano</span>
        <div className="ml-auto flex gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
            Standard
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-white/30 border border-white/10 flex items-center gap-1.5 cursor-not-allowed opacity-60"
                onClick={(e) => {
                  e.preventDefault();
                  setShowProMessage(true);
                  setTimeout(() => setShowProMessage(false), 3000);
                }}
              >
                <Lock className="w-3 h-3" />
                PRO
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-black/90 border-white/10 text-white/80 text-xs">
              Exclusivo para assinantes
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* PRO message */}
      {showProMessage && (
        <div className="mx-6 mt-3 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs text-center animate-in fade-in-0 slide-in-from-top-2">
          🔒 O modo PRO é exclusivo para assinantes. Assine um plano para desbloquear!
        </div>
      )}

      {/* Category Selector */}
      <div className="px-6 py-3 border-b border-white/10">
        <ToggleGroup 
          type="single" 
          value={displayCategory} 
          onValueChange={handleCategorySelect}
          className="flex flex-col gap-1"
        >
          {/* Top row: 3 buttons */}
          <div className="flex gap-1">
            {(['pessoas', 'comida', 'fotoAntiga'] as const).map((cat) => (
              <ToggleGroupItem 
                key={cat}
                value={cat} 
                disabled={!isActive}
                className={`flex-1 px-2 py-1.5 text-[10px] rounded-md transition-all ${
                  displayCategory === cat
                    ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30' 
                    : 'border border-white/10 text-white/50 hover:bg-white/10'
                }`}
              >
                {cat === 'pessoas' ? 'Pessoas' : cat === 'comida' ? 'Comida/Objeto' : 'Foto Antiga'}
              </ToggleGroupItem>
            ))}
          </div>
          {/* Bottom row: 2 buttons */}
          <div className="flex gap-1">
            {(['render3d', 'logo'] as const).map((cat) => (
              <ToggleGroupItem 
                key={cat}
                value={cat} 
                disabled={!isActive}
                className={`flex-1 px-2 py-1.5 text-[10px] rounded-md transition-all ${
                  displayCategory === cat
                    ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30' 
                    : 'border border-white/10 text-white/50 hover:bg-white/10'
                }`}
              >
                {cat === 'render3d' ? 'Selo 3D' : 'Logo/Arte'}
              </ToggleGroupItem>
            ))}
          </div>
        </ToggleGroup>

        {/* Pessoas Framing Selector */}
        {isPessoas && isActive && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <ToggleGroup 
              type="single" 
              value={pessoasFraming} 
              onValueChange={handleFramingSelect}
              className="grid w-full grid-cols-2 gap-2"
            >
              <ToggleGroupItem 
                value="perto" 
                className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 transition-all h-auto ${
                  pessoasFraming === 'perto'
                    ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30' 
                    : 'border border-white/10 text-white/50 hover:bg-white/10'
                }`}
              >
                <div className="w-8 h-8 rounded bg-purple-900/50 flex items-center justify-center border border-purple-500/30 relative">
                  <svg width="24" height="24" viewBox="0 0 48 48" fill="none" className="text-current">
                    <circle cx="24" cy="20" r="14" fill="currentColor" opacity="0.85" />
                    <ellipse cx="24" cy="48" rx="18" ry="14" fill="currentColor" opacity="0.55" />
                  </svg>
                </div>
                <span className="text-[10px] font-medium">De Perto</span>
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="longe" 
                className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 transition-all h-auto ${
                  pessoasFraming === 'longe'
                    ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30' 
                    : 'border border-white/10 text-white/50 hover:bg-white/10'
                }`}
              >
                <div className="w-8 h-8 rounded bg-purple-900/50 flex items-center justify-center border border-purple-500/30 relative">
                  <svg width="24" height="24" viewBox="0 0 48 48" fill="none" className="text-current">
                    <circle cx="24" cy="14" r="5" fill="currentColor" opacity="0.85" />
                    <rect x="20" y="19" width="8" height="12" rx="3" fill="currentColor" opacity="0.75" />
                    <rect x="20" y="30" width="3.5" height="13" rx="1.5" fill="currentColor" opacity="0.55" />
                    <rect x="24.5" y="30" width="3.5" height="13" rx="1.5" fill="currentColor" opacity="0.55" />
                  </svg>
                </div>
                <span className="text-[10px] font-medium">De Longe</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        )}

        {/* Comida/Objeto Detail Level Slider */}
        {isComida && isActive && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                <span className="text-xs font-medium text-white">Nível de Detalhes</span>
              </div>
              <span className="text-xs text-purple-300 font-mono">{Math.round(comidaDetailLevel * 100)}%</span>
            </div>
            <Slider
              value={[comidaDetailLevel]}
              onValueChange={([value]) => onDetailLevelChange?.(value)}
              min={0.70}
              max={1.00}
              step={0.01}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-purple-300/50 mt-1">
              <span>Mais Fiel</span>
              <span>Mais Criativo</span>
            </div>
          </div>
        )}
      </div>

      {/* Main content area */}
      <div className="p-6">
        {/* COMPLETED: Before/After Slider */}
        {status === 'completed' && resultUrl && inputPreviewUrl ? (
          <div className="relative">
            <TransformWrapper
              initialScale={1}
              minScale={1}
              maxScale={5}
              centerOnInit
              wheel={{ step: 0.2 }}
              panning={{ disabled: false }}
              doubleClick={{ mode: "toggle", step: 2 }}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  {/* Zoom controls */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-full px-2 py-1 border border-white/10">
                    <button onClick={() => zoomOut()} className="p-1.5 text-white/70 hover:text-white transition-colors">
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button onClick={() => zoomIn()} className="p-1.5 text-white/70 hover:text-white transition-colors">
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-white/20 mx-0.5" />
                    <button onClick={() => resetTransform()} className="p-1.5 text-white/70 hover:text-white transition-colors">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <TransformComponent wrapperClass="!w-full" contentClass="!w-full">
                    <div 
                      ref={sliderContainerRef}
                      className="relative w-full rounded-xl overflow-hidden cursor-ew-resize select-none border-2 border-fuchsia-500/30"
                      style={{ aspectRatio: '4/3' }}
                      onMouseDown={handleMouseDown}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onMouseMove={handleMouseMove}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      {/* After Image (background - result) */}
                      <img 
                        src={resultUrl} 
                        alt="Depois"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      
                      {/* Before Image (clipped - original) */}
                      <div 
                        className="absolute inset-0 overflow-hidden"
                        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                      >
                        <img 
                          src={inputPreviewUrl} 
                          alt="Antes"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      </div>

                      {/* Slider line */}
                      <div 
                        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                      >
                        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center">
                          <div className="flex gap-0.5">
                            <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
                            <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
                          </div>
                        </div>
                      </div>

                      {/* Labels */}
                      <div className="absolute top-3 left-3 bg-black/80 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                        Antes
                      </div>
                      <div className="absolute top-3 right-3 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                        Depois
                      </div>
                    </div>
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
            <p className="text-center text-[10px] text-purple-300/40 mt-2">Pinça ou scroll para dar zoom • Clique duplo para alternar</p>
          </div>
        ) : (status === 'uploading' || status === 'processing') ? (
          /* PROCESSING: Progress indicator */
          <div className="flex flex-col items-center justify-center gap-4 h-64 rounded-xl border-2 border-fuchsia-500/20 bg-black/30">
            <Loader2 className="w-12 h-12 text-fuchsia-400 animate-spin" />
            <div className="text-center">
              <p className="text-lg font-medium text-white">
                {status === 'uploading' ? 'Enviando imagem...' : 'Processando...'}
              </p>
              <p className="text-sm text-purple-300/70">
                Isso pode levar até 2 minutos
              </p>
            </div>
            {/* Progress bar */}
            <div className="w-48 h-2 bg-purple-900/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-fuchsia-500 to-purple-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-purple-300/50">{Math.round(progress)}%</span>
          </div>
        ) : previewUrl ? (
          /* PREVIEW: Show uploaded image */
          <div className="relative rounded-xl overflow-hidden border border-fuchsia-500/30">
            <img src={previewUrl} alt="Preview" className="w-full h-64 object-contain bg-black/50" />
          </div>
        ) : (
          /* EMPTY: Upload area */
          <label
            className={`flex flex-col items-center justify-center gap-4 h-64 border-2 border-dashed border-white/20 rounded-xl bg-white/5 transition-colors ${
              isActive ? "hover:border-fuchsia-500/50 hover:bg-white/10 cursor-pointer" : "cursor-default"
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 flex items-center justify-center">
              <Upload className="w-8 h-8 text-fuchsia-400" />
            </div>
            <div className="text-center">
              <p className="text-white/80 text-sm font-medium">Arraste ou clique para enviar</p>
              <p className="text-white/40 text-xs mt-1">PNG, JPG, WEBP • Máx 10MB</p>
            </div>
            {isActive && onFileSelect && (
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onFileSelect(file);
                  e.target.value = '';
                }}
              />
            )}
          </label>
        )}
      </div>

      {/* Generate button */}
      <div className="px-6 pb-6">
        <Button
          className="w-full h-12 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-semibold text-base rounded-xl border-0"
          disabled={!isActive || isProcessing || (!uploadedFile && !resultUrl)}
          onClick={onGenerate}
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {status === 'uploading' ? 'Enviando...' : `Processando... ${Math.round(progress)}%`}
            </span>
          ) : resultUrl ? (
            <span className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Testar outra imagem
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              Melhorar Imagem {isActive && `(${usesRemaining} ${usesRemaining === 1 ? 'teste restante' : 'testes restantes'})`}
            </span>
          )}
        </Button>
      </div>
    </div>
    </TooltipProvider>
  );
}
