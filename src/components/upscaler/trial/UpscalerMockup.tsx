import { Upload, Wand2, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";

type PromptCategory = 'pessoas_perto' | 'pessoas_longe' | 'comida' | 'fotoAntiga' | 'logo' | 'render3d';
type PessoasFraming = 'perto' | 'longe';

interface UpscalerMockupProps {
  isActive?: boolean;
  usesRemaining?: number;
  onGenerate?: () => void;
  isProcessing?: boolean;
  resultUrl?: string | null;
  uploadedFile?: File | null;
  onFileSelect?: (file: File) => void;
  // Category controls
  selectedCategory?: PromptCategory;
  pessoasFraming?: PessoasFraming;
  comidaDetailLevel?: number;
  onCategoryChange?: (category: PromptCategory) => void;
  onFramingChange?: (framing: PessoasFraming) => void;
  onDetailLevelChange?: (level: number) => void;
  // Status
  statusText?: string;
}

export default function UpscalerMockup({
  isActive = false,
  usesRemaining = 3,
  onGenerate,
  isProcessing = false,
  resultUrl,
  uploadedFile,
  onFileSelect,
  selectedCategory = 'pessoas_perto',
  pessoasFraming = 'perto',
  comidaDetailLevel = 0.85,
  onCategoryChange,
  onFramingChange,
  onDetailLevelChange,
  statusText,
}: UpscalerMockupProps) {
  const previewUrl = uploadedFile ? URL.createObjectURL(uploadedFile) : null;
  const [showProMessage, setShowProMessage] = useState(false);

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

      {/* Category Selector - Exactly like UpscalerArcanoTool.tsx */}
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

        {/* Pessoas Framing Selector - De Perto / De Longe */}
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

        {/* Comida/Objeto Detail Level Slider (0.70 to 1.00) */}
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

      {/* Upload area */}
      <div className="p-6">
        {resultUrl ? (
          <div className="relative rounded-xl overflow-hidden border border-fuchsia-500/30">
            <img src={resultUrl} alt="Resultado" className="w-full h-64 object-contain bg-black/50" />
            <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-green-500/20 text-green-300 text-xs font-medium border border-green-500/30">
              ✓ Melhorada
            </div>
          </div>
        ) : previewUrl ? (
          <div className="relative rounded-xl overflow-hidden border border-fuchsia-500/30">
            <img src={previewUrl} alt="Preview" className="w-full h-64 object-contain bg-black/50" />
          </div>
        ) : (
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
                  // Reset input so same file can be selected again
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
              {statusText || 'Processando...'}
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
