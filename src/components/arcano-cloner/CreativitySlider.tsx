import React from 'react';
import { Sparkles } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface CreativitySliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const CreativitySlider: React.FC<CreativitySliderProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-2">
      <p className="text-[10px] font-semibold text-white mb-2 flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 text-purple-400" />
        Criatividade da IA
      </p>
      
      <div className="px-1">
        <Slider
          min={1}
          max={6}
          step={1}
          value={[value]}
          onValueChange={(vals) => onChange(vals[0])}
          disabled={disabled}
          className="w-full"
        />
        
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[9px] text-purple-400">Mais fiel</span>
          <span className="text-[10px] font-bold text-white bg-purple-600/40 rounded px-1.5 py-0.5">
            {value}
          </span>
          <span className="text-[9px] text-purple-400">Muito criativo</span>
        </div>
      </div>
    </div>
  );
};

export default CreativitySlider;
