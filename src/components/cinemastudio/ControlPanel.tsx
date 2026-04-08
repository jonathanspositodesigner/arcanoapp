import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Eye, EyeOff, Copy } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import SceneSection from './SceneSection';
import CameraRigSection from './CameraRigSection';
import CameraMovementSection from './CameraMovementSection';
import GenreMoodSection from './GenreMoodSection';
import VideoSettingsSection from './VideoSettingsSection';
import ReferenceSection from './ReferenceSection';
import type { CinemaSettings } from '@/utils/cinemaPromptBuilder';
import type { StudioMode } from '@/hooks/useCinemaStudio';

interface Props {
  mode: StudioMode;
  settings: CinemaSettings;
  updateSettings: (p: Partial<CinemaSettings>) => void;
  assembledPrompt: string;
  showPrompt: boolean;
  setShowPrompt: (v: boolean) => void;
  referenceImages: File[];
  referenceImagePreviews: string[];
  addReferenceImages: (files: FileList | null) => void;
  removeReferenceImage: (index: number) => void;
}

interface SectionWrapperProps {
  title: string;
  emoji: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const SectionWrapper: React.FC<SectionWrapperProps> = ({ title, emoji, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-1 hover:bg-white/5 rounded-lg transition-colors">
        <span className="text-xs font-semibold text-white flex items-center gap-1.5">
          <span>{emoji}</span> {title}
        </span>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-1 pb-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

const ControlPanel: React.FC<Props> = ({
  mode, settings, updateSettings, assembledPrompt, showPrompt, setShowPrompt,
  referenceImages, referenceImagePreviews, addReferenceImages, removeReferenceImage,
}) => {
  const copyPrompt = () => {
    navigator.clipboard.writeText(assembledPrompt);
    toast.success('Prompt copiado!');
  };

  return (
    <div className="space-y-1">
      {/* Section 1 — Scene */}
      <SectionWrapper title="Cena" emoji="🎬">
        <SceneSection settings={settings} updateSettings={updateSettings} />
      </SectionWrapper>

      <div className="border-t border-white/5" />

      {/* Section 2 — Camera Rig */}
      <SectionWrapper title="Câmera" emoji="📷">
        <CameraRigSection settings={settings} updateSettings={updateSettings} />
      </SectionWrapper>

      <div className="border-t border-white/5" />

      {/* Section 3 — Camera Movement */}
      <SectionWrapper title="Movimento" emoji="🎥">
        <CameraMovementSection settings={settings} updateSettings={updateSettings} />
      </SectionWrapper>

      <div className="border-t border-white/5" />

      {/* Section 4 — Genre & Mood */}
      <SectionWrapper title="Gênero & Humor" emoji="🎭">
        <GenreMoodSection settings={settings} updateSettings={updateSettings} />
      </SectionWrapper>

      <div className="border-t border-white/5" />

      {/* Section 5 — Video Settings (only in video mode) */}
      {mode === 'video' && (
        <>
          <SectionWrapper title="Config. de Vídeo" emoji="⚙️">
            <VideoSettingsSection settings={settings} updateSettings={updateSettings} />
          </SectionWrapper>
          <div className="border-t border-white/5" />
        </>
      )}

      {/* Section 6 — Reference Images */}
      <SectionWrapper title="Referências" emoji="🖼️">
        <ReferenceSection
          images={referenceImages}
          previews={referenceImagePreviews}
          onAdd={addReferenceImages}
          onRemove={removeReferenceImage}
        />
      </SectionWrapper>

      <div className="border-t border-white/5" />

      {/* Assembled Prompt Toggle */}
      <div>
        <button
          onClick={() => setShowPrompt(!showPrompt)}
          className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-300 transition-colors py-1"
        >
          {showPrompt ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {showPrompt ? 'Ocultar prompt montado' : 'Ver prompt montado'}
        </button>
        {showPrompt && (
          <div className="mt-1 relative">
            <Textarea
              value={assembledPrompt}
              readOnly
              className="bg-black/40 border-white/10 text-gray-300 text-[10px] min-h-[80px] resize-none font-mono"
            />
            <button
              onClick={copyPrompt}
              className="absolute top-1.5 right-1.5 p-1 bg-black/60 rounded hover:bg-white/10 transition-colors"
            >
              <Copy className="w-3 h-3 text-gray-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;
