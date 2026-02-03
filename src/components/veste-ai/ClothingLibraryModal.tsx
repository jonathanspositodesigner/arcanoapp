import React, { useState } from 'react';
import { User, Shirt } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ClothingLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectClothing: (imageUrl: string) => void;
}

type GenderFilter = 'masculino' | 'feminino';
type CategoryFilter = 'casual' | 'formal' | 'esportivo' | 'elegante';

// Placeholder clothing items - these will be replaced with real images later
const PLACEHOLDER_CLOTHING: Record<GenderFilter, Record<CategoryFilter, Array<{ id: string; label: string; color: string }>>> = {
  masculino: {
    casual: [
      { id: 'm-c1', label: 'Camiseta Básica', color: 'from-blue-600 to-blue-800' },
      { id: 'm-c2', label: 'Polo Casual', color: 'from-indigo-600 to-indigo-800' },
      { id: 'm-c3', label: 'Jeans & Camisa', color: 'from-slate-600 to-slate-800' },
      { id: 'm-c4', label: 'Moletom', color: 'from-gray-600 to-gray-800' },
    ],
    formal: [
      { id: 'm-f1', label: 'Terno Clássico', color: 'from-gray-700 to-gray-900' },
      { id: 'm-f2', label: 'Camisa Social', color: 'from-blue-700 to-blue-900' },
      { id: 'm-f3', label: 'Blazer', color: 'from-indigo-700 to-indigo-900' },
      { id: 'm-f4', label: 'Gravata & Colete', color: 'from-violet-700 to-violet-900' },
    ],
    esportivo: [
      { id: 'm-e1', label: 'Conjunto Academia', color: 'from-green-600 to-green-800' },
      { id: 'm-e2', label: 'Regata Fitness', color: 'from-teal-600 to-teal-800' },
      { id: 'm-e3', label: 'Short Esportivo', color: 'from-cyan-600 to-cyan-800' },
      { id: 'm-e4', label: 'Agasalho', color: 'from-emerald-600 to-emerald-800' },
    ],
    elegante: [
      { id: 'm-el1', label: 'Smoking', color: 'from-slate-800 to-black' },
      { id: 'm-el2', label: 'Terno Slim', color: 'from-purple-700 to-purple-900' },
      { id: 'm-el3', label: 'Camisa Cetim', color: 'from-rose-700 to-rose-900' },
      { id: 'm-el4', label: 'Look Premium', color: 'from-amber-700 to-amber-900' },
    ],
  },
  feminino: {
    casual: [
      { id: 'f-c1', label: 'Blusa Básica', color: 'from-pink-600 to-pink-800' },
      { id: 'f-c2', label: 'Jeans & Top', color: 'from-rose-600 to-rose-800' },
      { id: 'f-c3', label: 'Vestido Casual', color: 'from-fuchsia-600 to-fuchsia-800' },
      { id: 'f-c4', label: 'Moletom Cropped', color: 'from-purple-600 to-purple-800' },
    ],
    formal: [
      { id: 'f-f1', label: 'Blazer Feminino', color: 'from-gray-700 to-gray-900' },
      { id: 'f-f2', label: 'Vestido Social', color: 'from-blue-700 to-blue-900' },
      { id: 'f-f3', label: 'Saia & Blusa', color: 'from-indigo-700 to-indigo-900' },
      { id: 'f-f4', label: 'Tailleur', color: 'from-violet-700 to-violet-900' },
    ],
    esportivo: [
      { id: 'f-e1', label: 'Legging & Top', color: 'from-green-600 to-green-800' },
      { id: 'f-e2', label: 'Conjunto Yoga', color: 'from-teal-600 to-teal-800' },
      { id: 'f-e3', label: 'Short Fitness', color: 'from-cyan-600 to-cyan-800' },
      { id: 'f-e4', label: 'Agasalho', color: 'from-emerald-600 to-emerald-800' },
    ],
    elegante: [
      { id: 'f-el1', label: 'Vestido Longo', color: 'from-red-700 to-red-900' },
      { id: 'f-el2', label: 'Vestido Festa', color: 'from-pink-700 to-pink-900' },
      { id: 'f-el3', label: 'Look Gala', color: 'from-amber-700 to-amber-900' },
      { id: 'f-el4', label: 'Conjunto Premium', color: 'from-rose-700 to-rose-900' },
    ],
  },
};

const CATEGORIES: Array<{ id: CategoryFilter; label: string }> = [
  { id: 'casual', label: 'Casual' },
  { id: 'formal', label: 'Formal' },
  { id: 'esportivo', label: 'Esportivo' },
  { id: 'elegante', label: 'Elegante' },
];

const ClothingLibraryModal: React.FC<ClothingLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectClothing,
}) => {
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('masculino');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('casual');

  const handleSelectClothing = (clothingId: string) => {
    // For now, we'll use a placeholder URL pattern
    // In the future, this will be replaced with actual image URLs
    const placeholderUrl = `https://via.placeholder.com/512x768/1a0a2e/ffffff?text=${encodeURIComponent(clothingId)}`;
    onSelectClothing(placeholderUrl);
    onClose();
  };

  const clothing = PLACEHOLDER_CLOTHING[genderFilter][categoryFilter];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-[#1A0A2E] border-purple-500/30 text-white max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Shirt className="w-5 h-5 text-purple-400" />
            Biblioteca de Roupas
          </DialogTitle>
        </DialogHeader>

        {/* Gender Filter Tabs */}
        <div className="flex gap-2 mt-4 flex-shrink-0">
          <Button
            variant={genderFilter === 'masculino' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGenderFilter('masculino')}
            className={cn(
              "flex-1",
              genderFilter === 'masculino'
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0"
                : "bg-transparent border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
            )}
          >
            <User className="w-4 h-4 mr-2" />
            Masculino
          </Button>
          <Button
            variant={genderFilter === 'feminino' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGenderFilter('feminino')}
            className={cn(
              "flex-1",
              genderFilter === 'feminino'
                ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white border-0"
                : "bg-transparent border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
            )}
          >
            <User className="w-4 h-4 mr-2" />
            Feminino
          </Button>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex gap-1 mt-3 flex-shrink-0 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.id}
              variant={categoryFilter === cat.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCategoryFilter(cat.id)}
              className={cn(
                "text-xs whitespace-nowrap",
                categoryFilter === cat.id
                  ? "bg-purple-600 text-white"
                  : "text-purple-300 hover:bg-purple-500/20"
              )}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Clothing Grid */}
        <div className="mt-4 overflow-y-auto flex-1 pr-2">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {clothing.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelectClothing(item.id)}
                className="group relative aspect-[3/4] rounded-xl overflow-hidden border-2 border-purple-500/30 hover:border-purple-400 transition-all hover:scale-105"
              >
                {/* Placeholder gradient background */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br",
                  item.color
                )} />
                
                {/* Icon placeholder */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Shirt className="w-12 h-12 text-white/30" />
                </div>

                {/* Label */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-xs text-white font-medium text-center">
                    {item.label}
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
            👕 Clique em uma roupa para usá-la como referência
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClothingLibraryModal;
