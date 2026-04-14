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

  const uploadImageToStorage = async (url: string): Promise<string> => {
    // Fetch the image from the temporary URL
    const response = await fetch(url);
    if (!response.ok) throw new Error('Falha ao baixar imagem');
    const blob = await response.blob();

    const fileExt = blob.type === 'image/webp' ? 'webp' : 'png';
    const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('saved-avatars')
      .upload(fileName, blob, {
        contentType: blob.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from('saved-avatars')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Digite um nome para o avatar');
      return;
    }

    setIsSaving(true);
    try {
      // Upload to permanent storage first
      const permanentUrl = await uploadImageToStorage(imageUrl);

      const { error } = await supabase
        .from('saved_characters' as any)
        .insert({
          user_id: userId,
          name: name.trim(),
          image_url: permanentUrl,
          job_id: jobId,
        });

      if (error) throw error;

      toast.success('Avatar salvo com sucesso!');
      setName('');
      onSaved();
      onClose();
    } catch (error) {
      console.error('[SaveCharacterDialog] Error:', error);
      toast.error('Erro ao salvar avatar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-background border-border text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Salvar Avatar</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Dê um nome para salvar este avatar na sua galeria.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="mx-auto w-32 h-32 rounded-lg overflow-hidden border border-border">
            <img src={imageUrl} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="character-name" className="text-muted-foreground text-sm">Nome do Avatar</Label>
            <Input
              id="character-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Guerreiro Medieval"
              className="bg-accent border-border text-white placeholder:text-muted-foreground"
              maxLength={50}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-border text-muted-foreground hover:bg-accent">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-500 hover:to-slate-400 text-white"
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
