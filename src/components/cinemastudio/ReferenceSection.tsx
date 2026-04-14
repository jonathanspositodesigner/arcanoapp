import React, { useRef } from 'react';
import { Plus, X, Film } from 'lucide-react';

interface Props {
  images: File[];
  previews: string[];
  onAdd: (files: FileList | null) => void;
  onRemove: (index: number) => void;
  maxImages?: number;
}

const ReferenceSection: React.FC<Props> = ({ images, previews, onAdd, onRemove, maxImages = 9 }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1.5">
        {previews.map((url, i) => (
          <div key={i} className="relative aspect-square rounded overflow-hidden border border-white/[0.06] group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            {i === 0 && (
              <span className="absolute top-0.5 left-0.5 bg-accent text-[8px] text-muted-foreground px-1 py-0.5 rounded flex items-center gap-0.5">
                <Film className="w-2 h-2" /> Principal
              </span>
            )}
            <button
              onClick={() => onRemove(i)}
              className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-2.5 h-2.5 text-muted-foreground" />
            </button>
          </div>
        ))}
        {previews.length < maxImages && (
          <button
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded border border-dashed border-white/[0.08] flex items-center justify-center hover:bg-white/[0.02] transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
      <p className="text-[9px] text-muted-foreground">Máx. {maxImages} {maxImages === 1 ? 'imagem' : 'imagens'} · 10MB cada</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={e => { onAdd(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
};

export default ReferenceSection;
