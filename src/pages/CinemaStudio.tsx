import React from 'react';
import { Film, Camera, Sparkles, Coins, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import AppLayout from '@/components/layout/AppLayout';
import NoCreditsModal from '@/components/upscaler/NoCreditsModal';
import ActiveJobBlockModal from '@/components/ai-tools/ActiveJobBlockModal';
import { DownloadProgressOverlay } from '@/components/ai-tools';
import ControlPanel from '@/components/cinemastudio/ControlPanel';
import PreviewPanel from '@/components/cinemastudio/PreviewPanel';
import StoryboardStrip from '@/components/cinemastudio/StoryboardStrip';
import { useCinemaStudio } from '@/hooks/useCinemaStudio';

const CinemaStudio: React.FC = () => {
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = React.useState<'controls' | 'preview'>('controls');
  const studio = useCinemaStudio();

  return (
    <AppLayout fullScreen>
      <div className="flex flex-col h-full overflow-hidden">
        {/* ━━━ HEADER BAR ━━━ */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-[#0d0d1a]">
          {/* Left: Logo */}
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-bold text-white">Cinema Studio</span>
            <span className="text-[10px] text-gray-500 hidden sm:inline">Seedance 2.0</span>
          </div>

          {/* Center: Mode toggle */}
          <div className="bg-black/40 border border-white/10 rounded-lg p-0.5 flex">
            <button
              onClick={() => studio.setMode('photo')}
              className={`py-1.5 px-3 text-xs rounded-md transition-all font-medium flex items-center gap-1.5 ${
                studio.mode === 'photo' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" /> Photo
            </button>
            <button
              onClick={() => studio.setMode('video')}
              className={`py-1.5 px-3 text-xs rounded-md transition-all font-medium flex items-center gap-1.5 ${
                studio.mode === 'video' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" /> Video
            </button>
          </div>

          {/* Right: Credits + Generate */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400 bg-black/30 rounded-lg px-2.5 py-1.5">
              <Coins className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-white font-medium">
                {studio.creditsLoading ? '...' : studio.credits}
              </span>
            </div>
            {!studio.isProcessing && studio.status !== 'completed' && (
              <Button
                onClick={studio.handleGenerate}
                disabled={!studio.canGenerate}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-xs py-1.5 px-3 h-auto disabled:opacity-50"
              >
                {studio.isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    Gerar
                    <span className="ml-1.5 flex items-center gap-0.5 opacity-80">
                      <Coins className="w-3 h-3" /> {studio.estimatedCredits}
                    </span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* ━━━ MOBILE TABS ━━━ */}
        {isMobile && (
          <div className="flex border-b border-white/5 bg-[#0d0d1a]">
            <button
              onClick={() => setMobileTab('controls')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                mobileTab === 'controls' ? 'text-white border-b-2 border-purple-500' : 'text-gray-500'
              }`}
            >
              ⚙️ Controles
            </button>
            <button
              onClick={() => setMobileTab('preview')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                mobileTab === 'preview' ? 'text-white border-b-2 border-purple-500' : 'text-gray-500'
              }`}
            >
              🎬 Preview
            </button>
          </div>
        )}

        {/* ━━━ MAIN WORKSPACE ━━━ */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* LEFT COLUMN — Controls */}
          <div className={`${
            isMobile
              ? mobileTab === 'controls' ? 'flex flex-col w-full' : 'hidden'
              : 'w-[40%] min-w-[320px] max-w-[420px] flex flex-col border-r border-white/5'
          }`}>
            <div
              className="flex-1 overflow-y-auto px-4 py-3"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
            >
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
              />
            </div>
          </div>

          {/* RIGHT COLUMN — Preview + Storyboard */}
          <div className={`${
            isMobile
              ? mobileTab === 'preview' ? 'flex flex-col w-full' : 'hidden'
              : 'flex-1 flex flex-col'
          }`}>
            {/* Preview */}
            <div className="flex-1 min-h-0 bg-[#0a0a15]">
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

            {/* Storyboard Strip */}
            <StoryboardStrip
              scenes={studio.storyboard}
              activeSceneId={studio.activeSceneId}
              onLoad={studio.loadScene}
              onRemove={studio.removeFromStoryboard}
              onAddNew={studio.addNewScene}
            />
          </div>
        </div>

        {/* ━━━ MODALS ━━━ */}
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

        {studio.isDownloading && (
          <DownloadProgressOverlay
            progress={studio.downloadProgress}
            onCancel={studio.cancelDownload}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default CinemaStudio;
