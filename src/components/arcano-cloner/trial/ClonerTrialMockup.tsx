import React, { useState, useRef, useCallback } from 'react';
import { Upload, ImageIcon, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ResilientImage } from '@/components/upscaler/ResilientImage';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import AspectRatioSelector, { AspectRatio } from '@/components/arcano-cloner/AspectRatioSelector';
import CreativitySlider from '@/components/arcano-cloner/CreativitySlider';

interface ClonerTrialMockupProps {
  isActive?: boolean;
  usesRemaining?: number;
  // Image state
  userImage: string | null;
  referenceImage: string | null;
  resultUrl: string | null;
  // Settings
  aspectRatio: AspectRatio;
  creativity: number;
  onAspectRatioChange: (v: AspectRatio) => void;
  onCreativityChange: (v: number) => void;
  // Handlers
  onUserImageSelect: (file: File) => void;
  onReferenceImageSelect: (file: File) => void;
  onGenerate: () => void;
  onNewUpload: () => void;
  onOpenLibrary?: () => void;
  // Status
  isProcessing: boolean;
  progress: number;
  status: string;
}

const ClonerTrialMockup: React.FC<ClonerTrialMockupProps> = ({
  isActive = false,
  usesRemaining = 0,
  userImage,
  referenceImage,
  resultUrl,
  aspectRatio,
  creativity,
  onAspectRatioChange,
  onCreativityChange,
  onUserImageSelect,
  onReferenceImageSelect,
  onGenerate,
  onNewUpload,
  onOpenLibrary,
  isProcessing,
  progress,
  status,
}) => {
  const userInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  const handleUserFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUserImageSelect(file);
    e.target.value = '';
  };

  const handleRefFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onReferenceImageSelect(file);
    e.target.value = '';
  };

  // Result view with zoom/pan
  if (resultUrl) {
    return (
      <div className="bg-background/80 border border-border rounded-2xl p-4 md:p-6">
        <div className="text-center mb-4">
          <h3 className="text-foreground font-semibold text-lg">✨ Resultado</h3>
          <p className="text-muted-foreground text-sm">Arraste para mover, use pinça para zoom</p>
        </div>
        
        <div className="relative rounded-xl overflow-hidden border border-border bg-muted/50 aspect-square max-w-md mx-auto">
          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={4}
          >
            {({ zoomIn, zoomOut }) => (
              <>
                <div className="absolute top-2 right-2 z-10 flex gap-1">
                  <button onClick={() => zoomIn()} className="bg-black/60 text-foreground p-1.5 rounded-lg hover:bg-black/80">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button onClick={() => zoomOut()} className="bg-black/60 text-foreground p-1.5 rounded-lg hover:bg-black/80">
                    <ZoomOut className="w-4 h-4" />
                  </button>
                </div>
                <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
                  <ResilientImage src={resultUrl} alt="Resultado" className="w-full h-full object-contain" maxRetries={4} compressOnFailure={true} locale="pt" objectFit="contain" />
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        </div>

        <div className="text-center mt-4">
          <Button
            variant="outline"
            className="border-border text-muted-foreground hover:bg-accent0/10"
            onClick={onNewUpload}
          >
            {usesRemaining > 0 
              ? `Testar novamente (${usesRemaining} ${usesRemaining === 1 ? 'teste restante' : 'testes restantes'})` 
              : '✅ Teste Concluído'}
          </Button>
        </div>
      </div>
    );
  }

  // Processing view
  if (isProcessing) {
    return (
      <div className="bg-background/80 border border-border rounded-2xl p-6 md:p-8">
        <div className="flex flex-col items-center justify-center py-12 gap-6">
          <div className="relative">
            <Loader2 className="w-16 h-16 text-muted-foreground animate-spin" />
            <div className="absolute inset-0 bg-accent blur-xl rounded-full" />
          </div>
          <div className="text-center">
            <h3 className="text-foreground font-semibold text-lg mb-2">Processando sua imagem...</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {status === 'uploading' ? 'Enviando imagens...' : 'Gerando seu clone perfeito...'}
            </p>
          </div>
          <div className="w-full max-w-xs">
            <Progress value={progress} className="h-2 bg-accent" />
            <p className="text-muted-foreground text-xs text-center mt-2">{Math.round(progress)}%</p>
          </div>
        </div>
      </div>
    );
  }

  // Main interface
  return (
    <div className="bg-background/80 border border-border rounded-2xl p-4 md:p-6">
      {isActive && (
        <div className="flex items-center justify-between mb-4">
          <span className="text-muted-foreground text-sm">Teste Grátis</span>
          <span className="text-xs bg-accent text-muted-foreground px-2 py-1 rounded-full">
            {usesRemaining} {usesRemaining === 1 ? 'teste restante' : 'testes restantes'}
          </span>
        </div>
      )}

      {/* Image upload grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* User image */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-foreground flex items-center gap-1.5">
            <Upload className="w-3 h-3 text-muted-foreground" />
            Sua Foto
          </p>
          <div
            className="aspect-[3/4] rounded-xl border-2 border-dashed border-border bg-accent flex items-center justify-center cursor-pointer hover:border-border/50 transition-colors overflow-hidden"
            onClick={() => userInputRef.current?.click()}
          >
            {userImage ? (
              <img src={userImage} alt="Sua foto" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="w-8 h-8" />
                <span className="text-[10px]">Enviar foto</span>
              </div>
            )}
          </div>
          <input ref={userInputRef} type="file" accept="image/*" className="hidden" onChange={handleUserFileChange} />
        </div>

        {/* Reference image */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-foreground flex items-center gap-1.5">
            <ImageIcon className="w-3 h-3 text-muted-foreground" />
            Referência
          </p>
          {referenceImage ? (
            <div className="relative aspect-[3/4] rounded-xl border-2 border-border bg-accent overflow-hidden group">
              <img src={referenceImage} alt="Referência" className="w-full h-full object-cover" />
              <button
                type="button"
                className="absolute inset-x-0 bottom-0 bg-black/70 text-muted-foreground text-[10px] font-semibold py-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onOpenLibrary?.()}
              >
                Trocar Imagem
              </button>
            </div>
          ) : (
            <div
              className="aspect-[3/4] rounded-xl border-2 border-dashed border-border bg-accent flex flex-col items-center justify-center cursor-pointer hover:border-border/50 transition-colors gap-3"
              onClick={() => onOpenLibrary?.()}
            >
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground text-center px-2">Escolher da biblioteca ou enviar</span>
            </div>
          )}
          <input ref={refInputRef} type="file" accept="image/*" className="hidden" onChange={handleRefFileChange} />
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <AspectRatioSelector
          value={aspectRatio}
          onChange={onAspectRatioChange}
          disabled={!isActive}
        />
        <CreativitySlider
          value={creativity}
          onChange={onCreativityChange}
          disabled={!isActive}
        />
      </div>

      {/* Generate button */}
      {isActive && (
        <Button
          onClick={onGenerate}
          disabled={!userImage || !referenceImage || isProcessing}
          className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold text-base rounded-xl shadow-lg shadow-primary/10 disabled:opacity-50"
        >
          <ImageIcon className="w-5 h-5 mr-2" />
          Gerar Imagem
        </Button>
      )}
    </div>
  );
};

export default ClonerTrialMockup;