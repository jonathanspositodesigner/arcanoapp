import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, Trash2, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SavedCharacter {
  id: string;
  name: string;
  image_url: string;
  created_at: string;
}

interface SavedCharactersPanelProps {
  userId: string | undefined;
  refreshTrigger: number;
}

const SavedCharactersPanel: React.FC<SavedCharactersPanelProps> = ({ userId, refreshTrigger }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [characters, setCharacters] = useState<SavedCharacter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCharacters = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_characters' as any)
        .select('id, name, image_url, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCharacters((data as any as SavedCharacter[]) || []);
    } catch (error) {
      console.error('[SavedCharactersPanel] Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId && isExpanded) {
      fetchCharacters();
    }
  }, [userId, isExpanded, fetchCharacters, refreshTrigger]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('saved_characters' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      setCharacters(prev => prev.filter(c => c.id !== id));
      toast.success('Avatar removido');
    } catch (error) {
      console.error('[SavedCharactersPanel] Delete error:', error);
      toast.error('Erro ao remover avatar');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mt-2">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-between text-purple-300 hover:text-white hover:bg-purple-900/30 text-xs"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          Avatares Salvos {characters.length > 0 && `(${characters.length})`}
        </span>
        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </Button>

      {isExpanded && (
        <div className="mt-2 space-y-2 max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            </div>
          ) : characters.length === 0 ? (
            <p className="text-center text-purple-400 text-xs py-4">
              Nenhum avatar salvo ainda
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {characters.map((char) => (
                <Card key={char.id} className="relative overflow-hidden border-purple-500/20 bg-purple-900/10 group">
                  <div className="aspect-square">
                    <img src={char.image_url} alt={char.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
                    <p className="text-[10px] font-medium text-white truncate">{char.name}</p>
                  </div>
                  
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 bg-red-500/80 hover:bg-red-600 text-white rounded-full"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-[#1A0A2E] border-purple-500/30 text-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover avatar?</AlertDialogTitle>
                          <AlertDialogDescription className="text-purple-300">
                            Tem certeza que deseja remover "{char.name}"? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-purple-500/30 text-purple-200 hover:bg-purple-900/30">Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => handleDelete(char.id)}
                            disabled={deletingId === char.id}
                          >
                            {deletingId === char.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remover'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SavedCharactersPanel;
