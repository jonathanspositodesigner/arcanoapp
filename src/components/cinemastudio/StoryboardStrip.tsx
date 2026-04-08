import React from 'react';
import { Plus, X, Play, Film, Camera } from 'lucide-react';
import type { StoryboardScene } from '@/hooks/useCinemaStudio';

interface Props {
  scenes: StoryboardScene[];
  activeSceneId: string | null;
  onLoad: (id: string) => void;
  onRemove: (id: string) => void;
  onAddNew: () => void;
}

const StoryboardStrip: React.FC<Props> = ({ scenes, activeSceneId, onLoad, onRemove, onAddNew }) => {
  if (scenes.length === 0) {
    return (
      <div className="border-t border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Storyboard</span>
          <button
            onClick={onAddNew}
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded px-2 py-1 transition-colors"
          >
            <Plus className="w-3 h-3" /> Nova Cena
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-white/5 px-4 py-3">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2 block">Storyboard</span>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
        {scenes.map(scene => (
          <div
            key={scene.id}
            onClick={() => onLoad(scene.id)}
            className={`flex-shrink-0 w-36 rounded-lg overflow-hidden border cursor-pointer group transition-all ${
              activeSceneId === scene.id
                ? 'border-purple-500/60 ring-1 ring-purple-500/30'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            {/* Thumbnail */}
            <div className="aspect-video bg-black/40 relative">
              {scene.thumbnailUrl ? (
                <video src={scene.thumbnailUrl} className="w-full h-full object-cover" muted />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Film className="w-5 h-5 text-gray-600" />
                </div>
              )}
              {/* Overlay actions */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button className="p-1 bg-white/10 rounded hover:bg-white/20">
                  <Play className="w-3.5 h-3.5 text-white" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onRemove(scene.id); }}
                  className="p-1 bg-white/10 rounded hover:bg-red-500/30"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
            {/* Info */}
            <div className="px-2 py-1.5 bg-black/30">
              <p className="text-[10px] text-white font-medium truncate">{scene.name}</p>
              <p className="text-[8px] text-gray-500">
                {scene.settings.duration}s · {scene.settings.quality} · {scene.type === 'video' ? '🎬' : '📷'}
              </p>
            </div>
          </div>
        ))}

        {/* Add new scene */}
        <button
          onClick={onAddNew}
          className="flex-shrink-0 w-36 rounded-lg border border-dashed border-white/15 flex flex-col items-center justify-center gap-1 hover:bg-white/5 transition-colors min-h-[80px]"
        >
          <Plus className="w-4 h-4 text-gray-500" />
          <span className="text-[10px] text-gray-500">Nova Cena</span>
        </button>
      </div>
    </div>
  );
};

export default StoryboardStrip;
