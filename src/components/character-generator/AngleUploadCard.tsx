import React, { useRef } from 'react';
import { Upload, X, Camera } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { optimizeForAI } from '@/hooks/useImageOptimizer';
import { toast } from 'sonner';

interface AngleUploadCardProps {
  label: string;
  angleType: 'front' | 'profile' | 'semi_profile' | 'low_angle';
  image: string | null;
  onImageChange: (dataUrl: string | null, file?: File) => void;
  disabled?: boolean;
}

const AngleIcons: Record<string, React.FC<{ className?: string }>> = {
  front: ({ className }) => (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="16" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M12 40c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="20" cy="14" r="1.5" fill="currentColor"/>
      <circle cx="28" cy="14" r="1.5" fill="currentColor"/>
      <path d="M21 19c1.5 1.5 4.5 1.5 6 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  profile: ({ className }) => (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 6c-5 0-10 4-10 10v4c0 3 2 6 5 7l2 1c0 0 1 2 1 4v4c-4 1-10 4-10 9h24c0-5-6-8-10-9v-4c0-2 1-4 1-4l2-1c3-1 5-4 5-7v-4c0-6-5-10-10-10z" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="28" cy="16" r="1.5" fill="currentColor"/>
      <path d="M20 10c-2 2-3 5-3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  semi_profile: ({ className }) => (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="24" cy="16" rx="9" ry="10" stroke="currentColor" strokeWidth="2" fill="none" transform="rotate(-15 24 16)"/>
      <path d="M13 40c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="21" cy="14" r="1.5" fill="currentColor"/>
      <circle cx="28" cy="13" r="1.5" fill="currentColor"/>
      <path d="M22 19c1.2 1 3 1 4.5 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  low_angle: ({ className }) => (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="24" cy="20" rx="10" ry="8" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M10 44c0-6 6-10 14-10s14 4 14 10" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="20" cy="19" r="1.5" fill="currentColor"/>
      <circle cx="28" cy="19" r="1.5" fill="currentColor"/>
      <path d="M20 24c2 2 6 2 8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M24 44V48M24 0v8" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.4"/>
      <path d="M18 4l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
    </svg>
  ),
};

const AngleUploadCard: React.FC<AngleUploadCardProps> = ({
  label,
  angleType,
  image,
  onImageChange,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const IconComponent = AngleIcons[angleType];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }

    try {
      const optimized = await optimizeForAI(file);
      const reader = new FileReader();
      reader.onload = () => {
        onImageChange(reader.result as string, new File([optimized.file], file.name, { type: optimized.file.type }));
      };
      reader.readAsDataURL(optimized.file);
    } catch (error) {
      console.error('[AngleUploadCard] Error:', error);
      toast.error('Erro ao processar imagem');
    }

    // Reset input
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <Card
      className={`relative overflow-hidden border-purple-500/30 bg-purple-900/20 cursor-pointer transition-all hover:border-fuchsia-500/50 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />
      
      {image ? (
        <div className="relative aspect-square">
          <img src={image} alt={label} className="w-full h-full object-cover" />
          <div className="absolute top-1 right-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 bg-black/60 hover:bg-red-500/80 text-white rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                onImageChange(null);
              }}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <p className="text-[10px] font-bold text-white text-center uppercase tracking-wider">{label}</p>
          </div>
        </div>
      ) : (
        <div className="aspect-square flex flex-col items-center justify-center gap-1.5 p-2">
          <IconComponent className="w-10 h-10 text-fuchsia-400/70" />
          <p className="text-[10px] font-bold text-purple-200 uppercase tracking-wider text-center">{label}</p>
          <div className="flex items-center gap-1 text-purple-400">
            <Camera className="w-3 h-3" />
            <span className="text-[9px]">Toque para enviar</span>
          </div>
        </div>
      )}
    </Card>
  );
};

export default AngleUploadCard;
