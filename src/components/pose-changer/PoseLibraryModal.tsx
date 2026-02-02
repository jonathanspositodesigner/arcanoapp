import React, { useState } from 'react';
import { X, User, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PoseLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPose: (imageUrl: string) => void;
}

type GenderFilter = 'homem' | 'mulher';

// Placeholder poses - these will be replaced with real images later
const PLACEHOLDER_POSES: Record<GenderFilter, Array<{ id: string; label: string; color: string }>> = {
  homem: [
    { id: 'h1', label: 'Em Pé Casual', color: 'from-blue-600 to-blue-800' },
    { id: 'h2', label: 'Braços Cruzados', color: 'from-indigo-600 to-indigo-800' },
    { id: 'h3', label: 'Sentado', color: 'from-violet-600 to-violet-800' },
    { id: 'h4', label: 'Caminhando', color: 'from-purple-600 to-purple-800' },
    { id: 'h5', label: 'Apontando', color: 'from-blue-700 to-indigo-900' },
    { id: 'h6', label: 'Mãos no Bolso', color: 'from-slate-600 to-slate-800' },
    { id: 'h7', label: 'Pose Confiante', color: 'from-cyan-600 to-cyan-800' },
    { id: 'h8', label: 'Pose Executivo', color: 'from-gray-600 to-gray-800' },
  ],
  mulher: [
    { id: 'm1', label: 'Em Pé Elegante', color: 'from-pink-600 to-pink-800' },
    { id: 'm2', label: 'Mãos na Cintura', color: 'from-rose-600 to-rose-800' },
    { id: 'm3', label: 'Sentada', color: 'from-fuchsia-600 to-fuchsia-800' },
    { id: 'm4', label: 'Pose Fashion', color: 'from-purple-600 to-purple-800' },
    { id: 'm5', label: 'Caminhando', color: 'from-pink-700 to-rose-900' },
    { id: 'm6', label: 'Braços Cruzados', color: 'from-violet-600 to-violet-800' },
    { id: 'm7', label: 'Pose Casual', color: 'from-magenta-600 to-magenta-800' },
    { id: 'm8', label: 'Pose Profissional', color: 'from-red-600 to-red-800' },
  ],
};

const PoseLibraryModal: React.FC<PoseLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectPose,
}) => {
  const [filter, setFilter] = useState<GenderFilter>('homem');

  const handleSelectPose = (poseId: string) => {
    // For now, we'll use a placeholder URL pattern
    // In the future, this will be replaced with actual image URLs
    const placeholderUrl = `https://via.placeholder.com/512x768/1a0a2e/ffffff?text=${encodeURIComponent(poseId)}`;
    onSelectPose(placeholderUrl);
    onClose();
  };

  const poses = PLACEHOLDER_POSES[filter];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-[#1A0A2E] border-purple-500/30 text-white max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            Biblioteca de Poses de Referência
          </DialogTitle>
        </DialogHeader>

        {/* Filter Tabs */}
        <div className="flex gap-2 mt-4 flex-shrink-0">
          <Button
            variant={filter === 'homem' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('homem')}
            className={cn(
              "flex-1",
              filter === 'homem'
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0"
                : "bg-transparent border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
            )}
          >
            <User className="w-4 h-4 mr-2" />
            Homem
          </Button>
          <Button
            variant={filter === 'mulher' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('mulher')}
            className={cn(
              "flex-1",
              filter === 'mulher'
                ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white border-0"
                : "bg-transparent border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
            )}
          >
            <User className="w-4 h-4 mr-2" />
            Mulher
          </Button>
        </div>

        {/* Poses Grid */}
        <div className="mt-4 overflow-y-auto flex-1 pr-2">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {poses.map((pose) => (
              <button
                key={pose.id}
                onClick={() => handleSelectPose(pose.id)}
                className="group relative aspect-[3/4] rounded-xl overflow-hidden border-2 border-purple-500/30 hover:border-purple-400 transition-all hover:scale-105"
              >
                {/* Placeholder gradient background */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br",
                  pose.color
                )} />
                
                {/* Icon placeholder */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <User className="w-12 h-12 text-white/30" />
                </div>

                {/* Label */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-xs text-white font-medium text-center">
                    {pose.label}
                  </p>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-purple-500/0 group-hover:bg-purple-500/20 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium bg-purple-600 px-3 py-1 rounded-full transition-opacity">
                    Selecionar
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Info text */}
          <p className="text-xs text-purple-400 text-center mt-4 pb-2">
            💡 Clique em uma pose para usá-la como referência
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PoseLibraryModal;
