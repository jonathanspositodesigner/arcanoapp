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
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Head */}
      <ellipse cx="32" cy="26" rx="14" ry="16" stroke="currentColor" strokeWidth="2" fill="none"/>
      {/* Hair */}
      <path d="M18 22c0-10 6-16 14-16s14 6 14 16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Eyes */}
      <ellipse cx="25" cy="26" rx="2.5" ry="1.8" fill="currentColor"/>
      <ellipse cx="39" cy="26" rx="2.5" ry="1.8" fill="currentColor"/>
      {/* Eye shine */}
      <circle cx="26" cy="25.2" r="0.8" fill="white" opacity="0.7"/>
      <circle cx="40" cy="25.2" r="0.8" fill="white" opacity="0.7"/>
      {/* Nose */}
      <path d="M32 28v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Mouth */}
      <path d="M27 35c2.5 2.5 7.5 2.5 10 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Ears */}
      <path d="M18 24c-2 0-3 2-3 4s1 4 3 4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M46 24c2 0 3 2 3 4s-1 4-3 4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      {/* Neck */}
      <path d="M28 42v4h8v-4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      {/* Shoulders */}
      <path d="M14 56c0-6 8-10 18-10s18 4 18 10" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Arrow indicator - facing forward */}
      <circle cx="32" cy="56" r="2" fill="currentColor" opacity="0.3"/>
    </svg>
  ),
  profile: ({ className }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Head - side view */}
      <path d="M38 10c-8-2-16 4-16 14v6c0 4 2 8 6 10l3 2v4c-6 2-14 5-14 12h32c0-7-8-10-14-12v-4l3-2c4-2 6-6 6-10v-6c0-10-4-14-6-14z" stroke="currentColor" strokeWidth="2" fill="none"/>
      {/* Eye */}
      <ellipse cx="36" cy="24" rx="2" ry="1.5" fill="currentColor"/>
      <circle cx="36.8" cy="23.5" r="0.6" fill="white" opacity="0.7"/>
      {/* Nose */}
      <path d="M42 24c2 2 2 4 0 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      {/* Mouth */}
      <path d="M36 33c2 0.5 3 0 4-0.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Ear */}
      <path d="M24 22c-2 0-3 2-3 4s1 4 3 4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      {/* Hair */}
      <path d="M22 18c0-8 6-12 14-12 4 0 6 2 6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Direction arrow */}
      <path d="M50 24l4 0M52 21l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
    </svg>
  ),
  semi_profile: ({ className }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Head - 3/4 view, slightly rotated */}
      <ellipse cx="30" cy="26" rx="13" ry="16" stroke="currentColor" strokeWidth="2" fill="none" transform="rotate(-8 30 26)"/>
      {/* Hair */}
      <path d="M17 20c1-10 7-15 14-14s11 5 12 14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Near eye */}
      <ellipse cx="24" cy="25" rx="2.2" ry="1.6" fill="currentColor"/>
      <circle cx="24.7" cy="24.3" r="0.7" fill="white" opacity="0.7"/>
      {/* Far eye - smaller (perspective) */}
      <ellipse cx="35" cy="24" rx="1.8" ry="1.4" fill="currentColor"/>
      <circle cx="35.5" cy="23.3" r="0.6" fill="white" opacity="0.7"/>
      {/* Nose - slightly to the side */}
      <path d="M31 27c1 1.5 2 3 1 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Mouth */}
      <path d="M25 35c2.5 2 6 1.5 8 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      {/* Ear (visible one) */}
      <path d="M16 23c-2 0.5-3 2.5-2.5 4.5s1.5 3.5 3 3.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      {/* Neck & shoulders */}
      <path d="M26 42v4h8v-4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M12 56c0-6 8-10 18-10s18 4 18 10" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Rotation hint arrow */}
      <path d="M48 18c2 2 3 5 3 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/>
      <path d="M46 16l2 2 2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
    </svg>
  ),
  low_angle: ({ className }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Head - viewed from below, wider jaw/chin visible */}
      <ellipse cx="32" cy="28" rx="15" ry="12" stroke="currentColor" strokeWidth="2" fill="none"/>
      {/* Chin/jaw line emphasized */}
      <path d="M20 32c2 6 6 10 12 10s10-4 12-10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Eyes - looking slightly down */}
      <ellipse cx="25" cy="26" rx="2.2" ry="1.4" fill="currentColor"/>
      <ellipse cx="39" cy="26" rx="2.2" ry="1.4" fill="currentColor"/>
      {/* Nose - underside visible (nostrils) */}
      <ellipse cx="30" cy="31" rx="1.2" ry="0.8" fill="currentColor" opacity="0.5"/>
      <ellipse cx="34" cy="31" rx="1.2" ry="0.8" fill="currentColor" opacity="0.5"/>
      <path d="M29 30c0 0 3 2 6 0" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      {/* Mouth */}
      <path d="M27 35c2.5 2 7.5 2 10 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      {/* Neck */}
      <path d="M28 40v6h8v-6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      {/* Shoulders */}
      <path d="M10 58c0-5 10-8 22-8s22 3 22 8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Up arrow - indicating camera angle from below */}
      <path d="M32 8v8M28 12l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
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
          <IconComponent className="w-12 h-12 text-fuchsia-400/70" />
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
