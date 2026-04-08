import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CAMERA_BODIES, LENS_TYPES, FOCAL_PRESETS, APERTURES, CAMERA_ANGLES, CAMERA_DISTANCES,
  type CinemaSettings,
} from '@/utils/cinemaPromptBuilder';

interface Props {
  settings: CinemaSettings;
  updateSettings: (p: Partial<CinemaSettings>) => void;
}

interface StyleOption {
  value: string;
  seed: string;
  label: string;
  description: string;
}

const ANGLE_OPTIONS: StyleOption[] = [
  { value: 'Eye Level', seed: 'eye-level-neutral', label: 'Eye Level', description: 'Neutro, natural, à altura dos olhos' },
  { value: 'Low Angle', seed: 'low-angle-power', label: 'Low Angle', description: 'De baixo para cima, imponente' },
  { value: 'High Angle', seed: 'high-angle-above', label: 'High Angle', description: 'De cima para baixo, vulnerável' },
  { value: 'Dutch Angle', seed: 'dutch-angle-tilted', label: 'Dutch Angle', description: 'Inclinado, tensão e desorientação' },
  { value: "Bird's Eye", seed: 'birds-eye-overhead', label: "Bird's Eye", description: 'Vista aérea, diretamente de cima' },
  { value: "Worm's Eye", seed: 'worms-eye-ground', label: "Worm's Eye", description: 'Do chão olhando para cima, gigante' },
  { value: 'POV', seed: 'pov-first-person', label: 'POV', description: 'Primeira pessoa, pelos olhos do personagem' },
  { value: 'Over the Shoulder', seed: 'over-shoulder-ots', label: 'Over the Shoulder', description: 'Por cima do ombro, profundidade' },
  { value: 'Hip Level', seed: 'hip-level-western', label: 'Hip Level', description: 'Altura da cintura, estilo western' },
  { value: 'Ground Level', seed: 'ground-level-floor', label: 'Ground Level', description: 'Câmera no chão, dramático' },
];

const DISTANCE_OPTIONS: StyleOption[] = [
  { value: 'Medium Shot', seed: 'medium-shot-balanced', label: 'Medium Shot', description: 'Cintura pra cima, equilibrado' },
  { value: 'Extreme Close-Up', seed: 'extreme-closeup-eye', label: 'Extreme Close-Up', description: 'Detalhe extremo, olhos ou textura' },
  { value: 'Close-Up', seed: 'closeup-face-detail', label: 'Close-Up', description: 'Rosto preenchendo o quadro' },
  { value: 'Medium Close-Up', seed: 'medium-closeup-chest', label: 'Medium Close-Up', description: 'Peito e cabeça, conexão emocional' },
  { value: 'Cowboy Shot', seed: 'cowboy-shot-western', label: 'Cowboy Shot', description: 'Meio da coxa, estilo western' },
  { value: 'Medium Wide', seed: 'medium-wide-torso', label: 'Medium Wide', description: 'Torso completo com contexto' },
  { value: 'Full Shot', seed: 'full-shot-body', label: 'Full Shot', description: 'Corpo inteiro, cabeça aos pés' },
  { value: 'Wide Shot', seed: 'wide-shot-landscape', label: 'Wide Shot', description: 'Sujeito pequeno, ambiente domina' },
  { value: 'Extreme Wide', seed: 'extreme-wide-epic', label: 'Extreme Wide', description: 'Paisagem vasta, escala épica' },
  { value: 'Establishing Shot', seed: 'establishing-overview', label: 'Establishing Shot', description: 'Visão geral, revelação do local' },
];

const CameraStyleDropdown: React.FC<{
  label: string;
  options: StyleOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
}> = ({ label, options, selectedValue, onSelect }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === selectedValue);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-1.5 px-2 rounded-md bg-black/20 border border-white/[0.06] hover:border-white/[0.12] transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[9px] text-gray-600 uppercase tracking-[0.12em] font-semibold w-12 flex-shrink-0">{label}</span>
          {selected && (
            <div className="flex items-center gap-1.5 min-w-0">
              <img
                src={`https://picsum.photos/seed/${selected.seed}/56/56`}
                alt=""
                className="w-5 h-5 rounded object-cover flex-shrink-0"
                loading="lazy"
              />
              <span className="text-[11px] text-gray-300 truncate">{selected.label}</span>
            </div>
          )}
        </div>
        <ChevronDown className={`w-3 h-3 text-gray-600 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-[#141420] border border-white/[0.08] rounded-lg shadow-xl max-h-[280px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {options.map(opt => {
              const isSelected = opt.value === selectedValue;
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    onSelect(opt.value);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-2.5 w-full px-2 py-2 transition-colors ${
                    isSelected
                      ? 'bg-white/[0.06] border-l-2 border-purple-500'
                      : 'hover:bg-white/[0.04] border-l-2 border-transparent'
                  }`}
                >
                  <img
                    src={`https://picsum.photos/seed/${opt.seed}/56/56`}
                    alt={opt.label}
                    className="w-[40px] h-[40px] rounded object-cover flex-shrink-0"
                    loading="lazy"
                  />
                  <div className="text-left min-w-0">
                    <span className={`text-[11px] font-medium block ${isSelected ? 'text-gray-200' : 'text-gray-400'}`}>
                      {opt.label}
                    </span>
                    <span className="text-[9px] text-gray-600 block">{opt.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

const SegmentedControl: React.FC<{
  label: string;
  options: (string | number)[];
  value: string | number;
  onChange: (v: any) => void;
  suffix?: string;
}> = ({ label, options, value, onChange, suffix = '' }) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] text-gray-600 uppercase tracking-wider w-14 flex-shrink-0">{label}</span>
    <div className="flex-1 flex bg-white/[0.02] rounded-md p-0.5 gap-0.5">
      {options.map(o => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`flex-1 py-1 text-[10px] rounded transition-all ${
            value === o
              ? 'bg-white/[0.08] text-gray-200 font-medium'
              : 'text-gray-600 hover:text-gray-400'
          }`}
        >
          {o}{suffix}
        </button>
      ))}
    </div>
  </div>
);

const CameraRigSection: React.FC<Props> = ({ settings, updateSettings }) => {
  return (
    <div className="space-y-2.5">
      {/* Ângulo / Perspectiva */}
      <AngleDropdown
        selectedValue={settings.cameraAngle}
        onSelect={v => updateSettings({ cameraAngle: v })}
      />

      {/* Corpo */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-600 uppercase tracking-wider w-14 flex-shrink-0">Corpo</span>
        <Select value={settings.cameraBody} onValueChange={v => updateSettings({ cameraBody: v })}>
          <SelectTrigger className="flex-1 bg-black/20 border-white/[0.06] text-gray-300 text-[11px] h-7">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#141420] border-white/[0.06]">
            {CAMERA_BODIES.map(c => (
              <SelectItem key={c.value} value={c.value} className="text-gray-300 text-[11px]">
                {c.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lente */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-600 uppercase tracking-wider w-14 flex-shrink-0">Lente</span>
        <Select value={settings.lensType} onValueChange={v => updateSettings({ lensType: v })}>
          <SelectTrigger className="flex-1 bg-black/20 border-white/[0.06] text-gray-300 text-[11px] h-7">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#141420] border-white/[0.06]">
            {LENS_TYPES.map(l => (
              <SelectItem key={l} value={l} className="text-gray-300 text-[11px]">
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Focal */}
      <SegmentedControl
        label="Focal"
        options={FOCAL_PRESETS}
        value={settings.focalLength}
        onChange={v => updateSettings({ focalLength: v })}
        suffix="mm"
      />

      {/* Abertura */}
      <SegmentedControl
        label="Abertura"
        options={APERTURES}
        value={settings.aperture}
        onChange={v => updateSettings({ aperture: v })}
      />
    </div>
  );
};

export default CameraRigSection;
