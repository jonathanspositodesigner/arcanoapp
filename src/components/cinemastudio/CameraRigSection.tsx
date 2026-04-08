import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CAMERA_BODIES, LENS_TYPES, FOCAL_PRESETS, APERTURES,
  type CinemaSettings,
} from '@/utils/cinemaPromptBuilder';

interface Props {
  settings: CinemaSettings;
  updateSettings: (p: Partial<CinemaSettings>) => void;
}

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
      {/* Body */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-600 uppercase tracking-wider w-14 flex-shrink-0">Body</span>
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

      {/* Lens */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-600 uppercase tracking-wider w-14 flex-shrink-0">Lens</span>
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

      {/* Aperture */}
      <SegmentedControl
        label="Aperture"
        options={APERTURES}
        value={settings.aperture}
        onChange={v => updateSettings({ aperture: v })}
      />
    </div>
  );
};

export default CameraRigSection;
