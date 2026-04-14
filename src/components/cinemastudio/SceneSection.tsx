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
        onChange={e => updateSettings({ scenePrompt: e.target.value.slice(0, 2000) })}
        placeholder="Descreva sua cena completa: personagem, ambiente, ação, emoção..."
        rows={4}
        className="bg-black/20 border-white/[0.06] text-muted-foreground text-[12px] min-h-[80px] resize-none placeholder:text-muted-foreground focus:min-h-[120px] transition-all duration-200"
      />
      <div className="flex justify-end">
        <span className="text-[10px] text-muted-foreground">{settings.scenePrompt.length}/2000</span>
      </div>
    </div>
  );
};

export default SceneSection;
