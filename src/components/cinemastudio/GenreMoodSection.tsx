import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  GENRES, MOODS, COLOR_GRADES,
  type CinemaSettings,
} from '@/utils/cinemaPromptBuilder';

interface Props {
  settings: CinemaSettings;
  updateSettings: (p: Partial<CinemaSettings>) => void;
}

const GenreMoodSection: React.FC<Props> = ({ settings, updateSettings }) => {
  return (
    <div className="space-y-2.5">
      {/* Gênero */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider w-14 flex-shrink-0">Gênero</span>
        <Select value={settings.genre} onValueChange={v => updateSettings({ genre: v })}>
          <SelectTrigger className="flex-1 bg-black/20 border-border text-muted-foreground text-[11px] h-7">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background border-border">
            {GENRES.map(g => (
              <SelectItem key={g} value={g} className="text-muted-foreground text-[11px]">{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tom */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider w-14 flex-shrink-0">Tom</span>
        <Select value={settings.mood || 'none'} onValueChange={v => updateSettings({ mood: v === 'none' ? '' : v })}>
          <SelectTrigger className="flex-1 bg-black/20 border-border text-muted-foreground text-[11px] h-7">
            <SelectValue placeholder="Nenhum" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border">
            <SelectItem value="none" className="text-muted-foreground text-[11px]">Nenhum</SelectItem>
            {MOODS.map(m => (
              <SelectItem key={m} value={m} className="text-muted-foreground text-[11px]">{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Colorização */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider w-14 flex-shrink-0">Cor</span>
        <Select value={settings.colorGrade} onValueChange={v => updateSettings({ colorGrade: v })}>
          <SelectTrigger className="flex-1 bg-black/20 border-border text-muted-foreground text-[11px] h-7">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background border-border">
            {COLOR_GRADES.map(c => (
              <SelectItem key={c} value={c} className="text-muted-foreground text-[11px]">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default GenreMoodSection;
