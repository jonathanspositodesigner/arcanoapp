import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, User, MapPin, Loader2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SavedItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
}

interface Props {
  settings: { scenePrompt: string; subject: string };
  updateSettings: (p: Partial<{ scenePrompt: string; subject: string }>) => void;
  onCharactersChange?: (items: SavedItem[]) => void;
  onScenarioChange?: (item: SavedItem | null) => void;
}

type ModalType = 'character' | 'scenario' | null;

const MAX_CHARACTERS = 3;

const CharacterScenarioSection: React.FC<Props> = ({ settings, updateSettings, onCharactersChange, onScenarioChange }) => {
  const [modalType, setModalType] = useState<ModalType>(null);
  const [characters, setCharacters] = useState<SavedItem[]>([]);
  const [scenarios, setScenarios] = useState<SavedItem[]>([]);
  const [selectedChars, setSelectedChars] = useState<SavedItem[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<SavedItem | null>(null);
  const [loading, setLoading] = useState(false);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newImage, setNewImage] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchItems = async () => {
    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) { setLoading(false); return; }

    const [charRes, scenRes] = await Promise.all([
      supabase.from('cinema_characters').select('*').eq('user_id', user.user.id).order('created_at', { ascending: false }),
      supabase.from('cinema_scenarios').select('*').eq('user_id', user.user.id).order('created_at', { ascending: false }),
    ]);
    if (charRes.data) setCharacters(charRes.data);
    if (scenRes.data) setScenarios(scenRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const openModal = (type: ModalType) => {
    setModalType(type);
    setShowCreate(false);
    resetForm();
  };

  const resetForm = () => {
    if (newImagePreview) {
      URL.revokeObjectURL(newImagePreview);
    }
    setNewName('');
    setNewDesc('');
    setNewImage(null);
    setNewImagePreview('');
    if (fileRef.current) {
      fileRef.current.value = '';
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (newImagePreview) {
      URL.revokeObjectURL(newImagePreview);
    }
    setNewImage(file);
    setNewImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!newName.trim()) { toast.error('Nome é obrigatório'); return; }
    if (!newImage) { toast.error('Imagem é obrigatória'); return; }

    const currentList = modalType === 'character' ? characters : scenarios;
    if (currentList.length >= 20) {
      toast.error(`Limite de 20 ${modalType === 'character' ? 'personagens' : 'cenários'} atingido. Delete um existente para criar outro.`);
      return;
    }

    setSaving(true);
    let uploadedPath: string | null = null;

    try {
      const { data, error: userError } = await supabase.auth.getUser();
      const user = data.user;

      if (userError || !user) {
        toast.error('Faça login novamente para salvar.');
        return;
      }

      const ext = newImage.name.split('.').pop()?.toLowerCase() || 'png';
      uploadedPath = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from('cinema-assets').upload(uploadedPath, newImage, {
        cacheControl: '3600',
        upsert: false,
        contentType: newImage.type || undefined,
      });

      if (uploadError) {
        toast.error('Erro ao enviar a imagem. Tente novamente.');
        return;
      }

      const { data: urlData } = supabase.storage.from('cinema-assets').getPublicUrl(uploadedPath);
      const imageUrl = urlData.publicUrl;

      if (!imageUrl) {
        await supabase.storage.from('cinema-assets').remove([uploadedPath]);
        toast.error('Não foi possível obter a imagem enviada.');
        return;
      }

      const table = modalType === 'character' ? 'cinema_characters' : 'cinema_scenarios';
      const { error } = await supabase.from(table).insert({
        user_id: user.id,
        name: newName.trim(),
        description: newDesc.trim() || null,
        image_url: imageUrl,
      });

      if (error) {
        await supabase.storage.from('cinema-assets').remove([uploadedPath]);
        if (error.message?.includes('Limite de 20')) {
          toast.error(`Limite de 20 ${modalType === 'character' ? 'personagens' : 'cenários'} atingido.`);
        } else {
          toast.error('Erro ao salvar');
        }
        return;
      }

      toast.success(modalType === 'character' ? 'Personagem criado!' : 'Cenário criado!');
      await fetchItems();
      setShowCreate(false);
      resetForm();
    } catch (error) {
      if (uploadedPath) {
        await supabase.storage.from('cinema-assets').remove([uploadedPath]);
      }
      toast.error('Erro ao salvar imagem e dados.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, type: 'character' | 'scenario') => {
    const table = type === 'character' ? 'cinema_characters' : 'cinema_scenarios';
    await supabase.from(table).delete().eq('id', id);
    if (type === 'character') {
      const filtered = selectedChars.filter(c => c.id !== id);
      setSelectedChars(filtered);
      onCharactersChange?.(filtered);
    }
    if (type === 'scenario' && selectedScenario?.id === id) {
      setSelectedScenario(null);
      onScenarioChange?.(null);
    }
    await fetchItems();
    toast.success('Removido!');
  };

  const selectItem = (item: SavedItem) => {
    if (modalType === 'character') {
      const alreadySelected = selectedChars.some(c => c.id === item.id);
      let newChars: SavedItem[];
      if (alreadySelected) {
        newChars = selectedChars.filter(c => c.id !== item.id);
      } else {
        if (selectedChars.length >= MAX_CHARACTERS) {
          toast.error(`Máximo de ${MAX_CHARACTERS} personagens`);
          return;
        }
        newChars = [...selectedChars, item];
      }
      setSelectedChars(newChars);
      onCharactersChange?.(newChars);
      // Update subject with all character descriptions
      const descriptions = newChars.map(c => c.description).filter(Boolean).join('; ');
      updateSettings({ subject: descriptions });
      // Don't close modal so user can pick more
      if (!alreadySelected && newChars.length < MAX_CHARACTERS) return;
    } else {
      const isSame = selectedScenario?.id === item.id;
      const newVal = isSame ? null : item;
      setSelectedScenario(newVal);
      onScenarioChange?.(newVal);
    }
    setModalType(null);
  };

  const removeChar = (id: string) => {
    const filtered = selectedChars.filter(c => c.id !== id);
    setSelectedChars(filtered);
    onCharactersChange?.(filtered);
    const descriptions = filtered.map(c => c.description).filter(Boolean).join('; ');
    updateSettings({ subject: descriptions });
  };

  const items = modalType === 'character' ? characters : scenarios;

  return (
    <>
      <div className="space-y-1.5">
        {/* Personagens selecionados */}
        {selectedChars.length > 0 && (
          <div className="space-y-1">
            {selectedChars.map(char => (
              <div
                key={char.id}
                className="flex items-center gap-2 w-full p-1.5 rounded-md bg-white/[0.03] border border-white/[0.06]"
              >
                {char.image_url ? (
                  <img src={char.image_url} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                    <User className="w-3 h-3 text-gray-600" />
                  </div>
                )}
                <span className="text-[11px] text-gray-300 truncate flex-1">{char.name}</span>
                <button
                  onClick={() => removeChar(char.id)}
                  className="p-0.5 hover:bg-white/10 rounded"
                >
                  <X className="w-3 h-3 text-gray-600" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Botão adicionar personagem */}
        <button
          onClick={() => openModal('character')}
          className="flex items-center gap-2 w-full p-2 rounded-md bg-black/20 border border-white/[0.06] hover:border-white/[0.12] transition-colors"
        >
          <div className="w-8 h-8 rounded bg-white/[0.04] flex items-center justify-center flex-shrink-0">
            {selectedChars.length > 0 ? (
              <Plus className="w-3.5 h-3.5 text-gray-600" />
            ) : (
              <User className="w-3.5 h-3.5 text-gray-600" />
            )}
          </div>
          <div className="text-left min-w-0 flex-1">
            <span className="text-[9px] text-gray-600 uppercase tracking-wider block">
              Personagem ({selectedChars.length}/{MAX_CHARACTERS})
            </span>
            <span className="text-[11px] text-gray-300 truncate block">
              {selectedChars.length === 0
                ? 'Selecionar...'
                : selectedChars.length < MAX_CHARACTERS
                  ? 'Adicionar mais...'
                  : 'Limite atingido'}
            </span>
          </div>
        </button>

        {/* Cenário selector */}
        <button
          onClick={() => openModal('scenario')}
          className="flex items-center gap-2 w-full p-2 rounded-md bg-black/20 border border-white/[0.06] hover:border-white/[0.12] transition-colors"
        >
          {selectedScenario?.image_url ? (
            <img src={selectedScenario.image_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded bg-white/[0.04] flex items-center justify-center flex-shrink-0">
              <MapPin className="w-3.5 h-3.5 text-gray-600" />
            </div>
          )}
          <div className="text-left min-w-0 flex-1">
            <span className="text-[9px] text-gray-600 uppercase tracking-wider block">Cenário</span>
            <span className="text-[11px] text-gray-300 truncate block">
              {selectedScenario ? selectedScenario.name : 'Selecionar...'}
            </span>
          </div>
          {selectedScenario && (
            <button
              onClick={e => { e.stopPropagation(); setSelectedScenario(null); onScenarioChange?.(null); }}
              className="p-0.5 hover:bg-white/10 rounded"
            >
              <X className="w-3 h-3 text-gray-600" />
            </button>
          )}
        </button>
      </div>

      {/* Modal */}
      <Dialog open={modalType !== null} onOpenChange={open => { if (!open) setModalType(null); }}>
        <DialogContent className="bg-[#141420] border-white/[0.08] max-w-[520px] w-[95vw] max-h-[85vh] overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle className="text-gray-200 text-sm">
              {modalType === 'character' ? `👤 Personagens (${selectedChars.length}/${MAX_CHARACTERS})` : '🏔 Cenários'}
            </DialogTitle>
          </DialogHeader>

          {modalType === 'character' && selectedChars.length >= MAX_CHARACTERS && (
            <div className="text-[11px] text-amber-400/80 bg-amber-500/10 rounded-md px-3 py-2">
              Limite de {MAX_CHARACTERS} personagens atingido. Remova um para adicionar outro.
            </div>
          )}

          {showCreate ? (
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

              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nome"
                className="bg-black/20 border-white/[0.08] text-gray-300 text-[12px]"
              />
              <Textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Descrição..."
                rows={3}
                className="bg-black/20 border-white/[0.08] text-gray-300 text-[12px] resize-none"
              />

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowCreate(false); resetForm(); }}
                  className="flex-1 text-gray-400 text-[11px]"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || !newName.trim() || !newImage}
                  className="flex-1 bg-white/[0.08] hover:bg-white/[0.14] text-gray-200 text-[11px]"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Salvar'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <Button
                onClick={() => setShowCreate(true)}
                variant="outline"
                size="sm"
                className="w-full border-dashed border-white/[0.1] text-gray-400 text-[11px] hover:bg-white/[0.04]"
              >
                <Plus className="w-3 h-3 mr-1" />
                {modalType === 'character' ? 'Criar novo personagem' : 'Criar novo cenário'}
              </Button>

              {modalType === 'character' && selectedChars.length > 0 && (
                <Button
                  onClick={() => setModalType(null)}
                  size="sm"
                  className="w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[11px]"
                >
                  Confirmar seleção ({selectedChars.length})
                </Button>
              )}

              {loading ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                </div>
              ) : items.length === 0 ? (
                <p className="text-[11px] text-gray-600 text-center py-6">
                  Nenhum {modalType === 'character' ? 'personagem' : 'cenário'} salvo ainda.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {items.map(item => {
                    const isCharSelected = modalType === 'character' && selectedChars.some(c => c.id === item.id);
                    const isScenSelected = modalType === 'scenario' && selectedScenario?.id === item.id;
                    const isSelected = isCharSelected || isScenSelected;

                    return (
                      <div
                        key={item.id}
                        className={`relative rounded-lg overflow-hidden cursor-pointer transition-all group ${
                          isSelected
                            ? 'ring-2 ring-purple-500 ring-offset-1 ring-offset-[#141420]'
                            : 'hover:ring-1 hover:ring-white/20'
                        }`}
                        onClick={() => selectItem(item)}
                      >
                        <div className="aspect-square bg-white/[0.04] relative">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {modalType === 'character' ? <User className="w-5 h-5 text-gray-600" /> : <MapPin className="w-5 h-5 text-gray-600" />}
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                              <span className="text-[8px] text-white font-bold">✓</span>
                            </div>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(item.id, modalType!); }}
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
                  {/* Empty slots */}
                  {Array.from({ length: 20 - items.length }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="rounded-lg overflow-hidden border border-dashed border-white/[0.06]"
                    >
                      <div className="aspect-square bg-white/[0.02] flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full border border-white/[0.08]" />
                      </div>
                      <div className="px-1 py-1 bg-black/20">
                        <span className="text-[9px] text-gray-700 block text-center">—</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CharacterScenarioSection;
