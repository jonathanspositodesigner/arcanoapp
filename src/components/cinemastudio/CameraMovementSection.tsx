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
    <div className="space-y-3">
      {movements.map((layer, i) => (
        <div key={i} className="bg-black/20 rounded-lg p-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 w-12">Layer {i + 1}</span>
            <Select value={layer.type} onValueChange={v => updateLayer(i, { type: v })}>
              <SelectTrigger className="flex-1 bg-black/40 border-white/10 text-white text-xs h-7">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/10 max-h-48">
                {MOVEMENT_TYPES.map(m => (
                  <SelectItem key={m} value={m} className="text-white text-xs">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {movements.length > 1 && (
              <button onClick={() => removeLayer(i)} className="text-gray-500 hover:text-red-400 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {layer.type !== 'None' && (
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] text-gray-500">Subtle</span>
                <span className="text-[10px] text-gray-500">Dramatic</span>
              </div>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[layer.intensity]}
                onValueChange={([v]) => updateLayer(i, { intensity: v })}
                className="[&_[data-radix-slider-track]]:bg-white/10 [&_[data-radix-slider-range]]:bg-blue-500 [&_[data-radix-slider-thumb]]:border-blue-500 [&_[data-radix-slider-thumb]]:h-3.5 [&_[data-radix-slider-thumb]]:w-3.5"
              />
            </div>
          )}
        </div>
      ))}

      {movements.length < 3 && (
        <button
          onClick={addLayer}
          className="w-full py-1.5 rounded-lg border border-dashed border-white/15 flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar Camada
        </button>
      )}
    </div>
  );
};

export default CameraMovementSection;
