import React from 'react';
import { X, Film, Play } from 'lucide-react';
import type { StoryboardScene } from '@/hooks/useCinemaStudio';

interface Props {
  scenes: StoryboardScene[];
  activeSceneId: string | null;
  onLoad: (id: string) => void;
  onRemove: (id: string) => void;
  onAddNew: () => void;
  onAnimateAll?: () => void;
}

const StoryboardStrip: React.FC<Props> = ({ scenes, activeSceneId, onLoad, onRemove, onAnimateAll }) => {
  const generatedCount = scenes.filter(s => !!s.outputUrl).length;

  return (
    <div className="flex-shrink-0 border-t border-white/[0.04] bg-[#0a0a14] px-2 sm:px-3 py-1.5 sm:py-2">
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {scenes.map((scene, index) => {
          const hasContent = !!scene.outputUrl;
          const isActive = activeSceneId === scene.id;

          return (
            <div
              key={scene.id}
              onClick={() => onLoad(scene.id)}
              className={`flex-shrink-0 rounded overflow-hidden cursor-pointer group relative transition-all
                w-16 h-10 sm:w-20 sm:h-12 md:w-28 md:h-16
                ${isActive
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
                <div className="w-full h-full bg-white/[0.02] flex flex-col items-center justify-center gap-0.5">
                  <Film className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-700" />
                  <span className="text-[7px] sm:text-[8px] text-gray-700">{index + 1}</span>
                </div>
              )}

              {/* Scene number label */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1 sm:px-1.5 py-0.5 sm:py-1">
                <p className="text-[7px] sm:text-[9px] text-gray-300 truncate">Cena {index + 1}</p>
              </div>

              {/* Clear button on hover (only if has content) */}
              {hasContent && (
                <button
                  onClick={e => { e.stopPropagation(); onRemove(scene.id); }}
                  className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-gray-400" />
                </button>
              )}
            </div>
          );
        })}

        {/* Animate All button */}
        {generatedCount > 0 && onAnimateAll && (
          <button
            onClick={onAnimateAll}
            className="flex-shrink-0 rounded border border-gray-600/30 hover:border-gray-500/50 bg-white/[0.03] hover:bg-white/[0.06] flex flex-col items-center justify-center gap-1 transition-all
              w-16 h-10 sm:w-20 sm:h-12 md:w-28 md:h-16"
          >
            <Play className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
            <span className="text-[7px] sm:text-[9px] text-gray-400 font-medium">Animar ({generatedCount})</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default StoryboardStrip;
