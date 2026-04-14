import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

const NewProjectModal: React.FC<Props> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      await onCreate(trimmed);
      setName('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-background border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground text-lg">Novo Projeto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Nome do projeto</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 50))}
              placeholder="Ex: Clipe Vitor Hugo, Campanha Verão..."
              className="bg-white/[0.04] border-border text-foreground placeholder:text-muted-foreground"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <span className="text-[10px] text-muted-foreground mt-1 block text-right">{name.length}/50</span>
          </div>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="w-full bg-white/[0.08] hover:bg-white/[0.14] text-foreground border-0"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Projeto'}
          </Button>
          <button
            onClick={onClose}
            className="w-full text-center text-xs text-muted-foreground hover:text-muted-foreground transition-colors"
          >
            Cancelar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewProjectModal;
