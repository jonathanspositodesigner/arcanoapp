import React from 'react';
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

const StyleOptionCard: React.FC<{
  option: StyleOption;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ option, isSelected, onSelect }) => (
  <button
    onClick={onSelect}
    className={`flex items-center gap-2.5 w-full p-1.5 rounded-md transition-colors ${
      isSelected
        ? 'bg-white/[0.06] border-l-2 border-purple-500'
        : 'hover:bg-white/[0.03] border-l-2 border-transparent'
    }`}
  >
    {option.seed ? (
      <img
        src={`https://picsum.photos/seed/${option.seed}/56/56`}
        alt={option.label}
        className="w-[42px] h-[42px] rounded object-cover flex-shrink-0"
        loading="lazy"
      />
    ) : (
      <div className="w-[42px] h-[42px] rounded bg-white/[0.04] flex-shrink-0 flex items-center justify-center">
        <span className="text-gray-600 text-[9px]">—</span>
      </div>
    )}
    <div className="text-left min-w-0">
      <span className={`text-[11px] font-medium block ${isSelected ? 'text-gray-200' : 'text-gray-400'}`}>
        {option.label}
      </span>
      <span className="text-[9px] text-gray-600 block truncate">{option.description}</span>
    </div>
  </button>
);

const GenreMoodPhotoSection: React.FC<Props> = ({ settings, updateSettings }) => {
  return (
    <div className="space-y-4">
      {/* Gênero */}
      <div>
        <span className="text-[9px] text-gray-600 uppercase tracking-[0.15em] font-semibold mb-1.5 block">Gênero</span>
        <div className="space-y-0.5">
          {GENRE_OPTIONS.map(opt => (
            <StyleOptionCard
              key={opt.value}
              option={opt}
              isSelected={settings.genre === opt.value}
              onSelect={() => updateSettings({ genre: settings.genre === opt.value ? 'General' : opt.value })}
            />
          ))}
        </div>
      </div>

      {/* Tom */}
      <div>
        <span className="text-[9px] text-gray-600 uppercase tracking-[0.15em] font-semibold mb-1.5 block">Tom</span>
        <div className="space-y-0.5">
          {MOOD_OPTIONS.map(opt => (
            <StyleOptionCard
              key={opt.value || 'none'}
              option={opt}
              isSelected={(settings.mood || '') === opt.value}
              onSelect={() => updateSettings({ mood: (settings.mood || '') === opt.value ? '' : opt.value })}
            />
          ))}
        </div>
      </div>

      {/* Grade de Cor */}
      <div>
        <span className="text-[9px] text-gray-600 uppercase tracking-[0.15em] font-semibold mb-1.5 block">Grade de Cor</span>
        <div className="space-y-0.5">
          {COLOR_GRADE_OPTIONS.map(opt => (
            <StyleOptionCard
              key={opt.value}
              option={opt}
              isSelected={settings.colorGrade === opt.value}
              onSelect={() => updateSettings({ colorGrade: settings.colorGrade === opt.value ? 'Natural' : opt.value })}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default GenreMoodPhotoSection;
