import React, { useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Camera, Film, Coins, Sparkles, Loader2, Save } from 'lucide-react';
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
import ProjectPicker from '@/components/cinemastudio/ProjectPicker';
import { useCinemaStudio } from '@/hooks/useCinemaStudio';
import { useCinemaProjects } from '@/hooks/useCinemaProjects';
import { toast } from 'sonner';

const STORYBOARD_KEY = 'cinemastudio_storyboard';

const CinemaStudio: React.FC = () => {
  const isMobile = useIsMobile();
  const isTabletViewport = useIsTabletViewport();
  const isCompactLayout = isTabletViewport;
  const [mobileTab, setMobileTab] = React.useState<'controls' | 'preview'>('preview');
  const studio = useCinemaStudio();
  const projectManager = useCinemaProjects();
  const [view, setView] = React.useState<'picker' | 'studio'>('picker');
  const autoSaveTimeoutRef = useRef<number | null>(null);

  // Fetch projects on mount
  useEffect(() => {
    projectManager.fetchProjects();
  }, []);

  // Auto-save helper
  const triggerAutoSave = useCallback(() => {
    if (!projectManager.activeProject) return;
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = window.setTimeout(() => {
      if (projectManager.activeProject) {
        const sceneIndex = studio.storyboard.findIndex(s => s.id === studio.activeSceneId);
        projectManager.saveProject(
          projectManager.activeProject.id,
          studio.storyboard,
          sceneIndex >= 0 ? sceneIndex : 0,
        );
      }
    }, 1500);
  }, [projectManager.activeProject, studio.storyboard, studio.activeSceneId]);

  // Auto-save on storyboard changes
  const prevStoryboardRef = useRef(studio.storyboard);
  useEffect(() => {
    if (view !== 'studio' || !projectManager.activeProject) return;
    if (prevStoryboardRef.current !== studio.storyboard) {
      prevStoryboardRef.current = studio.storyboard;
      triggerAutoSave();
    }
  }, [studio.storyboard, view, projectManager.activeProject, triggerAutoSave]);

  // Auto-save on mode change
  const prevModeRef = useRef(studio.mode);
  useEffect(() => {
    if (view !== 'studio' || !projectManager.activeProject) return;
    if (prevModeRef.current !== studio.mode) {
      prevModeRef.current = studio.mode;
      triggerAutoSave();
    }
  }, [studio.mode, view, projectManager.activeProject, triggerAutoSave]);

  // Handle selecting a project from picker
  const handleSelectProject = useCallback(async (projectId: string) => {
    const project = await projectManager.loadProject(projectId);
    if (!project) return;

    // Restore storyboard from project scenes
    if (project.scenes && project.scenes.length > 0) {
      // Write to localStorage so useCinemaStudio picks it up
      localStorage.setItem(STORYBOARD_KEY, JSON.stringify(project.scenes));
      // Reload the page state — we need to force useCinemaStudio to re-read
      // Instead, we'll directly load the scene by navigating to studio
    }

    setView('studio');

    // If project has scenes, load the active scene after a tick
    if (project.scenes && project.scenes.length > 0) {
      const idx = project.activeSceneIndex || 0;
      const sceneId = project.scenes[idx]?.id;
      if (sceneId) {
        // Small delay to let the studio mount with localStorage data
        setTimeout(() => {
          studio.loadScene(sceneId);
        }, 100);
      }
    }
  }, [projectManager, studio]);

  // Handle creating a project
  const handleCreateProject = useCallback(async (name: string) => {
    const project = await projectManager.createProject(name);
    if (!project) return null;
    // Clear localStorage storyboard for fresh state
    localStorage.removeItem(STORYBOARD_KEY);
    setView('studio');
    // Reload to reset studio hook state
    window.location.reload();
    return project;
  }, [projectManager]);

  // Handle back to picker
  const handleBackToPicker = useCallback(async () => {
    if (projectManager.activeProject) {
      const sceneIndex = studio.storyboard.findIndex(s => s.id === studio.activeSceneId);
      await projectManager.saveProject(
        projectManager.activeProject.id,
        studio.storyboard,
        sceneIndex >= 0 ? sceneIndex : 0,
      );
      toast.success('Projeto salvo ✓');
    }
    projectManager.setActiveProject(null);
    setView('picker');
    projectManager.fetchProjects();
  }, [projectManager, studio]);

  // Handle manual save
  const handleManualSave = useCallback(async () => {
    if (!projectManager.activeProject) return;
    const sceneIndex = studio.storyboard.findIndex(s => s.id === studio.activeSceneId);
    await projectManager.saveProject(
      projectManager.activeProject.id,
      studio.storyboard,
      sceneIndex >= 0 ? sceneIndex : 0,
    );
    toast.success('Projeto salvo ✓');
  }, [projectManager, studio]);

  // Format last saved
  const lastSavedText = projectManager.lastSavedAt
    ? `Salvo às ${projectManager.lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : null;

  // ━━━ PICKER VIEW ━━━
  if (view === 'picker') {
    return (
      <ProjectPicker
        projects={projectManager.projects}
        isLoading={projectManager.isLoading}
        projectCount={projectManager.projectCount}
        onCreateProject={projectManager.createProject}
        onSelectProject={handleSelectProject}
        onDeleteProject={projectManager.deleteProject}
        onRenameProject={projectManager.renameProject}
      />
    );
  }

  // ━━━ STUDIO VIEW ━━━
  return (
    <AppLayout fullScreen>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#08080f]">
        <div className="h-12 flex-shrink-0 flex items-center justify-between px-3 bg-[#0c0c16]" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <button onClick={handleBackToPicker} className="p-1.5 rounded-md hover:bg-white/5 transition-colors flex-shrink-0">
              <ArrowLeft className="w-4 h-4 text-gray-500" />
            </button>
            {projectManager.activeProject && (
              <span className="text-[11px] text-gray-500 truncate max-w-[120px] sm:max-w-[200px]" title={projectManager.activeProject.name}>
                {projectManager.activeProject.name}
              </span>
            )}
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.15em] truncate hidden sm:inline">Cinema Studio</span>
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
            {/* Save button */}
            {projectManager.activeProject && (
              <div className="flex items-center gap-1.5">
                {lastSavedText && (
                  <span className="text-[9px] text-gray-600 hidden sm:inline">{lastSavedText}</span>
                )}
                <button
                  onClick={handleManualSave}
                  className="p-1.5 rounded-md hover:bg-white/5 transition-colors text-gray-500 hover:text-gray-300"
                  title="Salvar projeto"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

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
