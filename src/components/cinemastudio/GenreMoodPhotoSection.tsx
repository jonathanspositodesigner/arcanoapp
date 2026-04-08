import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { CinemaSettings } from '@/utils/cinemaPromptBuilder';

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

const GENRE_OPTIONS: StyleOption[] = [
  { value: 'General', seed: 'general-cinematic', label: 'General', description: 'Equilíbrio cinematográfico' },
  { value: 'Action', seed: 'action-explosion', label: 'Action', description: 'Energia intensa e movimento' },
  { value: 'Horror', seed: 'horror-dark', label: 'Horror', description: 'Sombrio, tenso e perturbador' },
  { value: 'Comedy', seed: 'comedy-bright', label: 'Comedy', description: 'Leve, colorido e expressivo' },
  { value: 'Noir', seed: 'noir-shadows', label: 'Noir', description: 'Preto e branco, contrastes fortes' },
  { value: 'Drama', seed: 'drama-emotional', label: 'Drama', description: 'Emotivo e psicológico' },
  { value: 'Epic', seed: 'epic-landscape', label: 'Epic', description: 'Grandioso e monumental' },
  { value: 'Thriller', seed: 'thriller-suspense', label: 'Thriller', description: 'Suspenso e claustrofóbico' },
  { value: 'Romance', seed: 'romance-soft', label: 'Romance', description: 'Suave, quente e íntimo' },
  { value: 'Sci-Fi', seed: 'scifi-neon', label: 'Sci-Fi', description: 'Futurista e tecnológico' },
  { value: 'Fantasy', seed: 'fantasy-magic', label: 'Fantasy', description: 'Místico e surreal' },
];

const MOOD_OPTIONS: StyleOption[] = [
  { value: '', seed: '', label: 'Nenhum', description: 'Sem tom específico' },
  { value: 'Tense', seed: 'tense-dark', label: 'Tenso', description: 'Comprimido, contido, nervoso' },
  { value: 'Peaceful', seed: 'peaceful-nature', label: 'Tranquilo', description: 'Calmo, arejado, sereno' },
  { value: 'Melancholic', seed: 'melancholy-fog', label: 'Melancólico', description: 'Nostálgico e introspectivo' },
  { value: 'Euphoric', seed: 'euphoric-light', label: 'Eufórico', description: 'Vibrante e celebrativo' },
  { value: 'Mysterious', seed: 'mysterious-mist', label: 'Misterioso', description: 'Ambíguo e intrigante' },
  { value: 'Intense', seed: 'intense-contrast', label: 'Intenso', description: 'Concentrado e impactante' },
  { value: 'Dramatic', seed: 'dramatic-storm', label: 'Dramático', description: 'Teatral e expressivo' },
  { value: 'Romantic', seed: 'romantic-warm', label: 'Romântico', description: 'Íntimo e delicado' },
];

const COLOR_GRADE_OPTIONS: StyleOption[] = [
  { value: 'Natural', seed: 'natural-colors', label: 'Natural', description: 'Fiel à realidade' },
  { value: 'Warm Sunset', seed: 'warm-sunset-orange', label: 'Pôr do Sol Quente', description: 'Tons alaranjados e dourados' },
  { value: 'Cold Blue', seed: 'cold-blue-tones', label: 'Azul Frio', description: 'Frio, distante e melancólico' },
  { value: 'Noir B&W', seed: 'noir-blackwhite', label: 'Noir P&B', description: 'Preto e branco com alto contraste' },
  { value: 'Teal & Orange', seed: 'teal-orange-grade', label: 'Teal & Orange', description: 'O grade de Hollywood clássico' },
  { value: 'Vintage Film', seed: 'vintage-film-grain', label: 'Filme Vintage', description: 'Granulado, desbotado, nostálgico' },
  { value: 'Neon Night', seed: 'neon-cyberpunk-night', label: 'Neon Night', description: 'Roxo, azul e rosa elétrico' },
  { value: 'Desaturated', seed: 'desaturated-muted', label: 'Dessaturado', description: 'Apagado, cansado, documental' },
  { value: 'High Contrast', seed: 'high-contrast-bold', label: 'Alto Contraste', description: 'Pretos profundos, luzes estouradas' },
];

const StyleDropdown: React.FC<{
  label: string;
  options: StyleOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  defaultValue?: string;
}> = ({ label, options, selectedValue, onSelect, defaultValue = '' }) => {
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
              {selected.seed && (
                <img
                  src={`https://picsum.photos/seed/${selected.seed}/56/56`}
                  alt=""
                  className="w-5 h-5 rounded object-cover flex-shrink-0"
                  loading="lazy"
                />
              )}
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
                  key={opt.value || '_none'}
                  onClick={() => {
                    onSelect(isSelected ? (defaultValue ?? '') : opt.value);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-2.5 w-full px-2 py-2 transition-colors ${
                    isSelected
                      ? 'bg-white/[0.06] border-l-2 border-purple-500'
                      : 'hover:bg-white/[0.04] border-l-2 border-transparent'
                  }`}
                >
                  {opt.seed ? (
                    <img
                      src={`https://picsum.photos/seed/${opt.seed}/56/56`}
                      alt={opt.label}
                      className="w-[40px] h-[40px] rounded object-cover flex-shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-[40px] h-[40px] rounded bg-white/[0.04] flex-shrink-0 flex items-center justify-center">
                      <span className="text-gray-600 text-[9px]">—</span>
                    </div>
                  )}
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

const GenreMoodPhotoSection: React.FC<Props> = ({ settings, updateSettings }) => {
  return (
    <div className="space-y-2">
      <StyleDropdown
        label="Gênero"
        options={GENRE_OPTIONS}
        selectedValue={settings.genre}
        onSelect={v => updateSettings({ genre: v || 'General' })}
        defaultValue="General"
      />
      <StyleDropdown
        label="Tom"
        options={MOOD_OPTIONS}
        selectedValue={settings.mood || ''}
        onSelect={v => updateSettings({ mood: v })}
        defaultValue=""
      />
      <StyleDropdown
        label="Cor"
        options={COLOR_GRADE_OPTIONS}
        selectedValue={settings.colorGrade}
        onSelect={v => updateSettings({ colorGrade: v || 'Natural' })}
        defaultValue="Natural"
      />
    </div>
  );
};

export default GenreMoodPhotoSection;
