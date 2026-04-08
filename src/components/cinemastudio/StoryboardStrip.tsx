import React from 'react';
import { X, Film } from 'lucide-react';
import type { StoryboardScene } from '@/hooks/useCinemaStudio';

interface Props {
  scenes: StoryboardScene[];
  activeSceneId: string | null;
  onLoad: (id: string) => void;
  onRemove: (id: string) => void;
  onAddNew: () => void;
}

const StoryboardStrip: React.FC<Props> = ({ scenes, activeSceneId, onLoad, onRemove }) => {
  return (
    <div className="h-20 flex-shrink-0 border-t border-white/[0.04] bg-[#0a0a14] px-3 flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
      {scenes.map((scene, index) => {
        const hasContent = !!scene.outputUrl;
        const isActive = activeSceneId === scene.id;

        return (
          <div
            key={scene.id}
            onClick={() => onLoad(scene.id)}
            className={`flex-shrink-0 w-28 h-16 rounded overflow-hidden cursor-pointer group relative transition-all ${
              isActive
                ? 'ring-1 ring-gray-400/40'
                : 'border border-white/[0.04] hover:border-white/[0.08]'
            }`}
          >
            {hasContent && scene.thumbnailUrl ? (
              scene.type === 'video' ? (
                <video src={scene.thumbnailUrl} className="w-full h-full object-cover" muted />
              ) : (
                <img src={scene.thumbnailUrl} className="w-full h-full object-cover" alt={scene.name} />
              )
            ) : (
              <div className="w-full h-full bg-white/[0.02] flex flex-col items-center justify-center gap-1">
                <Film className="w-3.5 h-3.5 text-gray-700" />
                <span className="text-[8px] text-gray-700">{index + 1}</span>
              </div>
            )}

            {/* Scene number label */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1">
              <p className="text-[9px] text-gray-300 truncate">Cena {index + 1}</p>
            </div>

            {/* Clear button on hover (only if has content) */}
            {hasContent && (
              <button
                onClick={e => { e.stopPropagation(); onRemove(scene.id); }}
                className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5 text-gray-400" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StoryboardStrip;
