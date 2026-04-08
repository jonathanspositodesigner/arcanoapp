import React, { useRef } from 'react';
import { Upload, X, Film } from 'lucide-react';

interface Props {
  images: File[];
  previews: string[];
  onAdd: (files: FileList | null) => void;
  onRemove: (index: number) => void;
}

const ReferenceSection: React.FC<Props> = ({ images, previews, onAdd, onRemove }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-gray-500">
        Fixe personagem, locação ou estilo entre cenas. Máx. 9 imagens, 10MB cada.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {previews.map((url, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            {i === 0 && (
              <span className="absolute top-0.5 left-0.5 bg-purple-600/80 text-[8px] text-white px-1 py-0.5 rounded flex items-center gap-0.5">
                <Film className="w-2.5 h-2.5" /> Hero
              </span>
            )}
            <button
              onClick={() => onRemove(i)}
              className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}
        {images.length < 9 && (
          <button
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-lg border border-dashed border-white/20 flex flex-col items-center justify-center hover:bg-white/5 transition-colors gap-1"
          >
            <Upload className="w-4 h-4 text-gray-400" />
            <span className="text-[9px] text-gray-500">Upload</span>
          </button>
        )}
      </div>
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
