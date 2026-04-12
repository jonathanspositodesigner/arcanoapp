import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, User, Loader2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import CreateCharacterModal from '@/components/seedance/CreateCharacterModal';

export interface CharacterItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  /** The AI-generated reference image (fragments on black bg) */
  reference_image_url?: string | null;
}

interface CharacterPickerProps {
  selectedCharacters: CharacterItem[];
  onCharactersChange: (items: CharacterItem[]) => void;
  maxCharacters?: number;
  /** Compact inline mode (for Seedance-style controls) */
  compact?: boolean;
  /** Use saved_characters table with Nano Banana generation instead of cinema_characters */
  useSavedCharacters?: boolean;
}

const CharacterPicker: React.FC<CharacterPickerProps> = ({
  selectedCharacters,
  onCharactersChange,
  maxCharacters = 3,
  compact = false,
  useSavedCharacters = false,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateCharacterModal, setShowCreateCharacterModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Legacy cinema_characters create form state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newImage, setNewImage] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchCharacters = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setLoading(false); return; }
    setUserId(userData.user.id);

    if (useSavedCharacters) {
      const { data } = await supabase
        .from('saved_characters' as any)
        .select('id, name, image_url, thumbnail_url, reference_image_url')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });
      if (data) {
        setCharacters((data as any[]).map((c: any) => ({
          id: c.id,
          name: c.name,
          description: null,
          image_url: c.thumbnail_url || c.image_url, // show thumbnail
          reference_image_url: c.reference_image_url,
        })));
      }
    } else {
      const { data } = await supabase
        .from('cinema_characters')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });
      if (data) setCharacters(data);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCharacters(); }, []);

  const openModal = () => {
    setModalOpen(true);
    setShowCreate(false);
    resetForm();
  };

  const resetForm = () => {
    if (newImagePreview) URL.revokeObjectURL(newImagePreview);
    setNewName('');
    setNewDesc('');
    setNewImage(null);
    setNewImagePreview('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (newImagePreview) URL.revokeObjectURL(newImagePreview);
    setNewImage(file);
    setNewImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!newName.trim()) { toast.error('Nome é obrigatório'); return; }
    if (!newImage) { toast.error('Imagem é obrigatória'); return; }
    if (characters.length >= 20) {
      toast.error('Limite de 20 personagens atingido.');
      return;
    }

    setSaving(true);
    let uploadedPath: string | null = null;
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) { toast.error('Faça login novamente.'); return; }

      const ext = newImage.name.split('.').pop()?.toLowerCase() || 'png';
      uploadedPath = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from('cinema-assets').upload(uploadedPath, newImage, {
        cacheControl: '3600', upsert: false, contentType: newImage.type || undefined,
      });
      if (uploadError) { toast.error('Erro ao enviar imagem.'); return; }

      const { data: urlData } = supabase.storage.from('cinema-assets').getPublicUrl(uploadedPath);
      const imageUrl = urlData.publicUrl;
      if (!imageUrl) {
        await supabase.storage.from('cinema-assets').remove([uploadedPath]);
        toast.error('Erro ao obter URL da imagem.');
        return;
      }

      const { error } = await supabase.from('cinema_characters').insert({
        user_id: user.id,
        name: newName.trim(),
        description: newDesc.trim() || null,
        image_url: imageUrl,
      });

      if (error) {
        await supabase.storage.from('cinema-assets').remove([uploadedPath]);
        toast.error('Erro ao salvar personagem.');
        return;
      }

      toast.success('Personagem criado!');
      await fetchCharacters();
      setShowCreate(false);
      resetForm();
    } catch {
      if (uploadedPath) await supabase.storage.from('cinema-assets').remove([uploadedPath]);
      toast.error('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (useSavedCharacters) {
      await supabase.from('saved_characters' as any).delete().eq('id', id);
    } else {
      await supabase.from('cinema_characters').delete().eq('id', id);
    }
    const filtered = selectedCharacters.filter(c => c.id !== id);
    onCharactersChange(filtered);
    await fetchCharacters();
    toast.success('Personagem removido!');
  };

  const selectItem = (item: CharacterItem) => {
    const alreadySelected = selectedCharacters.some(c => c.id === item.id);
    if (alreadySelected) {
      onCharactersChange(selectedCharacters.filter(c => c.id !== item.id));
    } else {
      if (selectedCharacters.length >= maxCharacters) {
        toast.error(`Máximo de ${maxCharacters} personagens`);
        return;
      }
      const newChars = [...selectedCharacters, item];
      onCharactersChange(newChars);
      if (newChars.length < maxCharacters) return; // keep modal open
    }
    setModalOpen(false);
  };

  const removeChar = (id: string) => {
    onCharactersChange(selectedCharacters.filter(c => c.id !== id));
  };

  // ── Compact mode (inline button for Seedance) ──
  if (compact) {
    return (
      <>
        <div className="flex items-center gap-1.5 group/ctrl">
          <span className="text-[10px] font-medium uppercase tracking-wider text-gray-600 transition-colors group-hover/ctrl:text-gray-400">
            Personagem
          </span>
          <button
            onClick={openModal}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[11px] text-gray-300 transition-all duration-200 hover:border-purple-500/30 hover:bg-white/[0.06] hover:scale-[1.04]"
          >
            {selectedCharacters.length > 0 ? (
              <div className="flex items-center gap-1">
                <div className="flex -space-x-1.5">
                  {selectedCharacters.slice(0, 3).map(c => (
                    c.image_url ? (
                      <img key={c.id} src={c.image_url} alt="" className="w-4 h-4 rounded-full object-cover border border-[#0a0a18]" />
                    ) : (
                      <div key={c.id} className="w-4 h-4 rounded-full bg-purple-500/20 border border-[#0a0a18] flex items-center justify-center">
                        <User className="w-2 h-2 text-purple-300" />
                      </div>
                    )
                  ))}
                </div>
                <span className="text-purple-300">{selectedCharacters.length}/{maxCharacters}</span>
              </div>
            ) : (
              <span className="flex items-center gap-1 text-gray-500">
                <User className="w-3 h-3" />
                Nenhum
              </span>
            )}
          </button>
          {selectedCharacters.length > 0 && (
            <button
              onClick={() => onCharactersChange([])}
              className="p-0.5 rounded hover:bg-white/10 transition-colors"
            >
              <X className="w-3 h-3 text-gray-600 hover:text-gray-300" />
            </button>
          )}
        </div>
        {renderModal()}
        {useSavedCharacters && userId && (
          <CreateCharacterModal
            open={showCreateCharacterModal}
            onOpenChange={setShowCreateCharacterModal}
            userId={userId}
            onCharacterCreated={() => fetchCharacters()}
            currentCount={characters.length}
          />
        )}
      </>
    );
  }

  // ── Full mode (for Cinema Studio) ──
  return (
    <>
      <div className="space-y-1.5">
        {selectedCharacters.length > 0 && (
          <div className="space-y-1">
            {selectedCharacters.map(char => (
              <div key={char.id} className="flex items-center gap-2 w-full p-1.5 rounded-md bg-white/[0.03] border border-white/[0.06]">
                {char.image_url ? (
                  <img src={char.image_url} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                    <User className="w-3 h-3 text-gray-600" />
                  </div>
                )}
                <span className="text-[11px] text-gray-300 truncate flex-1">{char.name}</span>
                <button onClick={() => removeChar(char.id)} className="p-0.5 hover:bg-white/10 rounded">
                  <X className="w-3 h-3 text-gray-600" />
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={openModal}
          className="flex items-center gap-2 w-full p-2 rounded-md bg-black/20 border border-white/[0.06] hover:border-white/[0.12] transition-colors"
        >
          <div className="w-8 h-8 rounded bg-white/[0.04] flex items-center justify-center flex-shrink-0">
            {selectedCharacters.length > 0 ? <Plus className="w-3.5 h-3.5 text-gray-600" /> : <User className="w-3.5 h-3.5 text-gray-600" />}
          </div>
          <div className="text-left min-w-0 flex-1">
            <span className="text-[9px] text-gray-600 uppercase tracking-wider block">
              Personagem ({selectedCharacters.length}/{maxCharacters})
            </span>
            <span className="text-[11px] text-gray-300 truncate block">
              {selectedCharacters.length === 0 ? 'Selecionar...' : selectedCharacters.length < maxCharacters ? 'Adicionar mais...' : 'Limite atingido'}
            </span>
          </div>
        </button>
      </div>
      {renderModal()}
      {useSavedCharacters && userId && (
        <CreateCharacterModal
          open={showCreateCharacterModal}
          onOpenChange={setShowCreateCharacterModal}
          userId={userId}
          onCharacterCreated={() => fetchCharacters()}
          currentCount={characters.length}
        />
      )}
    </>
  );

  function renderModal() {
    return (
      <Dialog open={modalOpen} onOpenChange={open => { if (!open) setModalOpen(false); }}>
        <DialogContent className="bg-[#141420] border-white/[0.08] max-w-[520px] w-[95vw] max-h-[85vh] overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle className="text-gray-200 text-sm">
              👤 Personagens ({selectedCharacters.length}/{maxCharacters})
            </DialogTitle>
          </DialogHeader>

          {selectedCharacters.length >= maxCharacters && (
            <div className="text-[11px] text-amber-400/80 bg-amber-500/10 rounded-md px-3 py-2">
              Limite de {maxCharacters} personagens atingido. Remova um para adicionar outro.
            </div>
          )}

          {/* For saved_characters mode: show create character modal trigger */}
          {useSavedCharacters ? (
            <div className="space-y-3 pt-2">
              <Button
                onClick={() => { setModalOpen(false); setShowCreateCharacterModal(true); }}
                variant="outline"
                size="sm"
                className="w-full border-dashed border-white/[0.1] text-gray-400 text-[11px] hover:bg-white/[0.04]"
                disabled={characters.length >= 20}
              >
                <Plus className="w-3 h-3 mr-1" />
                Criar novo personagem {characters.length >= 20 && '(limite atingido)'}
              </Button>

              {selectedCharacters.length > 0 && (
                <Button onClick={() => setModalOpen(false)} size="sm" className="w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[11px]">
                  Confirmar seleção ({selectedCharacters.length})
                </Button>
              )}

              {renderCharacterGrid()}
            </div>
          ) : (
            /* Legacy cinema_characters mode */
            showCreate ? (
              <div className="space-y-3 pt-2">
                <div
                  onClick={() => fileRef.current?.click()}
                  className="w-full aspect-square rounded-lg border border-dashed border-white/[0.1] bg-black/20 flex items-center justify-center cursor-pointer hover:border-white/[0.2] transition-colors overflow-hidden"
                >
                  {newImagePreview ? (
                    <img src={newImagePreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <Plus className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                      <span className="text-[10px] text-gray-600">Adicionar imagem</span>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome" className="bg-black/20 border-white/[0.08] text-gray-300 text-[12px]" />
                <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Descrição..." rows={3} className="bg-black/20 border-white/[0.08] text-gray-300 text-[12px] resize-none" />
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setShowCreate(false); resetForm(); }} className="flex-1 text-gray-400 text-[11px]">Cancelar</Button>
                  <Button size="sm" onClick={handleSave} disabled={saving || !newName.trim() || !newImage} className="flex-1 bg-white/[0.08] hover:bg-white/[0.14] text-gray-200 text-[11px]">
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Salvar'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <Button onClick={() => setShowCreate(true)} variant="outline" size="sm" className="w-full border-dashed border-white/[0.1] text-gray-400 text-[11px] hover:bg-white/[0.04]">
                  <Plus className="w-3 h-3 mr-1" />
                  Criar novo personagem
                </Button>

                {selectedCharacters.length > 0 && (
                  <Button onClick={() => setModalOpen(false)} size="sm" className="w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[11px]">
                    Confirmar seleção ({selectedCharacters.length})
                  </Button>
                )}

                {renderCharacterGrid()}
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    );
  }

  function renderCharacterGrid() {
    if (loading) {
      return (
        <div className="py-8 flex justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
        </div>
      );
    }
    
    if (characters.length === 0) {
      return <p className="text-[11px] text-gray-600 text-center py-6">Nenhum personagem salvo ainda.</p>;
    }

    return (
      <div className="grid grid-cols-4 gap-2">
        {characters.map(item => {
          const isSelected = selectedCharacters.some(c => c.id === item.id);
          return (
            <div
              key={item.id}
              className={`relative rounded-lg overflow-hidden cursor-pointer transition-all group ${
                isSelected ? 'ring-2 ring-purple-500 ring-offset-1 ring-offset-[#141420]' : 'hover:ring-1 hover:ring-white/20'
              }`}
              onClick={() => selectItem(item)}
            >
              <div className="aspect-square bg-white/[0.04] relative">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                )}
                {isSelected && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                    <span className="text-[8px] text-white font-bold">✓</span>
                  </div>
                )}
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(item.id); }}
                  className="absolute top-1 left-1 p-0.5 rounded bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-2.5 h-2.5 text-red-400" />
                </button>
              </div>
              <div className="px-1 py-1 bg-black/40">
                <span className="text-[9px] text-gray-300 font-medium block truncate text-center">{item.name}</span>
              </div>
            </div>
          );
        })}
        {Array.from({ length: Math.max(0, 20 - characters.length) }).map((_, i) => (
          <div key={`empty-${i}`} className="rounded-lg overflow-hidden border border-dashed border-white/[0.06]">
            <div className="aspect-square bg-white/[0.02] flex items-center justify-center">
              <div className="w-3 h-3 rounded-full border border-white/[0.08]" />
            </div>
            <div className="px-1 py-1 bg-black/20">
              <span className="text-[9px] text-gray-700 block text-center">—</span>
            </div>
          </div>
        ))}
      </div>
    );
  }
};

export default CharacterPicker;
