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
    <div className="flex-shrink-0 border-t border-white/[0.04] bg-[#0a0a14] px-2 py-2 sm:px-3">
      <div className="flex items-center gap-1.5 overflow-x-auto overflow-y-hidden pb-1 sm:gap-2" style={{ scrollbarWidth: 'thin' }}>
        {scenes.map((scene, index) => {
          const hasContent = !!scene.outputUrl;
          const isActive = activeSceneId === scene.id;

          return (
            <div
              key={scene.id}
              onClick={() => onLoad(scene.id)}
              className={`flex-shrink-0 rounded overflow-hidden cursor-pointer group relative transition-all
                w-[68px] h-[46px] sm:w-[86px] sm:h-[56px] lg:w-[112px] lg:h-[72px]
                ${isActive
                  ? 'ring-1 ring-gray-400/40'
                  : 'border border-white/[0.04] hover:border-border'
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
                  <Film className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
                  <span className="text-[7px] sm:text-[8px] text-muted-foreground">{index + 1}</span>
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1 py-1 sm:px-1.5">
                <p className="text-[8px] sm:text-[9px] text-muted-foreground truncate">Cena {index + 1}</p>
              </div>

              {hasContent && (
                <button
                  onClick={e => { e.stopPropagation(); onRemove(scene.id); }}
                  className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-2.5 h-2.5 text-muted-foreground" />
                </button>
              )}
            </div>
          );
        })}

        {generatedCount > 0 && onAnimateAll && (
          <button
            onClick={onAnimateAll}
            className="flex-shrink-0 rounded border border-gray-600/30 hover:border-gray-500/50 bg-white/[0.03] hover:bg-white/[0.06] flex flex-col items-center justify-center gap-1 transition-all
              w-[68px] h-[46px] sm:w-[86px] sm:h-[56px] lg:w-[112px] lg:h-[72px]"
          >
            <Play className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
            <span className="text-[7px] sm:text-[9px] text-muted-foreground font-medium">Animar ({generatedCount})</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default StoryboardStrip;
