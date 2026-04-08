import React from 'react';
import { ArrowLeft, Camera, Film, Coins, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsTabletViewport } from '@/hooks/useIsTabletViewport';
import AppLayout from '@/components/layout/AppLayout';
import NoCreditsModal from '@/components/upscaler/NoCreditsModal';
import ActiveJobBlockModal from '@/components/ai-tools/ActiveJobBlockModal';
import { DownloadProgressOverlay } from '@/components/ai-tools';
import ControlPanel from '@/components/cinemastudio/ControlPanel';
import PreviewPanel from '@/components/cinemastudio/PreviewPanel';
import StoryboardStrip from '@/components/cinemastudio/StoryboardStrip';
import { useCinemaStudio } from '@/hooks/useCinemaStudio';
import { useNavigate } from 'react-router-dom';

const CinemaStudio: React.FC = () => {
  const isMobile = useIsMobile();
  const isTabletViewport = useIsTabletViewport();
  const isCompactLayout = isTabletViewport;
  const [mobileTab, setMobileTab] = React.useState<'controls' | 'preview'>('preview');
  const studio = useCinemaStudio();
  const navigate = useNavigate();

  return (
    <AppLayout fullScreen>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#08080f]">
        <div className="h-12 flex-shrink-0 flex items-center justify-between px-3 bg-[#0c0c16]" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-md hover:bg-white/5 transition-colors flex-shrink-0">
              <ArrowLeft className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.15em] truncate">Cinema Studio</span>
          </div>

          <div className="bg-white/[0.04] rounded-md p-0.5 flex flex-shrink-0">
            <button
              onClick={() => studio.setMode('photo')}
              className={`px-2.5 sm:px-3 py-1 text-[11px] rounded font-medium flex items-center gap-1.5 transition-all ${
                studio.mode === 'photo' ? 'bg-white/[0.08] text-gray-200' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Camera className="w-3 h-3" /> Foto
            </button>
            <button
              onClick={() => studio.setMode('video')}
              className={`px-2.5 sm:px-3 py-1 text-[11px] rounded font-medium flex items-center gap-1.5 transition-all ${
                studio.mode === 'video' ? 'bg-white/[0.08] text-gray-200' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Film className="w-3 h-3" /> Vídeo
            </button>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden md:flex items-center gap-1 text-[11px] text-gray-500 px-2 py-1">
              <Coins className="w-3 h-3 text-yellow-500/60" />
              <span className="text-gray-400 font-medium">{studio.creditsLoading ? '...' : studio.credits}</span>
            </div>
            {!studio.isProcessing && studio.status !== 'completed' && (
              <Button
                onClick={studio.handleGenerate}
                disabled={!studio.canGenerate}
                size="sm"
                className="h-7 px-2.5 sm:px-3 text-[11px] bg-white/[0.08] hover:bg-white/[0.14] text-gray-200 border-0 disabled:opacity-30 disabled:text-gray-600"
              >
                {studio.isSubmitting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Gerar</span>
                    <span className="ml-1.5 text-gray-500 flex items-center gap-0.5">
                      <Coins className="w-2.5 h-2.5" />{studio.estimatedCredits}
                    </span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {isCompactLayout && (
          <div className="flex flex-shrink-0 border-b border-white/[0.04] bg-[#0c0c16]">
            <button
              onClick={() => setMobileTab('controls')}
              className={`flex-1 py-2 text-[11px] font-medium transition-colors ${
                mobileTab === 'controls' ? 'text-gray-200 border-b border-gray-400' : 'text-gray-600'
              }`}
            >
              Controles
            </button>
            <button
              onClick={() => setMobileTab('preview')}
              className={`flex-1 py-2 text-[11px] font-medium transition-colors ${
                mobileTab === 'preview' ? 'text-gray-200 border-b border-gray-400' : 'text-gray-600'
              }`}
            >
              Pré-visualização
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-hidden">
          <div className={`grid h-full min-h-0 overflow-hidden ${
            isCompactLayout ? 'grid-cols-1' : 'grid-cols-[280px_minmax(0,1fr)]'
          }`}>
            <div className={`${
              isCompactLayout
                ? mobileTab === 'controls' ? 'flex min-h-0 flex-col' : 'hidden'
                : 'flex min-h-0 flex-col border-r border-white/[0.04] bg-[#0c0c16]'
            } bg-[#0c0c16]`}>
              <div className="flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: 'none' }}>
                <ControlPanel
                  mode={studio.mode}
                  settings={studio.settings}
                  updateSettings={studio.updateSettings}
                  assembledPrompt={studio.assembledPrompt}
                  showPrompt={studio.showPrompt}
                  setShowPrompt={studio.setShowPrompt}
                  referenceImages={studio.referenceImages}
                  referenceImagePreviews={studio.referenceImagePreviews}
                  addReferenceImages={studio.addReferenceImages}
                  removeReferenceImage={studio.removeReferenceImage}
                  onCharactersChange={studio.setSelectedCharacters}
                  onScenarioChange={studio.setSelectedScenario}
                  selectedCharacters={studio.selectedCharacters}
                  selectedScenario={studio.selectedScenario}
                  maxReferences={studio.maxRefImages}
                />
              </div>
            </div>

            <div className={`${
              isCompactLayout
                ? mobileTab === 'preview' ? 'flex min-h-0 flex-col' : 'hidden'
                : 'flex min-h-0 flex-col'
            } min-w-0 overflow-hidden bg-[#08080f]`}>
              <div className="flex-1 min-h-0 overflow-hidden">
                <PreviewPanel
                  mode={studio.mode}
                  setMode={studio.setMode}
                  status={studio.status}
                  progress={studio.progress}
                  outputUrl={studio.outputUrl}
                  errorMessage={studio.errorMessage}
                  elapsedTime={studio.elapsedTime}
                  isProcessing={studio.isProcessing}
                  estimatedCredits={studio.estimatedCredits}
                  formatTime={studio.formatTime}
                  downloadResult={studio.downloadResult}
                  resetTool={studio.resetTool}
                  cancelGeneration={studio.cancelGeneration}
                  addToStoryboard={studio.addToStoryboard}
                  referenceImagePreviews={studio.referenceImagePreviews}
                />
              </div>

              <StoryboardStrip
                scenes={studio.storyboard}
                activeSceneId={studio.activeSceneId}
                onLoad={studio.loadScene}
                onRemove={studio.removeFromStoryboard}
                onAddNew={studio.addNewScene}
                onAnimateAll={studio.animateAllScenes}
              />
            </div>
          </div>
        </div>

        <NoCreditsModal
          isOpen={studio.showNoCreditsModal}
          onClose={() => studio.setShowNoCreditsModal(false)}
          reason={studio.noCreditsReason}
        />
        <ActiveJobBlockModal
          isOpen={studio.showActiveJobModal}
          onClose={() => studio.setShowActiveJobModal(false)}
          activeTool={studio.activeToolName}
          activeJobId={studio.activeJobIdState}
          activeStatus={studio.activeStatusState}
        />
        <DownloadProgressOverlay
          isVisible={studio.isDownloading}
          progress={studio.downloadProgress}
          onCancel={studio.cancelDownload}
        />
      </div>
    </AppLayout>
  );
};

export default CinemaStudio;
