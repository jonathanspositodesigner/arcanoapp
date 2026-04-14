import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, MapPin, Loader2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import CharacterPicker, { type CharacterItem } from '@/components/shared/CharacterPicker';

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

const CharacterScenarioSection: React.FC<Props> = ({ settings, updateSettings, onCharactersChange, onScenarioChange }) => {
  const [scenarioModalOpen, setScenarioModalOpen] = useState(false);
  const [scenarios, setScenarios] = useState<SavedItem[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<SavedItem | null>(null);
  const [selectedChars, setSelectedChars] = useState<CharacterItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Scenario create form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newImage, setNewImage] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchScenarios = async () => {
    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) { setLoading(false); return; }
    const { data } = await supabase
      .from('cinema_scenarios')
      .select('*')
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false });
    if (data) setScenarios(data);
    setLoading(false);
  };

  useEffect(() => { fetchScenarios(); }, []);

  const resetForm = () => {
    if (newImagePreview) URL.revokeObjectURL(newImagePreview);
    setNewName(''); setNewDesc(''); setNewImage(null); setNewImagePreview('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (newImagePreview) URL.revokeObjectURL(newImagePreview);
    setNewImage(file);
    setNewImagePreview(URL.createObjectURL(file));
  };

  const handleSaveScenario = async () => {
    if (!newName.trim()) { toast.error('Nome é obrigatório'); return; }
    if (!newImage) { toast.error('Imagem é obrigatória'); return; }
    if (scenarios.length >= 20) { toast.error('Limite de 20 cenários atingido.'); return; }

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
      if (!urlData.publicUrl) {
        await supabase.storage.from('cinema-assets').remove([uploadedPath]);
        toast.error('Erro ao obter URL.'); return;
      }

      const { error } = await supabase.from('cinema_scenarios').insert({
        user_id: user.id, name: newName.trim(), description: newDesc.trim() || null, image_url: urlData.publicUrl,
      });
      if (error) {
        await supabase.storage.from('cinema-assets').remove([uploadedPath]);
        toast.error('Erro ao salvar cenário.'); return;
      }

      toast.success('Cenário criado!');
      await fetchScenarios();
      setShowCreate(false);
      resetForm();
    } catch {
      if (uploadedPath) await supabase.storage.from('cinema-assets').remove([uploadedPath]);
      toast.error('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteScenario = async (id: string) => {
    await supabase.from('cinema_scenarios').delete().eq('id', id);
    if (selectedScenario?.id === id) { setSelectedScenario(null); onScenarioChange?.(null); }
    await fetchScenarios();
    toast.success('Cenário removido!');
  };

  const selectScenario = (item: SavedItem) => {
    const isSame = selectedScenario?.id === item.id;
    const newVal = isSame ? null : item;
    setSelectedScenario(newVal);
    onScenarioChange?.(newVal);
    setScenarioModalOpen(false);
  };

  const handleCharactersChange = (chars: CharacterItem[]) => {
    setSelectedChars(chars);
    onCharactersChange?.(chars);
    const descriptions = chars.map(c => c.description).filter(Boolean).join('; ');
    updateSettings({ subject: descriptions });
  };

  return (
    <>
      <div className="space-y-1.5">
        {/* Character Picker (shared component) */}
        <CharacterPicker
          selectedCharacters={selectedChars}
          onCharactersChange={handleCharactersChange}
          maxCharacters={3}
        />

        {/* Cenário selector */}
        <button
          onClick={() => { setScenarioModalOpen(true); setShowCreate(false); resetForm(); }}
          className="flex items-center gap-2 w-full p-2 rounded-md bg-black/20 border border-white/[0.06] hover:border-white/[0.12] transition-colors"
        >
          {selectedScenario?.image_url ? (
            <img src={selectedScenario.image_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded bg-white/[0.04] flex items-center justify-center flex-shrink-0">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          )}
          <div className="text-left min-w-0 flex-1">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider block">Cenário</span>
            <span className="text-[11px] text-muted-foreground truncate block">
              {selectedScenario ? selectedScenario.name : 'Selecionar...'}
            </span>
          </div>
          {selectedScenario && (
            <button
              onClick={e => { e.stopPropagation(); setSelectedScenario(null); onScenarioChange?.(null); }}
              className="p-0.5 hover:bg-accent rounded"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </button>
      </div>

      {/* Scenario Modal */}
      <Dialog open={scenarioModalOpen} onOpenChange={open => { if (!open) setScenarioModalOpen(false); }}>
        <DialogContent className="bg-background border-white/[0.08] max-w-[520px] w-[95vw] max-h-[85vh] overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle className="text-gray-200 text-sm">🏔 Cenários</DialogTitle>
          </DialogHeader>

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
                    <Plus className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                    <span className="text-[10px] text-muted-foreground">Adicionar imagem</span>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome" className="bg-black/20 border-white/[0.08] text-muted-foreground text-[12px]" />
              <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Descrição..." rows={3} className="bg-black/20 border-white/[0.08] text-muted-foreground text-[12px] resize-none" />
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setShowCreate(false); resetForm(); }} className="flex-1 text-muted-foreground text-[11px]">Cancelar</Button>
                <Button size="sm" onClick={handleSaveScenario} disabled={saving || !newName.trim() || !newImage} className="flex-1 bg-white/[0.08] hover:bg-white/[0.14] text-gray-200 text-[11px]">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Salvar'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <Button onClick={() => setShowCreate(true)} variant="outline" size="sm" className="w-full border-dashed border-white/[0.1] text-muted-foreground text-[11px] hover:bg-white/[0.04]">
                <Plus className="w-3 h-3 mr-1" />
                Criar novo cenário
              </Button>

              {loading ? (
                <div className="py-8 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
              ) : scenarios.length === 0 ? (
                <p className="text-[11px] text-muted-foreground text-center py-6">Nenhum cenário salvo ainda.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {scenarios.map(item => {
                    const isSelected = selectedScenario?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`relative rounded-lg overflow-hidden cursor-pointer transition-all group ${
                          isSelected ? 'ring-2 ring-slate-500 ring-offset-1 ring-offset-[#141420]' : 'hover:ring-1 hover:ring-white/20'
                        }`}
                        onClick={() => selectScenario(item)}
                      >
                        <div className="aspect-square bg-white/[0.04] relative">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <MapPin className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-accent0 flex items-center justify-center">
                              <span className="text-[8px] text-white font-bold">✓</span>
                            </div>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteScenario(item.id); }}
                            className="absolute top-1 left-1 p-0.5 rounded bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-2.5 h-2.5 text-red-400" />
                          </button>
                        </div>
                        <div className="px-1 py-1 bg-black/40">
                          <span className="text-[9px] text-muted-foreground font-medium block truncate text-center">{item.name}</span>
                        </div>
                      </div>
                    );
                  })}
                  {Array.from({ length: 20 - scenarios.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="rounded-lg overflow-hidden border border-dashed border-white/[0.06]">
                      <div className="aspect-square bg-white/[0.02] flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full border border-white/[0.08]" />
                      </div>
                      <div className="px-1 py-1 bg-black/20">
                        <span className="text-[9px] text-muted-foreground block text-center">—</span>
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
