import React, { useState } from 'react';
import { ChevronDown, Eye, EyeOff, Copy } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import SceneSection from './SceneSection';
import CameraRigSection from './CameraRigSection';
import CameraMovementSection from './CameraMovementSection';
import GenreMoodSection from './GenreMoodSection';
import GenreMoodPhotoSection from './GenreMoodPhotoSection';
import VideoSettingsSection from './VideoSettingsSection';
import ReferenceSection from './ReferenceSection';
import SavedConfigsSection from './SavedConfigsSection';
import CharacterScenarioSection from './CharacterScenarioSection';
import type { CinemaSettings } from '@/utils/cinemaPromptBuilder';
import type { StudioMode, SelectedAsset } from '@/hooks/useCinemaStudio';

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
  onCharactersChange?: (items: SelectedAsset[]) => void;
  onScenarioChange?: (item: SelectedAsset | null) => void;
  selectedCharacters: SelectedAsset[];
  selectedScenario: SelectedAsset | null;
  maxReferences?: number;
}

interface SectionProps {
  title: string;
  emoji: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, emoji, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-2 group"
      >
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-[0.12em] flex items-center gap-1.5">
          <span className="text-xs">{emoji}</span> {title}
        </span>
        <ChevronDown className={`w-3 h-3 text-gray-600 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
      </button>
      <div className={`transition-all duration-200 ${open ? 'max-h-[4000px] opacity-100 pb-2' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        {children}
      </div>
    </div>
  );
};

const ControlPanel: React.FC<Props> = ({
  mode, settings, updateSettings, assembledPrompt, showPrompt, setShowPrompt,
  referenceImages, referenceImagePreviews, addReferenceImages, removeReferenceImage,
  onCharactersChange, onScenarioChange, selectedCharacters, selectedScenario, maxReferences = 9,
}) => {
  const copyPrompt = () => {
    navigator.clipboard.writeText(assembledPrompt);
    toast.success('Prompt copiado!');
  };

  const handleLoadConfig = (data: { settings: Partial<CinemaSettings>; characters?: SelectedAsset[]; scenario?: SelectedAsset | null }) => {
    updateSettings(data.settings);
    if (data.characters && onCharactersChange) onCharactersChange(data.characters);
    if (data.scenario !== undefined && onScenarioChange) onScenarioChange(data.scenario ?? null);
  };

  const isPhoto = mode === 'photo';

  return (
    <div className="space-y-0">
      {/* ===== PHOTO MODE LAYOUT ===== */}
      {isPhoto ? (
        <>
          {/* 1. Referências — sempre aberta, sem toggle */}
          <div className="pb-2">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-[0.12em] flex items-center gap-1.5 py-2">
              <span className="text-xs">🖼</span> Referências
            </span>
            <ReferenceSection
              images={referenceImages}
              previews={referenceImagePreviews}
              onAdd={addReferenceImages}
              onRemove={removeReferenceImage}
              maxImages={maxReferences}
            />
          </div>

          <div className="border-t border-white/[0.04] my-1" />

          {/* 2. Textarea única */}
          <div className="space-y-2 pb-1">
            <Textarea
              value={settings.scenePrompt}
              onChange={e => updateSettings({ scenePrompt: e.target.value.slice(0, 500) })}
              placeholder="Descreva sua cena, personagem e ambiente..."
              rows={3}
              className="bg-black/20 border-white/[0.06] text-gray-300 text-[12px] min-h-[60px] resize-none placeholder:text-gray-600 focus:min-h-[100px] transition-all duration-200"
            />
          </div>

          <div className="border-t border-white/[0.04] my-1" />

          {/* Personagem e Cenário */}
          <Section title="Personagem e Cenário" emoji="👤" defaultOpen={false}>
            <CharacterScenarioSection settings={settings} updateSettings={updateSettings} onCharactersChange={onCharactersChange} onScenarioChange={onScenarioChange} />
          </Section>

          <div className="border-t border-white/[0.04]" />

          {/* 3. Câmera */}
          <Section title="Câmera" emoji="🎥" defaultOpen={false}>
            <CameraRigSection settings={settings} updateSettings={updateSettings} />
          </Section>

          <div className="border-t border-white/[0.04]" />

          {/* 4. Estilo — com thumbnails visuais */}
          <Section title="Estilo" emoji="🎨" defaultOpen={false}>
            <GenreMoodPhotoSection settings={settings} updateSettings={updateSettings} />
          </Section>

          <div className="border-t border-white/[0.04]" />

          {/* 5. Saída */}
          <Section title="Saída" emoji="⚙️" defaultOpen={false}>
            <VideoSettingsSection settings={settings} updateSettings={updateSettings} mode="photo" />
          </Section>
          <div className="border-t border-white/[0.04] my-1" />
          <SavedConfigsSection mode="photo" settings={settings} onLoad={updateSettings} />
        </>
      ) : (
        /* ===== VIDEO MODE LAYOUT (intocado) ===== */
        <>
          <SceneSection settings={settings} updateSettings={updateSettings} />

          <div className="border-t border-white/[0.04] my-1" />

          <Section title="Personagem e Cenário" emoji="👤" defaultOpen={false}>
            <CharacterScenarioSection settings={settings} updateSettings={updateSettings} onCharactersChange={onCharactersChange} onScenarioChange={onScenarioChange} />
          </Section>

          <div className="border-t border-white/[0.04]" />

          <Section title="Câmera" emoji="🎥" defaultOpen={false}>
            <CameraRigSection settings={settings} updateSettings={updateSettings} />
          </Section>

          <div className="border-t border-white/[0.04]" />

          <Section title="Movimento" emoji="🎬" defaultOpen={true}>
            <CameraMovementSection settings={settings} updateSettings={updateSettings} />
          </Section>

          <div className="border-t border-white/[0.04]" />

          <Section title="Estilo" emoji="🎨" defaultOpen={false}>
            <GenreMoodSection settings={settings} updateSettings={updateSettings} />
          </Section>

          <div className="border-t border-white/[0.04]" />

          <Section title="Saída" emoji="⚙️" defaultOpen={false}>
            <VideoSettingsSection settings={settings} updateSettings={updateSettings} />
          </Section>

          <div className="border-t border-white/[0.04]" />

          <Section title="Referências" emoji="🖼" defaultOpen={false}>
            <ReferenceSection
              images={referenceImages}
              previews={referenceImagePreviews}
              onAdd={addReferenceImages}
              onRemove={removeReferenceImage}
            />
          </Section>

          <div className="border-t border-white/[0.04] my-1" />
          <SavedConfigsSection mode="video" settings={settings} onLoad={updateSettings} />
        </>
      )}

      <div className="border-t border-white/[0.04]" />

      {/* Toggle do prompt montado */}
      <div className="pt-1">
        <button
          onClick={() => setShowPrompt(!showPrompt)}
          className="flex items-center gap-1.5 text-[10px] text-gray-600 hover:text-gray-400 transition-colors py-1"
        >
          {showPrompt ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {showPrompt ? 'Ocultar prompt' : 'Ver prompt montado'}
        </button>
        {showPrompt && (
          <div className="mt-1 relative">
            <Textarea
              value={assembledPrompt}
              readOnly
              className="bg-black/30 border-white/[0.06] text-gray-500 text-[10px] min-h-[60px] resize-none font-mono"
            />
            <button
              onClick={copyPrompt}
              className="absolute top-1.5 right-1.5 p-1 rounded hover:bg-white/5 transition-colors"
            >
              <Copy className="w-3 h-3 text-gray-600" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;
