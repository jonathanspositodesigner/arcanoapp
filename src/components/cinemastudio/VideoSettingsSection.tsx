import React from 'react';
import { Zap } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  SPEED_RAMPS, ASPECT_RATIOS, QUALITIES, DURATIONS,
  type CinemaSettings,
} from '@/utils/cinemaPromptBuilder';

interface Props {
  settings: CinemaSettings;
  updateSettings: (p: Partial<CinemaSettings>) => void;
}

const VideoSettingsSection: React.FC<Props> = ({ settings, updateSettings }) => {
  return (
    <div className="space-y-3">
      {/* Speed Ramp */}
      <div>
        <label className="text-xs font-medium text-white mb-1.5 block">Speed Ramp</label>
        <div className="grid grid-cols-4 gap-1.5">
          {SPEED_RAMPS.map(s => (
            <button
              key={s}
              onClick={() => updateSettings({ speedRamp: s })}
              className={`py-1.5 px-1 text-[10px] rounded-lg transition-all ${
                settings.speedRamp === s
                  ? 'bg-blue-500/20 border border-blue-500/40 text-white font-medium'
                  : 'bg-black/30 border border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-white">Duração</label>
          <span className="text-xs text-purple-300 font-medium">{settings.duration}s</span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {DURATIONS.map(d => (
            <button
              key={d}
              onClick={() => updateSettings({ duration: d })}
              className={`py-1.5 text-[10px] rounded-md transition-all ${
                settings.duration === d
                  ? 'bg-purple-500/30 text-white font-medium'
                  : 'bg-black/30 text-gray-400 hover:text-white'
              }`}
            >
              {d}s
            </button>
          ))}
        </div>
      </div>

      {/* Quality + Aspect Ratio */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-white mb-1.5 block">Qualidade</label>
          <div className="grid grid-cols-2 gap-0 bg-black/40 border border-white/10 rounded-lg p-1">
            {QUALITIES.map(q => (
              <button
                key={q}
                onClick={() => updateSettings({ quality: q })}
                className={`py-1.5 text-[10px] rounded-md transition-all ${
                  settings.quality === q ? 'bg-white/10 text-white font-medium' : 'text-gray-400 hover:text-white'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium text-white mb-1.5 block">Aspect Ratio</label>
          <div className="grid grid-cols-3 gap-1">
            {ASPECT_RATIOS.map(a => (
              <button
                key={a}
                onClick={() => updateSettings({ aspectRatio: a })}
                className={`py-1.5 text-[10px] rounded-md transition-all ${
                  settings.aspectRatio === a ? 'bg-purple-500/30 text-white font-medium' : 'bg-black/30 text-gray-400 hover:text-white'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audio Toggle */}
      <div className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white">Gerar Áudio</span>
          <span className="text-[10px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded-full">Free</span>
        </div>
        <Switch
          checked={settings.generateAudio}
          onCheckedChange={v => updateSettings({ generateAudio: v })}
          className="data-[state=checked]:bg-white/30 data-[state=unchecked]:bg-white/10 [&>span]:bg-white"
        />
      </div>

      {/* Model Speed */}
      <div>
        <label className="text-xs font-medium text-white mb-1.5 block">Velocidade do Modelo</label>
        <div className="grid grid-cols-2 gap-0 bg-black/40 border border-white/10 rounded-lg p-1">
          <button
            onClick={() => updateSettings({ modelSpeed: 'standard' })}
            className={`py-2 text-xs rounded-md transition-all font-medium ${
              settings.modelSpeed === 'standard' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Standard
          </button>
          <button
            onClick={() => updateSettings({ modelSpeed: 'fast' })}
            className={`py-2 text-xs rounded-md transition-all font-medium flex items-center justify-center gap-1 ${
              settings.modelSpeed === 'fast' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Fast <Zap className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoSettingsSection;
