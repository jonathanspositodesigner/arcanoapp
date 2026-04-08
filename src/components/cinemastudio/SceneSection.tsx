import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import type { CinemaSettings } from '@/utils/cinemaPromptBuilder';

interface Props {
  settings: CinemaSettings;
  updateSettings: (p: Partial<CinemaSettings>) => void;
}

const SceneSection: React.FC<Props> = ({ settings, updateSettings }) => {
  return (
    <div className="space-y-2 pb-1">
      <Textarea
        value={settings.scenePrompt}
        onChange={e => updateSettings({ scenePrompt: e.target.value.slice(0, 500) })}
        placeholder="Descreva a cena..."
        rows={3}
        className="bg-black/20 border-white/[0.06] text-gray-300 text-[12px] min-h-[60px] resize-none placeholder:text-gray-600 focus:min-h-[100px] transition-all duration-200"
      />
      <Textarea
        value={settings.subject}
        onChange={e => updateSettings({ subject: e.target.value })}
        placeholder="Sujeito / personagem..."
        rows={2}
        className="bg-black/20 border-white/[0.06] text-gray-300 text-[12px] min-h-[40px] resize-none placeholder:text-gray-600"
      />
    </div>
  );
};

export default SceneSection;
