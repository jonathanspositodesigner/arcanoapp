import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CAMERA_BODIES, LENS_TYPES, FOCAL_PRESETS, APERTURES,
  FOCAL_LENGTH_DESCRIPTIONS, APERTURE_DESCRIPTIONS,
  type CinemaSettings,
} from '@/utils/cinemaPromptBuilder';

interface Props {
  settings: CinemaSettings;
  updateSettings: (p: Partial<CinemaSettings>) => void;
}

const CameraRigSection: React.FC<Props> = ({ settings, updateSettings }) => {
  const focalDesc = FOCAL_LENGTH_DESCRIPTIONS[settings.focalLength] || '';
  const apertureDesc = APERTURE_DESCRIPTIONS[settings.aperture] || '';

  return (
    <div className="space-y-3">
      {/* Camera Body */}
      <div>
        <label className="text-xs font-medium text-white mb-1.5 block">Câmera</label>
        <Select value={settings.cameraBody} onValueChange={v => updateSettings({ cameraBody: v })}>
          <SelectTrigger className="bg-black/40 border-white/10 text-white text-xs h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a2e] border-white/10">
            {CAMERA_BODIES.map(c => (
              <SelectItem key={c.value} value={c.value} className="text-white text-xs">
                <span className="font-medium">{c.value}</span>
                <span className="text-gray-400 ml-1.5">— {c.desc}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lens Type */}
      <div>
        <label className="text-xs font-medium text-white mb-1.5 block">Tipo de Lente</label>
        <div className="grid grid-cols-4 gap-1.5">
          {LENS_TYPES.map(l => (
            <button
              key={l}
              onClick={() => updateSettings({ lensType: l })}
              className={`py-1.5 px-2 text-[10px] rounded-lg transition-all font-medium ${
                settings.lensType === l
                  ? 'bg-blue-500/20 border border-blue-500/40 text-white'
                  : 'bg-black/30 border border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Focal Length */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-white">Distância Focal</label>
          <span className="text-xs text-purple-300 font-medium">{settings.focalLength}mm</span>
        </div>
        <div className="flex gap-1.5 mb-2">
          {FOCAL_PRESETS.map(f => (
            <button
              key={f}
              onClick={() => updateSettings({ focalLength: f })}
              className={`flex-1 py-1 text-[10px] rounded-md transition-all ${
                settings.focalLength === f
                  ? 'bg-purple-500/30 text-white font-medium'
                  : 'bg-black/30 text-gray-400 hover:text-white'
              }`}
            >
              {f}mm
            </button>
          ))}
        </div>
        {focalDesc && (
          <p className="text-[10px] text-gray-500 italic">{focalDesc}</p>
        )}
      </div>

      {/* Aperture */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-white">Abertura</label>
          <span className="text-xs text-purple-300 font-medium">{settings.aperture}</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {APERTURES.map(a => (
            <button
              key={a}
              onClick={() => updateSettings({ aperture: a })}
              className={`py-1 px-2 text-[10px] rounded-md transition-all ${
                settings.aperture === a
                  ? 'bg-purple-500/30 text-white font-medium'
                  : 'bg-black/30 text-gray-400 hover:text-white'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        {apertureDesc && (
          <p className="text-[10px] text-gray-500 italic mt-1">{apertureDesc}</p>
        )}
      </div>
    </div>
  );
};

export default CameraRigSection;
