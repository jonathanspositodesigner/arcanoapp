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



const CinemaStudio: React.FC = () => {
  const isMobile = useIsMobile();
  const isTabletViewport = useIsTabletViewport();
  const isCompactLayout = isTabletViewport;
  const [mobileTab, setMobileTab] = React.useState<'controls' | 'preview'>('preview');
  const studio = useCinemaStudio();
  const projectManager = useCinemaProjects();
  const [view, setView] = React.useState<'picker' | 'studio'>('picker');
  const autoSaveTimeoutRef = useRef<number | null>(null);
  const hasInitializedAutoSaveRef = useRef(false);
  const activeProjectId = projectManager.activeProject?.id ?? null;

  // Fetch projects on mount
  useEffect(() => {
    projectManager.fetchProjects();
  }, [projectManager.fetchProjects]);

  const clearAutoSaveTimeout = useCallback(() => {
    if (!autoSaveTimeoutRef.current) return;
    window.clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      clearAutoSaveTimeout();
    };
  }, [clearAutoSaveTimeout]);

  useEffect(() => {
    hasInitializedAutoSaveRef.current = false;
    clearAutoSaveTimeout();
  }, [activeProjectId, clearAutoSaveTimeout, view]);

  const persistActiveProject = useCallback(async (showSuccessToast = false) => {
    if (!activeProjectId) return false;

    clearAutoSaveTimeout();

    try {
      const projectState = await studio.buildPersistedProjectState();
      const saved = await projectManager.saveProject(activeProjectId, projectState);

      if (saved && showSuccessToast) {
        toast.success('Projeto salvo ✓');
      }

      return saved;
    } catch (error) {
      console.error('persistActiveProject error', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar projeto');
      return false;
    }
  }, [activeProjectId, clearAutoSaveTimeout, projectManager.saveProject, studio.buildPersistedProjectState]);

  const triggerAutoSave = useCallback(() => {
    if (!activeProjectId || studio.isProcessing) return;

    clearAutoSaveTimeout();
    autoSaveTimeoutRef.current = window.setTimeout(() => {
      void persistActiveProject();
    }, 1500);
  }, [activeProjectId, clearAutoSaveTimeout, persistActiveProject, studio.isProcessing]);

  useEffect(() => {
    if (view !== 'studio' || !activeProjectId) return;
    if (!hasInitializedAutoSaveRef.current) {
      hasInitializedAutoSaveRef.current = true;
      return;
    }

    if (!studio.isProcessing) {
      triggerAutoSave();
    }
  }, [
    activeProjectId,
    studio.activePhotoSceneId,
    studio.activeSceneId,
    studio.activeVideoSceneId,
    studio.isProcessing,
    studio.mode,
    studio.outputUrl,
    studio.photoStoryboard,
    studio.referenceImagePreviews,
    studio.selectedCharacters,
    studio.selectedScenario,
    studio.settings,
    studio.videoStoryboard,
    triggerAutoSave,
    view,
  ]);

  // Handle selecting a project from picker
  const handleSelectProject = useCallback(async (projectId: string) => {
    clearAutoSaveTimeout();
    const project = await projectManager.loadProject(projectId);
    if (!project) return;

    studio.restoreProjectState(project);
    setMobileTab('preview');

    setView('studio');
  }, [clearAutoSaveTimeout, projectManager, studio]);

  // Handle creating a project
  const handleCreateProject = useCallback(async (name: string) => {
    clearAutoSaveTimeout();
    const project = await projectManager.createProject(name);
    if (!project) return null;

    studio.restoreProjectState(project);
    setMobileTab('preview');
    setView('studio');
    return project;
  }, [clearAutoSaveTimeout, projectManager, studio]);

  // Handle back to picker
  const handleBackToPicker = useCallback(async () => {
    clearAutoSaveTimeout();

    if (activeProjectId) {
      const saved = await persistActiveProject(true);
      if (!saved) return;
    }

    projectManager.setActiveProject(null);
    setView('picker');
    projectManager.fetchProjects();
  }, [activeProjectId, clearAutoSaveTimeout, persistActiveProject, projectManager]);

  // Handle manual save
  const handleManualSave = useCallback(async () => {
    if (!activeProjectId) return;
    await persistActiveProject(true);
  }, [activeProjectId, persistActiveProject]);

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
        onCreateProject={handleCreateProject}
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
            <button onClick={handleBackToPicker} className="p-1.5 rounded-md hover:bg-accent transition-colors flex-shrink-0">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            {projectManager.activeProject && (
              <span className="text-[11px] text-muted-foreground truncate max-w-[120px] sm:max-w-[200px]" title={projectManager.activeProject.name}>
                {projectManager.activeProject.name}
              </span>
            )}
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.15em] truncate hidden sm:inline">Cinema Studio</span>
          </div>

          <div className="bg-white/[0.04] rounded-md p-0.5 flex flex-shrink-0">
            <button
              onClick={() => studio.setMode('photo')}
              className={`px-2.5 sm:px-3 py-1 text-[11px] rounded font-medium flex items-center gap-1.5 transition-all ${
                studio.mode === 'photo' ? 'bg-white/[0.08] text-gray-200' : 'text-muted-foreground hover:text-muted-foreground'
              }`}
            >
              <Camera className="w-3 h-3" /> Foto
            </button>
            <button
              onClick={() => studio.setMode('video')}
              className={`px-2.5 sm:px-3 py-1 text-[11px] rounded font-medium flex items-center gap-1.5 transition-all ${
                studio.mode === 'video' ? 'bg-white/[0.08] text-gray-200' : 'text-muted-foreground hover:text-muted-foreground'
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
                  <span className="text-[9px] text-muted-foreground hidden sm:inline">{lastSavedText}</span>
                )}
                <button
                  onClick={handleManualSave}
                  className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-muted-foreground"
                  title="Salvar projeto"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="hidden md:flex items-center gap-1 text-[11px] text-muted-foreground px-2 py-1">
              <Coins className="w-3 h-3 text-yellow-500/60" />
              <span className="text-muted-foreground font-medium">{studio.creditsLoading ? '...' : studio.credits}</span>
            </div>
            {!studio.isProcessing && studio.status !== 'completed' && (
              <Button
                onClick={studio.handleGenerate}
                disabled={!studio.canGenerate}
                size="sm"
                className="h-7 px-2.5 sm:px-3 text-[11px] bg-white/[0.08] hover:bg-white/[0.14] text-gray-200 border-0 disabled:opacity-30 disabled:text-muted-foreground"
              >
                {studio.isSubmitting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Gerar</span>
                    <span className="ml-1.5 text-muted-foreground flex items-center gap-0.5">
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
                mobileTab === 'controls' ? 'text-gray-200 border-b border-gray-400' : 'text-muted-foreground'
              }`}
            >
              Controles
            </button>
            <button
              onClick={() => setMobileTab('preview')}
              className={`flex-1 py-2 text-[11px] font-medium transition-colors ${
                mobileTab === 'preview' ? 'text-gray-200 border-b border-gray-400' : 'text-muted-foreground'
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
