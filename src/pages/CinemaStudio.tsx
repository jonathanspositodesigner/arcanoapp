import React from 'react';
import { ArrowLeft, Camera, Film, Coins, Sparkles, Loader2 } from 'lucide-react';
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
import { useNavigate } from 'react-router-dom';

const CinemaStudio: React.FC = () => {
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = React.useState<'controls' | 'preview'>('preview');
  const studio = useCinemaStudio();
  const navigate = useNavigate();

  return (
    <AppLayout fullScreen>
      <div className="flex flex-col h-[100dvh] overflow-hidden bg-[#08080f]">
        {/* ━━━ TOP BAR — 48px ━━━ */}
        <div className="h-12 flex-shrink-0 flex items-center justify-between px-3 bg-[#0c0c16]" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
          {/* Left */}
          <div className="flex items-center gap-2.5">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-md hover:bg-white/5 transition-colors">
              <ArrowLeft className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.15em]">Cinema Studio</span>
          </div>

          {/* Center — Mode toggle */}
          <div className="bg-white/[0.04] rounded-md p-0.5 flex">
            <button
              onClick={() => studio.setMode('photo')}
              className={`px-3 py-1 text-[11px] rounded font-medium flex items-center gap-1.5 transition-all ${
                studio.mode === 'photo' ? 'bg-white/[0.08] text-gray-200' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Camera className="w-3 h-3" /> Photo
            </button>
            <button
              onClick={() => studio.setMode('video')}
              className={`px-3 py-1 text-[11px] rounded font-medium flex items-center gap-1.5 transition-all ${
                studio.mode === 'video' ? 'bg-white/[0.08] text-gray-200' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Film className="w-3 h-3" /> Video
            </button>
          </div>

          {/* Right — Credits + Generate */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-gray-500 px-2 py-1">
              <Coins className="w-3 h-3 text-yellow-500/60" />
              <span className="text-gray-400 font-medium">{studio.creditsLoading ? '...' : studio.credits}</span>
            </div>
            {!studio.isProcessing && studio.status !== 'completed' && (
              <Button
                onClick={studio.handleGenerate}
                disabled={!studio.canGenerate}
                size="sm"
                className="h-7 px-3 text-[11px] bg-white/[0.08] hover:bg-white/[0.14] text-gray-200 border-0 disabled:opacity-30 disabled:text-gray-600"
              >
                {studio.isSubmitting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 mr-1" />
                    Generate
                    <span className="ml-1.5 text-gray-500 flex items-center gap-0.5">
                      <Coins className="w-2.5 h-2.5" />{studio.estimatedCredits}
                    </span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* ━━━ MOBILE TABS ━━━ */}
        {isMobile && (
          <div className="flex border-b border-white/[0.04] bg-[#0c0c16]">
            <button
              onClick={() => setMobileTab('controls')}
              className={`flex-1 py-2 text-[11px] font-medium transition-colors ${
                mobileTab === 'controls' ? 'text-gray-200 border-b border-gray-400' : 'text-gray-600'
              }`}
            >
              Controls
            </button>
            <button
              onClick={() => setMobileTab('preview')}
              className={`flex-1 py-2 text-[11px] font-medium transition-colors ${
                mobileTab === 'preview' ? 'text-gray-200 border-b border-gray-400' : 'text-gray-600'
              }`}
            >
              Preview
            </button>
          </div>
        )}

        {/* ━━━ MAIN WORKSPACE ━━━ */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* LEFT PANEL — 280px */}
          <div className={`${
            isMobile
              ? mobileTab === 'controls' ? 'flex flex-col w-full' : 'hidden'
              : 'w-[280px] flex-shrink-0 flex flex-col border-r border-white/[0.04]'
          } bg-[#0c0c16]`}>
            <div
              className="flex-1 overflow-y-auto px-3 py-3"
              style={{ scrollbarWidth: 'none' }}
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

          {/* CENTER PREVIEW + BOTTOM STORYBOARD */}
          <div className={`${
            isMobile
              ? mobileTab === 'preview' ? 'flex flex-col w-full' : 'hidden'
              : 'flex-1 flex flex-col min-w-0'
          }`}>
            {/* Preview */}
            <div className="flex-1 min-h-0 bg-[#08080f]">
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

            {/* Storyboard — 80px */}
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
