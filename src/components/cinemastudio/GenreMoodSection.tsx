import React from 'react';
import {
  GENRES, MOODS, COLOR_GRADES,
  GENRE_ICONS, COLOR_GRADE_SWATCHES,
  type CinemaSettings,
} from '@/utils/cinemaPromptBuilder';

interface Props {
  settings: CinemaSettings;
  updateSettings: (p: Partial<CinemaSettings>) => void;
}

const GenreMoodSection: React.FC<Props> = ({ settings, updateSettings }) => {
  return (
    <div className="space-y-3">
      {/* Genre */}
      <div>
        <label className="text-xs font-medium text-white mb-1.5 block">Gênero</label>
        <div className="grid grid-cols-4 gap-1.5">
          {GENRES.map(g => (
            <button
              key={g}
              onClick={() => updateSettings({ genre: g })}
              className={`py-1.5 px-1 text-[10px] rounded-lg transition-all flex flex-col items-center gap-0.5 ${
                settings.genre === g
                  ? 'bg-purple-500/20 border border-purple-500/40 text-white'
                  : 'bg-black/30 border border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-sm">{GENRE_ICONS[g]}</span>
              <span>{g}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mood */}
      <div>
        <label className="text-xs font-medium text-white mb-1.5 block">Tom / Humor</label>
        <div className="flex flex-wrap gap-1.5">
          {MOODS.map(m => (
            <button
              key={m}
              onClick={() => updateSettings({ mood: settings.mood === m ? '' : m })}
              className={`py-1 px-2.5 text-[10px] rounded-full transition-all ${
                settings.mood === m
                  ? 'bg-purple-500/30 border border-purple-500/40 text-white font-medium'
                  : 'bg-black/30 border border-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Color Grade */}
      <div>
        <label className="text-xs font-medium text-white mb-1.5 block">Color Grade</label>
        <div className="grid grid-cols-3 gap-1.5">
          {COLOR_GRADES.map(c => (
            <button
              key={c}
              onClick={() => updateSettings({ colorGrade: c })}
              className={`py-1.5 px-2 text-[10px] rounded-lg transition-all flex items-center gap-1.5 ${
                settings.colorGrade === c
                  ? 'bg-purple-500/20 border border-purple-500/40 text-white'
                  : 'bg-black/30 border border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0 border border-white/10"
                style={{ backgroundColor: COLOR_GRADE_SWATCHES[c] }}
              />
              <span className="truncate">{c}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GenreMoodSection;
