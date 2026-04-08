import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { TIMES_OF_DAY, WEATHERS, TIME_ICONS, WEATHER_ICONS, type CinemaSettings } from '@/utils/cinemaPromptBuilder';

interface Props {
  settings: CinemaSettings;
  updateSettings: (p: Partial<CinemaSettings>) => void;
}

const SceneSection: React.FC<Props> = ({ settings, updateSettings }) => {
  return (
    <div className="space-y-3">
      {/* Scene Name */}
      <div>
        <label className="text-xs font-medium text-white mb-1 block">Nome da Cena</label>
        <Input
          value={settings.sceneName}
          onChange={e => updateSettings({ sceneName: e.target.value })}
          placeholder="Cena 1 - Plano de Abertura"
          className="bg-black/40 border-white/10 text-white text-sm h-8 placeholder:text-gray-500"
        />
      </div>

      {/* Scene Prompt */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-white">Intenção do Diretor</label>
          <span className={`text-[10px] ${settings.scenePrompt.length > 450 ? 'text-amber-400' : 'text-gray-500'}`}>
            {settings.scenePrompt.length}/500
          </span>
        </div>
        <Textarea
          value={settings.scenePrompt}
          onChange={e => updateSettings({ scenePrompt: e.target.value.slice(0, 500) })}
          placeholder="Descreva o que acontece nesta cena..."
          className="bg-black/40 border-white/10 text-white text-sm min-h-[60px] resize-none placeholder:text-gray-500"
        />
      </div>

      {/* Subject */}
      <div>
        <label className="text-xs font-medium text-white mb-1 block">Sujeito / Personagem</label>
        <Textarea
          value={settings.subject}
          onChange={e => updateSettings({ subject: e.target.value })}
          placeholder="Quem ou o que é o sujeito principal?"
          className="bg-black/40 border-white/10 text-white text-sm min-h-[44px] resize-none placeholder:text-gray-500"
          rows={2}
        />
      </div>

      {/* Environment */}
      <div>
        <label className="text-xs font-medium text-white mb-1 block">Ambiente / Locação</label>
        <Textarea
          value={settings.environment}
          onChange={e => updateSettings({ environment: e.target.value })}
          placeholder="Onde esta cena se passa?"
          className="bg-black/40 border-white/10 text-white text-sm min-h-[44px] resize-none placeholder:text-gray-500"
          rows={2}
        />
      </div>

      {/* Time of Day */}
      <div>
        <label className="text-xs font-medium text-white mb-1.5 block">Hora do Dia</label>
        <div className="grid grid-cols-4 gap-1.5">
          {TIMES_OF_DAY.map(t => (
            <button
              key={t}
              onClick={() => updateSettings({ timeOfDay: t })}
              className={`py-1.5 px-1 text-[10px] rounded-lg transition-all flex flex-col items-center gap-0.5 ${
                settings.timeOfDay === t
                  ? 'bg-purple-500/20 border border-purple-500/40 text-white'
                  : 'bg-black/30 border border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-sm">{TIME_ICONS[t]}</span>
              <span>{t}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Weather */}
      <div>
        <label className="text-xs font-medium text-white mb-1.5 block">Clima / Atmosfera</label>
        <div className="grid grid-cols-4 gap-1.5">
          {WEATHERS.map(w => (
            <button
              key={w}
              onClick={() => updateSettings({ weather: w })}
              className={`py-1.5 px-1 text-[10px] rounded-lg transition-all flex flex-col items-center gap-0.5 ${
                settings.weather === w
                  ? 'bg-purple-500/20 border border-purple-500/40 text-white'
                  : 'bg-black/30 border border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-sm">{WEATHER_ICONS[w]}</span>
              <span>{w}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SceneSection;
