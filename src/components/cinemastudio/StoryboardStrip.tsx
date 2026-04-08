import React from 'react';
import { Plus, X, Film } from 'lucide-react';
import type { StoryboardScene } from '@/hooks/useCinemaStudio';

interface Props {
  scenes: StoryboardScene[];
  activeSceneId: string | null;
  onLoad: (id: string) => void;
  onRemove: (id: string) => void;
  onAddNew: () => void;
}

const StoryboardStrip: React.FC<Props> = ({ scenes, activeSceneId, onLoad, onRemove, onAddNew }) => {
  return (
    <div className="h-20 flex-shrink-0 border-t border-white/[0.04] bg-[#0a0a14] px-3 flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
      {scenes.length === 0 && (
        <>
          {[0, 1, 2].map(i => (
            <div key={i} className="flex-shrink-0 w-28 h-16 rounded bg-white/[0.02] border border-white/[0.04] animate-pulse" />
          ))}
        </>
      )}

      {scenes.map(scene => (
        <div
          key={scene.id}
          onClick={() => onLoad(scene.id)}
          className={`flex-shrink-0 w-28 h-16 rounded overflow-hidden cursor-pointer group relative transition-all ${
            activeSceneId === scene.id
              ? 'ring-1 ring-gray-400/40'
              : 'border border-white/[0.04] hover:border-white/[0.08]'
          }`}
        >
          {scene.thumbnailUrl ? (
            <video src={scene.thumbnailUrl} className="w-full h-full object-cover" muted />
          ) : (
            <div className="w-full h-full bg-white/[0.02] flex items-center justify-center">
              <Film className="w-4 h-4 text-gray-800" />
            </div>
          )}
          {/* Name overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1">
            <p className="text-[9px] text-gray-300 truncate">{scene.name}</p>
          </div>
          {/* Delete on hover */}
          <button
            onClick={e => { e.stopPropagation(); onRemove(scene.id); }}
            className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-2.5 h-2.5 text-gray-400" />
          </button>
        </div>
      ))}

      {/* Add scene */}
      <button
        onClick={onAddNew}
        className="flex-shrink-0 w-28 h-16 rounded border border-dashed border-white/[0.06] flex items-center justify-center hover:bg-white/[0.02] transition-colors"
      >
        <Plus className="w-4 h-4 text-gray-700" />
      </button>
    </div>
  );
};

export default StoryboardStrip;
