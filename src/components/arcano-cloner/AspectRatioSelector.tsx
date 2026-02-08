import React from 'react';
import { Smartphone, Square, RectangleVertical, RectangleHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AspectRatio = '9:16' | '1:1' | '3:4' | '16:9';

interface AspectRatioOption {
  value: AspectRatio;
  label: string;
  icon: React.ReactNode;
}

const aspectRatioOptions: AspectRatioOption[] = [
  {
    value: '9:16',
    label: 'Stories',
    icon: <Smartphone className="w-4 h-4" />,
  },
  {
    value: '1:1',
    label: 'Quadrado',
    icon: <Square className="w-4 h-4" />,
  },
  {
    value: '3:4',
    label: 'Feed Vert.',
    icon: <RectangleVertical className="w-4 h-4" />,
  },
  {
    value: '16:9',
    label: 'Retangular',
    icon: <RectangleHorizontal className="w-4 h-4" />,
  },
];

interface AspectRatioSelectorProps {
  value: AspectRatio;
  onChange: (value: AspectRatio) => void;
  disabled?: boolean;
}

const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-2">
      <p className="text-[10px] font-semibold text-white mb-2 flex items-center gap-1.5">
        <RectangleVertical className="w-3 h-3 text-purple-400" />
        Proporção
      </p>
      
      <div className="grid grid-cols-4 gap-1.5">
        {aspectRatioOptions.map((option) => {
          const isSelected = value === option.value;
          
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg transition-all",
                "border text-center",
                isSelected
                  ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 border-fuchsia-500 text-white"
                  : "bg-purple-900/30 border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:text-white",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <span className={cn(
                "transition-colors",
                isSelected ? "text-white" : "text-purple-400"
              )}>
                {option.icon}
              </span>
              <span className="text-[9px] font-medium leading-tight">
                {option.label}
              </span>
              <span className="text-[8px] opacity-70">
                {option.value}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AspectRatioSelector;
