import React, { useState, useEffect } from 'react';
import { Save, FolderOpen, Trash2, Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CinemaSettings } from '@/utils/cinemaPromptBuilder';
import type { StudioMode } from '@/hooks/useCinemaStudio';

interface SavedConfig {
  id: string;
  name: string;
  mode: string;
  settings: CinemaSettings;
  created_at: string;
}

interface Props {
  mode: StudioMode;
  settings: CinemaSettings;
  onLoad: (settings: Partial<CinemaSettings>) => void;
}

const MAX_CONFIGS = 20;

const SavedConfigsSection: React.FC<Props> = ({ mode, settings, onLoad }) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [configs, setConfigs] = useState<SavedConfig[]>([]);
  const [configName, setConfigName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchConfigs = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('cinema_saved_configs')
      .select('*')
      .eq('user_id', user.id)
      .eq('mode', mode)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setConfigs(data.map(d => ({ ...d, settings: d.settings as unknown as CinemaSettings })));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (showLoadDialog) fetchConfigs();
  }, [showLoadDialog, mode]);

  const handleSave = async () => {
    if (!configName.trim()) { toast.error('Digite um nome'); return; }
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Faça login primeiro'); setSaving(false); return; }

    // Check limit
    const { count } = await supabase
      .from('cinema_saved_configs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('mode', mode);

    if ((count ?? 0) >= MAX_CONFIGS) {
      toast.error(`Limite de ${MAX_CONFIGS} configurações atingido`);
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('cinema_saved_configs').insert([{
      user_id: user.id,
      name: configName.trim(),
      mode,
      settings: JSON.parse(JSON.stringify(settings)),
    }]);

    if (error) {
      toast.error('Erro ao salvar');
    } else {
      toast.success('Configuração salva!');
      setConfigName('');
      setShowSaveDialog(false);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from('cinema_saved_configs').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir');
    } else {
      setConfigs(prev => prev.filter(c => c.id !== id));
      toast.success('Excluída');
    }
    setDeletingId(null);
  };

  const handleLoad = (config: SavedConfig) => {
    onLoad(config.settings);
    setShowLoadDialog(false);
    toast.success(`"${config.name}" carregada`);
  };

  return (
    <>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => setShowSaveDialog(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[10px] font-medium text-gray-400 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
        >
          <Save className="w-3 h-3" /> Salvar Configuração
        </button>
        <button
          onClick={() => setShowLoadDialog(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[10px] font-medium text-gray-400 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
        >
          <FolderOpen className="w-3 h-3" /> Usar Configuração
        </button>
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="bg-[#12121a] border-white/[0.06] max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="text-sm text-gray-200">
              Salvar Configuração ({mode === 'photo' ? 'Foto' : 'Vídeo'})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input
              value={configName}
              onChange={e => setConfigName(e.target.value.slice(0, 40))}
              placeholder="Nome da configuração..."
              className="bg-black/30 border-white/[0.06] text-gray-300 text-xs h-8"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <Button
              onClick={handleSave}
              disabled={saving || !configName.trim()}
              size="sm"
              className="w-full h-8 text-[11px] bg-white/[0.08] hover:bg-white/[0.14] text-gray-200 border-0"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Load Dialog */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent className="bg-[#12121a] border-white/[0.06] max-w-[420px] max-h-[70vh]">
          <DialogHeader>
            <DialogTitle className="text-sm text-gray-200">
              Configurações Salvas ({mode === 'photo' ? 'Foto' : 'Vídeo'})
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[50vh] space-y-1.5 pt-1" style={{ scrollbarWidth: 'none' }}>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
              </div>
            ) : configs.length === 0 ? (
              <p className="text-[11px] text-gray-600 text-center py-8">Nenhuma configuração salva</p>
            ) : (
              configs.map(config => (
                <div
                  key={config.id}
                  className="flex items-center gap-2 p-2.5 rounded-md bg-white/[0.03] hover:bg-white/[0.06] transition-colors group cursor-pointer"
                  onClick={() => handleLoad(config)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-300 font-medium truncate">{config.name}</p>
                    <p className="text-[9px] text-gray-600">
                      {new Date(config.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(config.id); }}
                    className="p-1 rounded hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    {deletingId === config.id
                      ? <Loader2 className="w-3 h-3 animate-spin text-gray-500" />
                      : <Trash2 className="w-3 h-3 text-red-400/60" />
                    }
                  </button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SavedConfigsSection;
