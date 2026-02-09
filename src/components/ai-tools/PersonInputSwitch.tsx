import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Upload, Plus, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import ImageUploadCard from '@/components/pose-changer/ImageUploadCard';

interface SavedCharacter {
  id: string;
  name: string;
  image_url: string;
}

interface PersonInputSwitchProps {
  image: string | null;
  onImageChange: (image: string | null, file?: File) => void;
  userId: string | undefined;
  disabled?: boolean;
}

const PersonInputSwitch: React.FC<PersonInputSwitchProps> = ({
  image,
  onImageChange,
  userId,
  disabled = false,
}) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'character' | 'photo'>('character');
  const [characters, setCharacters] = useState<SavedCharacter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const latestSelectionRef = useRef<string | null>(null);

  const fetchCharacters = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_characters' as any)
        .select('id, name, image_url')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCharacters(data as any as SavedCharacter[]);
      }
    } catch (err) {
      console.error('[PersonInputSwitch] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId && mode === 'character') {
      fetchCharacters();
    }
  }, [userId, mode, fetchCharacters]);

  const handleSelectCharacter = async (char: SavedCharacter) => {
    latestSelectionRef.current = char.id;
    setSelectedCharacterId(char.id);
    try {
      const response = await fetch(char.image_url);
      if (latestSelectionRef.current !== char.id) return;
      const blob = await response.blob();
      if (latestSelectionRef.current !== char.id) return;
      const file = new File([blob], `character-${char.id}.png`, { type: blob.type });

      const reader = new FileReader();
      reader.onload = (e) => {
        if (latestSelectionRef.current !== char.id) return;
        onImageChange(e.target?.result as string, file);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('[PersonInputSwitch] Error fetching character image:', error);
      if (latestSelectionRef.current !== char.id) return;
      onImageChange(char.image_url);
    }
  };

  const handleModeChange = (newMode: 'character' | 'photo') => {
    if (newMode === mode) return;
    setMode(newMode);
    onImageChange(null);
    setSelectedCharacterId(null);
    latestSelectionRef.current = null;
  };

  return (
    <div className="flex flex-col gap-1.5">
      {/* Switch tabs */}
      <div className="flex rounded-lg overflow-hidden border border-purple-500/30 h-7">
        <button
          type="button"
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 text-[10px] font-medium transition-colors',
            mode === 'character'
              ? 'bg-purple-600 text-white'
              : 'bg-purple-900/20 text-purple-300 hover:bg-purple-900/40'
          )}
          onClick={() => handleModeChange('character')}
          disabled={disabled}
        >
          <Users className="w-3 h-3" />
          Avatar
        </button>
        <button
          type="button"
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 text-[10px] font-medium transition-colors',
            mode === 'photo'
              ? 'bg-purple-600 text-white'
              : 'bg-purple-900/20 text-purple-300 hover:bg-purple-900/40'
          )}
          onClick={() => handleModeChange('photo')}
          disabled={disabled}
        >
          <Upload className="w-3 h-3" />
          Enviar Foto
        </button>
      </div>

      {/* Content based on mode */}
      {mode === 'character' ? (
        <Card className="bg-purple-900/20 border-purple-500/30 p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            </div>
          ) : characters.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <p className="text-[10px] text-purple-400 text-center">
                Nenhum avatar salvo
              </p>
              <Button
                size="sm"
                className="h-7 text-[10px] bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold border-0"
                onClick={() => navigate('/gerador-avatar')}
              >
                <Plus className="w-3 h-3 mr-1" />
                Criar Avatar
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-1.5 max-h-[180px] overflow-y-auto">
                {characters.map((char) => (
                  <button
                    key={char.id}
                    type="button"
                    disabled={disabled}
                    className={cn(
                      'relative aspect-square rounded-md overflow-hidden border-2 transition-all',
                      selectedCharacterId === char.id
                        ? 'border-fuchsia-500 ring-1 ring-fuchsia-500/50'
                        : 'border-purple-500/20 hover:border-purple-400/50'
                    )}
                    onClick={() => handleSelectCharacter(char)}
                  >
                    <img
                      src={char.image_url}
                      alt={char.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1 py-0.5">
                      <p className="text-[8px] text-white truncate">{char.name}</p>
                    </div>
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                className="w-full h-6 mt-1.5 text-[10px] bg-fuchsia-600/80 hover:bg-fuchsia-500 text-white font-semibold border-0"
                onClick={() => navigate('/gerador-avatar')}
              >
                <Plus className="w-3 h-3 mr-1" />
                Gerar Novo Avatar
              </Button>
            </>
          )}
        </Card>
      ) : (
        <ImageUploadCard
          title="Sua Foto"
          image={image}
          onImageChange={onImageChange}
          disabled={disabled}
        />
      )}
    </div>
  );
};

export default PersonInputSwitch;
