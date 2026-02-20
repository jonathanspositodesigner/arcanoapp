import React from 'react';

export interface RefinementVersion {
  url: string;
  label: string;
}

interface RefinementTimelineProps {
  versions: RefinementVersion[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const RefinementTimeline: React.FC<RefinementTimelineProps> = ({ versions, selectedIndex, onSelect }) => {
  if (versions.length <= 1) return null;

  return (
    <div className="px-3 py-2 border-t border-purple-500/20 flex-shrink-0">
      <p className="text-[10px] text-purple-400 mb-1.5">Versões</p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-purple-500/30">
        {versions.map((v, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`flex-shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-all ${
              i === selectedIndex
                ? 'border-fuchsia-500 ring-1 ring-fuchsia-500/50'
                : 'border-purple-500/30 hover:border-purple-400/50'
            }`}
          >
            <img src={v.url} alt={v.label} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
      <p className="text-[10px] text-purple-400 mt-1">{versions[selectedIndex]?.label}</p>
    </div>
  );
};

export default RefinementTimeline;
