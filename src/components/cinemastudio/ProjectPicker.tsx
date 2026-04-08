import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Film, MoreVertical, Trash2, Pencil, Lock, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AppLayout from '@/components/layout/AppLayout';
import NewProjectModal from './NewProjectModal';
import type { CinemaProject } from '@/hooks/useCinemaProjects';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';

interface Props {
  projects: CinemaProject[];
  isLoading: boolean;
  projectCount: number;
  onCreateProject: (name: string) => Promise<any>;
  onSelectProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => Promise<void>;
  onRenameProject: (projectId: string, newName: string) => Promise<void>;
}

const MAX_PROJECTS = 20;

const ProjectPicker: React.FC<Props> = ({
  projects, isLoading, projectCount,
  onCreateProject, onSelectProject, onDeleteProject, onRenameProject,
}) => {
  const navigate = useNavigate();
  const [showNewModal, setShowNewModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CinemaProject | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const atLimit = projectCount >= MAX_PROJECTS;

  const handleCreate = async (name: string) => {
    const result = await onCreateProject(name);
    if (result) setShowNewModal(false);
  };

  const handleNewClick = () => {
    if (atLimit) {
      const { toast } = await_toast();
      return;
    }
    setShowNewModal(true);
  };

  const handleRenameSubmit = async (projectId: string) => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed.length <= 50) {
      await onRenameProject(projectId, trimmed);
    }
    setRenamingId(null);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd 'de' MMM', 'HH:mm", { locale: ptBR });
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <AppLayout fullScreen>
        <div className="flex h-full items-center justify-center bg-[#08080f]">
          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout fullScreen>
      <div className="flex h-full flex-col overflow-hidden bg-[#08080f]">
        {/* Header */}
        <div className="h-12 flex-shrink-0 flex items-center justify-between px-4 bg-[#0c0c16]" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
          <div className="flex items-center gap-2.5">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-md hover:bg-white/5 transition-colors">
              <ArrowLeft className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.15em]">Cinema Studio</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-200">Meus Projetos</h1>
              <p className="text-xs text-gray-500 mt-1">Até {MAX_PROJECTS} projetos • {projectCount}/{MAX_PROJECTS}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* New Project Card */}
              <button
                onClick={() => atLimit ? undefined : setShowNewModal(true)}
                className={`aspect-video rounded-xl overflow-hidden border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-2
                  ${atLimit
                    ? 'border-white/[0.04] cursor-not-allowed opacity-50'
                    : 'border-white/[0.08] hover:border-white/[0.16] hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/5 cursor-pointer'
                  } bg-gradient-to-br from-white/[0.02] to-white/[0.01]`}
              >
                {atLimit ? (
                  <>
                    <Lock className="w-6 h-6 text-gray-600" />
                    <span className="text-[11px] text-gray-600 font-medium">Limite atingido</span>
                    <span className="text-[9px] text-gray-700">{projectCount}/{MAX_PROJECTS}</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-7 h-7 text-gray-500" />
                    <span className="text-xs text-gray-400 font-medium">Novo Projeto</span>
                  </>
                )}
              </button>

              {/* Project Cards */}
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="aspect-video rounded-xl overflow-hidden relative group cursor-pointer bg-[#1a1a2e] transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/5 hover:ring-1 hover:ring-white/[0.08]"
                  onClick={() => onSelectProject(project.id)}
                >
                  {/* Cover */}
                  {project.coverUrl ? (
                    <img src={project.coverUrl} className="w-full h-full object-cover" alt={project.name} />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] to-[#12121e] flex items-center justify-center">
                      <Film className="w-8 h-8 text-gray-700/50" />
                    </div>
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-2.5">
                    {renamingId === project.id ? (
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value.slice(0, 50))}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Enter') handleRenameSubmit(project.id);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        onBlur={() => handleRenameSubmit(project.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-6 text-xs bg-black/60 border-white/10 text-white px-1.5"
                        autoFocus
                      />
                    ) : (
                      <>
                        <p className="text-xs sm:text-sm font-semibold text-white truncate">{project.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(project.updatedAt)}</p>
                      </>
                    )}
                  </div>

                  {/* Menu */}
                  <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded-md bg-black/50 hover:bg-black/70 transition-colors"
                        >
                          <MoreVertical className="w-3.5 h-3.5 text-gray-300" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#1a1a2e] border-white/[0.06] text-gray-200 min-w-[120px]">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingId(project.id);
                            setRenameValue(project.name);
                          }}
                          className="text-xs gap-2 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" /> Renomear
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(project);
                          }}
                          className="text-xs gap-2 cursor-pointer text-red-400 focus:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <NewProjectModal
          isOpen={showNewModal}
          onClose={() => setShowNewModal(false)}
          onCreate={handleCreate}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <AlertDialogContent className="bg-[#12121e] border-white/[0.06] text-gray-200">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-gray-100">Excluir {deleteTarget?.name}?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/[0.04] border-white/[0.06] text-gray-300 hover:bg-white/[0.08]">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (deleteTarget) {
                    await onDeleteProject(deleteTarget.id);
                    setDeleteTarget(null);
                  }
                }}
                className="bg-red-600/80 hover:bg-red-600 text-white border-0"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default ProjectPicker;
