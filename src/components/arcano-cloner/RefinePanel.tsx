import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload, X, Wand2, Coins } from 'lucide-react';

interface RefinePanelProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  referencePreview: string | null;
  onReferenceChange: (file: File | null, preview: string | null) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isRefining: boolean;
  disabled?: boolean;
  title?: string;
  buttonLabel?: string;
  loadingLabel?: string;
}

const REFINE_COST = 30;

const RefinePanel: React.FC<RefinePanelProps> = ({
  prompt,
  onPromptChange,
  referencePreview,
  onReferenceChange,
  onSubmit,
  onCancel,
  isRefining,
  disabled,
  title: panelTitle = 'Refinar Resultado',
  buttonLabel = 'Refinar',
  loadingLabel = 'Refinando...',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onReferenceChange(file, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-fuchsia-900/20 border border-fuchsia-500/30 rounded-lg">
      <h4 className="text-xs font-semibold text-fuchsia-300 flex items-center gap-1.5">
        <Wand2 className="w-3.5 h-3.5" />
        {panelTitle}
      </h4>

      <Textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        placeholder="Escreva aqui o que vc quer modificar na imagem"
        className="min-h-[70px] text-xs bg-purple-900/30 border-purple-500/30 text-white placeholder:text-purple-400 resize-none"
        disabled={isRefining || disabled}
      />

      {/* Optional reference image */}
      <div>
        <label className="text-[10px] text-purple-300 mb-1 block">Imagem extra (opcional)</label>
        {referencePreview ? (
          <div className="relative w-16 h-16 rounded-md overflow-hidden border border-fuchsia-500/40">
            <img src={referencePreview} alt="Ref" className="w-full h-full object-cover" />
            <button
              onClick={() => onReferenceChange(null, null)}
              className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
            onClick={() => fileInputRef.current?.click()}
            disabled={isRefining || disabled}
          >
            <Upload className="w-3 h-3 mr-1" />
            Enviar imagem
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
          onClick={onCancel}
          disabled={isRefining}
        >
          Cancelar
        </Button>
        <Button
          size="sm"
          className="flex-1 h-8 text-xs bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white"
          onClick={onSubmit}
          disabled={isRefining || !prompt.trim() || disabled}
        >
          {isRefining ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              {loadingLabel}
            </>
          ) : (
            <>
              <Wand2 className="w-3.5 h-3.5 mr-1" />
              {buttonLabel}
              <span className="ml-1.5 flex items-center gap-0.5 text-[10px] opacity-90">
                <Coins className="w-3 h-3" />
                {REFINE_COST}
              </span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default RefinePanel;
