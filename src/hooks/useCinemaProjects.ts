import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { StoryboardScene } from './useCinemaStudio';

export interface CinemaProject {
  id: string;
  userId: string;
  name: string;
  coverUrl: string | null;
  scenes: StoryboardScene[];
  activeSceneIndex: number;
  createdAt: string;
  updatedAt: string;
}

const MAX_PROJECTS = 20;

function mapRow(row: any): CinemaProject {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    coverUrl: row.cover_url,
    scenes: (row.scenes as StoryboardScene[]) || [],
    activeSceneIndex: row.active_scene_index ?? 0,
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

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setProjects([]); return; }

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
      if (!user) { toast.error('Faça login para criar projetos'); return null; }

      // Check limit
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
        .insert({ user_id: user.id, name, scenes: [] })
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

  const saveProject = useCallback(async (
    projectId: string,
    scenes: StoryboardScene[],
    activeSceneIndex: number,
  ) => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      // Determine cover
      const firstOutput = scenes.find(s => s.outputUrl);
      const coverUrl = firstOutput?.thumbnailUrl || firstOutput?.outputUrl || null;

      const { error } = await supabase
        .from('cinema_projects')
        .update({
          scenes: scenes as any,
          active_scene_index: activeSceneIndex,
          cover_url: coverUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      if (error) throw error;
      setLastSavedAt(new Date());

      // Update local list
      setProjects(prev => prev.map(p =>
        p.id === projectId
          ? { ...p, scenes, activeSceneIndex, coverUrl, updatedAt: new Date().toISOString() }
          : p
      ));
      setActiveProject(prev =>
        prev?.id === projectId
          ? { ...prev, scenes, activeSceneIndex, coverUrl, updatedAt: new Date().toISOString() }
          : prev
      );
    } catch (e: any) {
      console.error('saveProject error', e);
    } finally {
      savingRef.current = false;
    }
  }, []);

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
      setProjects(prev => prev.filter(p => p.id !== projectId));
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
      setProjects(prev => prev.map(p =>
        p.id === projectId ? { ...p, name: newName } : p
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
