import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { StoryboardScene, StudioMode } from './useCinemaStudio';

export interface CinemaProject {
  id: string;
  userId: string;
  name: string;
  coverUrl: string | null;
  scenes: StoryboardScene[];
  activeMode: StudioMode;
  activePhotoSceneId: string | null;
  activeVideoSceneId: string | null;
  activeSceneIndex: number;
  createdAt: string;
  updatedAt: string;
}

interface PersistedProjectState {
  scenes: StoryboardScene[];
  activeMode: StudioMode;
  activePhotoSceneId: string | null;
  activeVideoSceneId: string | null;
}

interface SaveRequest {
  projectId: string;
  projectState: PersistedProjectState;
  resolvers: Array<(success: boolean) => void>;
}

const MAX_PROJECTS = 20;
const DEFAULT_PHOTO_SCENE_ID = 'photo-slot-0';
const DEFAULT_VIDEO_SCENE_ID = 'video-slot-0';

function getSceneIndex(sceneId: string | null | undefined) {
  const parsed = Number(sceneId?.split('-').pop() ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeProjectState(value: unknown): PersistedProjectState {
  if (Array.isArray(value)) {
    const scenes = value as StoryboardScene[];
    return {
      scenes,
      activeMode: scenes.some(scene => scene.type === 'video' && (scene.outputUrl || scene.referenceUrls?.length)) ? 'video' : 'photo',
      activePhotoSceneId: scenes.find(scene => scene.type === 'photo')?.id ?? DEFAULT_PHOTO_SCENE_ID,
      activeVideoSceneId: scenes.find(scene => scene.type === 'video')?.id ?? DEFAULT_VIDEO_SCENE_ID,
    };
  }

  const payload = (value && typeof value === 'object' ? value : {}) as Partial<PersistedProjectState> & {
    photoScenes?: StoryboardScene[];
    videoScenes?: StoryboardScene[];
  };

  const scenes = Array.isArray(payload.scenes)
    ? payload.scenes
    : [
        ...(Array.isArray(payload.photoScenes) ? payload.photoScenes : []),
        ...(Array.isArray(payload.videoScenes) ? payload.videoScenes : []),
      ];

  return {
    scenes,
    activeMode: payload.activeMode === 'video' ? 'video' : 'photo',
    activePhotoSceneId: payload.activePhotoSceneId ?? scenes.find(scene => scene.type === 'photo')?.id ?? DEFAULT_PHOTO_SCENE_ID,
    activeVideoSceneId: payload.activeVideoSceneId ?? scenes.find(scene => scene.type === 'video')?.id ?? DEFAULT_VIDEO_SCENE_ID,
  };
}

function mapRow(row: any): CinemaProject {
  const state = normalizeProjectState(row.scenes);
  const activeSceneId = state.activeMode === 'video' ? state.activeVideoSceneId : state.activePhotoSceneId;

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    coverUrl: row.cover_url,
    scenes: state.scenes,
    activeMode: state.activeMode,
    activePhotoSceneId: state.activePhotoSceneId,
    activeVideoSceneId: state.activeVideoSceneId,
    activeSceneIndex: row.active_scene_index ?? getSceneIndex(activeSceneId),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useCinemaProjects() {
  const [projects, setProjects] = useState<CinemaProject[]>([]);
  const [activeProject, setActiveProject] = useState<CinemaProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const savingRef = useRef(false);
  const saveQueueRef = useRef<SaveRequest[]>([]);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProjects([]);
        return;
      }

      const { data, error } = await supabase
        .from('cinema_projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects((data || []).map(mapRow));
    } catch (e: any) {
      console.error('fetchProjects error', e);
      toast.error('Erro ao carregar projetos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProject = useCallback(async (name: string): Promise<CinemaProject | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Faça login para criar projetos');
        return null;
      }

      const { count } = await supabase
        .from('cinema_projects')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if ((count ?? 0) >= MAX_PROJECTS) {
        toast.error('Limite de 20 projetos atingido. Exclua um projeto para criar um novo.');
        return null;
      }

      const { data, error } = await supabase
        .from('cinema_projects')
        .insert({
          user_id: user.id,
          name,
          scenes: {
            scenes: [],
            activeMode: 'photo',
            activePhotoSceneId: DEFAULT_PHOTO_SCENE_ID,
            activeVideoSceneId: DEFAULT_VIDEO_SCENE_ID,
          } as any,
        })
        .select()
        .single();

      if (error) throw error;
      const project = mapRow(data);
      setProjects(prev => [project, ...prev]);
      setActiveProject(project);
      return project;
    } catch (e: any) {
      console.error('createProject error', e);
      toast.error('Erro ao criar projeto');
      return null;
    }
  }, []);

  const performSave = useCallback(async (
    projectId: string,
    projectState: PersistedProjectState,
  ): Promise<boolean> => {
    try {
      const { scenes, activeMode, activePhotoSceneId, activeVideoSceneId } = projectState;
      const firstOutput = scenes.find(scene => scene.outputUrl);
      const coverUrl = firstOutput?.thumbnailUrl || firstOutput?.outputUrl || null;
      const nowIso = new Date().toISOString();
      const activeSceneId = activeMode === 'video' ? activeVideoSceneId : activePhotoSceneId;
      const persistedState = {
        scenes,
        activeMode,
        activePhotoSceneId,
        activeVideoSceneId,
      };

      const { error } = await supabase
        .from('cinema_projects')
        .update({
          scenes: persistedState as any,
          active_scene_index: getSceneIndex(activeSceneId),
          cover_url: coverUrl,
          updated_at: nowIso,
        })
        .eq('id', projectId);

      if (error) throw error;

      const updatedProject = {
        scenes,
        activeMode,
        activePhotoSceneId,
        activeVideoSceneId,
        activeSceneIndex: getSceneIndex(activeSceneId),
        coverUrl,
        updatedAt: nowIso,
      };

      setLastSavedAt(new Date());
      setProjects(prev => prev.map(project =>
        project.id === projectId
          ? { ...project, ...updatedProject }
          : project,
      ));
      setActiveProject(prev =>
        prev?.id === projectId
          ? { ...prev, ...updatedProject }
          : prev,
      );
      return true;
    } catch (e: any) {
      console.error('saveProject error', e);
      toast.error('Erro ao salvar projeto');
      return false;
    }
  }, []);

  const flushSaveQueue = useCallback(async () => {
    if (savingRef.current) return;

    savingRef.current = true;
    try {
      while (saveQueueRef.current.length > 0) {
        const nextRequest = saveQueueRef.current.shift();
        if (!nextRequest) continue;

        const success = await performSave(nextRequest.projectId, nextRequest.projectState);
        nextRequest.resolvers.forEach(resolve => resolve(success));
      }
    } finally {
      savingRef.current = false;
    }
  }, [performSave]);

  const saveProject = useCallback((
    projectId: string,
    projectState: PersistedProjectState,
  ): Promise<boolean> => {
    return new Promise(resolve => {
      const lastQueuedRequest = saveQueueRef.current[saveQueueRef.current.length - 1];

      if (lastQueuedRequest && lastQueuedRequest.projectId === projectId) {
        lastQueuedRequest.projectState = projectState;
        lastQueuedRequest.resolvers.push(resolve);
      } else {
        saveQueueRef.current.push({
          projectId,
          projectState,
          resolvers: [resolve],
        });
      }

      if (!savingRef.current) {
        void flushSaveQueue();
      }
    });
  }, [flushSaveQueue]);

  const loadProject = useCallback(async (projectId: string): Promise<CinemaProject | null> => {
    try {
      const { data, error } = await supabase
        .from('cinema_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      const project = mapRow(data);
      setActiveProject(project);
      return project;
    } catch (e: any) {
      console.error('loadProject error', e);
      toast.error('Erro ao carregar projeto');
      return null;
    }
  }, []);

  const deleteProject = useCallback(async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('cinema_projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      setProjects(prev => prev.filter(project => project.id !== projectId));
      if (activeProject?.id === projectId) setActiveProject(null);
      toast.success('Projeto excluído');
    } catch (e: any) {
      console.error('deleteProject error', e);
      toast.error('Erro ao excluir projeto');
    }
  }, [activeProject]);

  const renameProject = useCallback(async (projectId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('cinema_projects')
        .update({ name: newName, updated_at: new Date().toISOString() })
        .eq('id', projectId);

      if (error) throw error;
      setProjects(prev => prev.map(project =>
        project.id === projectId ? { ...project, name: newName } : project,
      ));
      if (activeProject?.id === projectId) {
        setActiveProject(prev => prev ? { ...prev, name: newName } : prev);
      }
      toast.success('Projeto renomeado');
    } catch (e: any) {
      console.error('renameProject error', e);
      toast.error('Erro ao renomear projeto');
    }
  }, [activeProject]);

  return {
    projects,
    activeProject,
    setActiveProject,
    isLoading,
    projectCount: projects.length,
    fetchProjects,
    createProject,
    saveProject,
    loadProject,
    deleteProject,
    renameProject,
    lastSavedAt,
  };
}
