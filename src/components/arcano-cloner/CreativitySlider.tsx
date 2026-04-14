import React from 'react';
import { Sparkles } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface CreativitySliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  max?: number;
  showRecommendation?: boolean;
}

const CreativitySlider: React.FC<CreativitySliderProps> = ({
  value,
  onChange,
  disabled = false,
  max = 100,
  showRecommendation = true,
}) => {
  return (
    <div className="bg-accent border border-border rounded-lg p-2">
      <p className="text-[10px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 text-muted-foreground" />
        Criatividade da IA
      </p>
      
      <div className="px-1">
        <Slider
          min={0}
          max={max}
          step={1}
          value={[value]}
          onValueChange={(vals) => onChange(vals[0])}
          disabled={disabled}
          className="w-full"
        />
        
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[9px] text-muted-foreground">Mais fiel</span>
          <span className="text-[10px] font-bold text-foreground bg-slate-600/40 rounded px-1.5 py-0.5">
            {value}
          </span>
          <span className="text-[9px] text-muted-foreground">Muito criativo</span>
        </div>
        {showRecommendation && <p className="text-[9px] text-muted-foreground text-center mt-1">Recomendado: entre 0 e 30</p>}
      </div>
    </div>
  );
};

export default CreativitySlider;
