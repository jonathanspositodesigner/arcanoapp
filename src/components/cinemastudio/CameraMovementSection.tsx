import React from 'react';
import { Plus, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MOVEMENT_TYPES, type CinemaSettings, type CameraMovementLayer } from '@/utils/cinemaPromptBuilder';

interface Props {
  settings: CinemaSettings;
  updateSettings: (p: Partial<CinemaSettings>) => void;
}

const CameraMovementSection: React.FC<Props> = ({ settings, updateSettings }) => {
  const { movements } = settings;

  const updateLayer = (index: number, partial: Partial<CameraMovementLayer>) => {
    const updated = movements.map((m, i) => i === index ? { ...m, ...partial } : m);
    updateSettings({ movements: updated });
  };

  const addLayer = () => {
    if (movements.length >= 3) return;
    updateSettings({ movements: [...movements, { type: 'None', intensity: 50 }] });
  };

  const removeLayer = (index: number) => {
    if (movements.length <= 1) return;
    updateSettings({ movements: movements.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-1.5">
      {movements.map((layer, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Select value={layer.type} onValueChange={v => updateLayer(i, { type: v })}>
            <SelectTrigger className="flex-1 bg-black/20 border-border text-muted-foreground text-[11px] h-7">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-border max-h-48">
              {MOVEMENT_TYPES.map(m => (
                <SelectItem key={m} value={m} className="text-muted-foreground text-[11px]">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {layer.type !== 'None' && (
            <div className="w-20 flex-shrink-0">
              <Slider
                min={0} max={100} step={1}
                value={[layer.intensity]}
                onValueChange={([v]) => updateLayer(i, { intensity: v })}
                className="[&_[data-radix-slider-track]]:bg-white/[0.06] [&_[data-radix-slider-track]]:h-1 [&_[data-radix-slider-range]]:bg-accent0 [&_[data-radix-slider-thumb]]:border-gray-500 [&_[data-radix-slider-thumb]]:h-2.5 [&_[data-radix-slider-thumb]]:w-2.5"
              />
            </div>
          )}
          {movements.length > 1 && (
            <button onClick={() => removeLayer(i)} className="text-muted-foreground hover:text-muted-foreground transition-colors flex-shrink-0">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}

      {movements.length < 3 && (
        <button
          onClick={addLayer}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-muted-foreground transition-colors pt-0.5"
        >
          <Plus className="w-3 h-3" /> Adicionar movimento
        </button>
      )}
    </div>
  );
};

export default CameraMovementSection;
