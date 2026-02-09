import React, { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SaveCharacterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  jobId: string | null;
  userId: string;
  onSaved: () => void;
}

const SaveCharacterDialog: React.FC<SaveCharacterDialogProps> = ({
  isOpen,
  onClose,
  imageUrl,
  jobId,
  userId,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Digite um nome para o personagem');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('saved_characters' as any)
        .insert({
          user_id: userId,
          name: name.trim(),
          image_url: imageUrl,
          job_id: jobId,
        });

      if (error) throw error;

      toast.success('Personagem salvo com sucesso!');
      setName('');
      onSaved();
      onClose();
    } catch (error) {
      console.error('[SaveCharacterDialog] Error:', error);
      toast.error('Erro ao salvar personagem');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1A0A2E] border-purple-500/30 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Salvar Personagem</DialogTitle>
          <DialogDescription className="text-purple-300">
            Dê um nome para salvar este personagem na sua galeria.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="mx-auto w-32 h-32 rounded-lg overflow-hidden border border-purple-500/30">
            <img src={imageUrl} alt="Personagem" className="w-full h-full object-cover" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="character-name" className="text-purple-200 text-sm">Nome do Personagem</Label>
            <Input
              id="character-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Guerreiro Medieval"
              className="bg-purple-900/30 border-purple-500/30 text-white placeholder:text-purple-400"
              maxLength={50}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-purple-500/30 text-purple-200 hover:bg-purple-900/30">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveCharacterDialog;
