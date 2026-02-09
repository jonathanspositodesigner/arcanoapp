import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import exampleFront from '@/assets/example-front.jpg';
import exampleProfile from '@/assets/example-profile.jpg';
import exampleSemiProfile from '@/assets/example-semi-profile.jpg';
import exampleLowAngle from '@/assets/example-low-angle.jpg';

interface AngleExamplesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const examples = [
  { label: 'De Frente', description: 'Olhando direto para a câmera', image: exampleFront },
  { label: 'Perfil', description: 'Rosto virado de lado (90°)', image: exampleProfile },
  { label: 'Semi Perfil', description: 'Rosto em ângulo de ¾', image: exampleSemiProfile },
  { label: 'Debaixo p/ Cima', description: 'Câmera de baixo olhando pra cima', image: exampleLowAngle },
];

const AngleExamplesModal: React.FC<AngleExamplesModalProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1025] border-purple-500/30 w-[calc(100%-32px)] max-w-md rounded-xl p-4">
        <DialogHeader>
          <DialogTitle className="text-white text-sm text-center">📸 Exemplo de cada ângulo</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-3 mt-2">
          {examples.map((ex) => (
            <div key={ex.label} className="flex flex-col items-center gap-1.5">
              <div className="rounded-lg overflow-hidden border border-purple-500/30 aspect-square w-full">
                <img src={ex.image} alt={ex.label} className="w-full h-full object-cover" />
              </div>
              <p className="text-[11px] font-bold text-white uppercase tracking-wider">{ex.label}</p>
              <p className="text-[9px] text-purple-300/80 text-center leading-tight">{ex.description}</p>
            </div>
          ))}
        </div>

        <DialogFooter className="mt-3">
          <Button
            className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-xs"
            onClick={() => onOpenChange(false)}
          >
            Ok, entendi!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AngleExamplesModal;
