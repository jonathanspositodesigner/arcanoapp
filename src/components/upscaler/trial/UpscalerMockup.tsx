import { Upload, Wand2, Image, Type, Camera, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpscalerMockupProps {
  isActive?: boolean;
  usesRemaining?: number;
  onGenerate?: () => void;
  isProcessing?: boolean;
  resultUrl?: string | null;
  uploadedFile?: File | null;
  onFileSelect?: (file: File) => void;
}

const categories = [
  { icon: Camera, label: "Foto" },
  { icon: Type, label: "Logo" },
  { icon: Image, label: "Ilustração" },
  { icon: Palette, label: "Arte Digital" },
];

export default function UpscalerMockup({
  isActive = false,
  usesRemaining = 3,
  onGenerate,
  isProcessing = false,
  resultUrl,
  uploadedFile,
  onFileSelect,
}: UpscalerMockupProps) {
  const previewUrl = uploadedFile ? URL.createObjectURL(uploadedFile) : null;

  return (
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
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-white/50 border border-white/10">
            PRO
          </span>
        </div>
      </div>

      {/* Categories */}
      <div className="px-6 py-3 border-b border-white/10 flex gap-3">
        {categories.map((cat, i) => {
          const Icon = cat.icon;
          return (
            <button
              key={i}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                i === 0
                  ? "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30"
                  : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
              }`}
              disabled={!isActive}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          );
        })}
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
              Processando...
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
  );
}
