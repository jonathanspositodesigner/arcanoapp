import React from 'react';
import { Zap } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  SPEED_RAMPS, ASPECT_RATIOS, QUALITIES, DURATIONS,
  type CinemaSettings,
} from '@/utils/cinemaPromptBuilder';

interface Props {
  settings: CinemaSettings;
  updateSettings: (p: Partial<CinemaSettings>) => void;
  mode?: 'video' | 'photo';
}

const SegmentedControl: React.FC<{
  label: string;
  options: (string | number)[];
  value: string | number;
  onChange: (v: any) => void;
  suffix?: string;
}> = ({ label, options, value, onChange, suffix = '' }) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] text-gray-400 uppercase tracking-wider w-16 flex-shrink-0">{label}</span>
    <div className="flex-1 flex bg-white/[0.02] rounded-md p-0.5 gap-0.5">
      {options.map(o => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`flex-1 py-1 text-[10px] rounded transition-all ${
            String(value) === String(o)
              ? 'bg-white/[0.08] text-gray-200 font-medium'
              : 'text-gray-400 hover:text-gray-400'
          }`}
        >
          {o}{suffix}
        </button>
      ))}
    </div>
  </div>
);

const VideoSettingsSection: React.FC<Props> = ({ settings, updateSettings, mode = 'video' }) => {
  const isPhoto = mode === 'photo';

  return (
    <div className="space-y-2.5">
      {!isPhoto && (
        <SegmentedControl
          label="Duração"
          options={DURATIONS}
          value={settings.duration}
          onChange={v => updateSettings({ duration: v })}
          suffix="s"
        />
      )}

      {!isPhoto && (
        <SegmentedControl
          label="Qualidade"
          options={QUALITIES}
          value={settings.quality}
          onChange={v => updateSettings({ quality: v })}
        />
      )}

      <SegmentedControl
        label="Proporção"
        options={ASPECT_RATIOS}
        value={settings.aspectRatio}
        onChange={v => updateSettings({ aspectRatio: v })}
      />

      {!isPhoto && (
        <>
          {/* Motor */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider w-16 flex-shrink-0">Motor</span>
            <div className="flex-1 flex bg-white/[0.02] rounded-md p-0.5 gap-0.5">
              <button
                onClick={() => updateSettings({ modelSpeed: 'fast' })}
                className={`flex-1 py-1 text-[10px] rounded transition-all flex items-center justify-center gap-0.5 ${
                  settings.modelSpeed === 'fast' ? 'bg-white/[0.08] text-gray-200 font-medium' : 'text-gray-400 hover:text-gray-400'
                }`}
              >
                Fast <Zap className="w-2.5 h-2.5" />
              </button>
              <button
                onClick={() => updateSettings({ modelSpeed: 'standard' })}
                className={`flex-1 py-1 text-[10px] rounded transition-all ${
                  settings.modelSpeed === 'standard' ? 'bg-white/[0.08] text-gray-200 font-medium' : 'text-gray-400 hover:text-gray-400'
                }`}
              >
                Standard
              </button>
            </div>
          </div>

          {/* Rampa de velocidade */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider w-16 flex-shrink-0">Rampa</span>
            <Select value={settings.speedRamp} onValueChange={v => updateSettings({ speedRamp: v })}>
              <SelectTrigger className="flex-1 bg-black/20 border-white/[0.06] text-gray-300 text-[11px] h-7">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#141420] border-white/[0.06]">
                {SPEED_RAMPS.map(s => (
                  <SelectItem key={s} value={s} className="text-gray-300 text-[11px]">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Áudio */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider w-16 flex-shrink-0">Áudio</span>
            <div className="flex-1 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Switch
                  checked={settings.generateAudio}
                  onCheckedChange={v => updateSettings({ generateAudio: v })}
                  className="data-[state=checked]:bg-white/20 data-[state=unchecked]:bg-white/[0.06] scale-75 origin-left [&>span]:bg-white"
                />
                {settings.generateAudio && (
                  <span className="text-[9px] text-green-500/70 font-medium">grátis</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default VideoSettingsSection;
