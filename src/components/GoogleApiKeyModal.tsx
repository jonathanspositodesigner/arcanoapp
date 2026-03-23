import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, ExternalLink, Trash2, RefreshCw } from 'lucide-react';
import { useGoogleApiKey } from '@/hooks/useGoogleApiKey';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GoogleApiKeyModal({ open, onOpenChange }: Props) {
  const { hasKey, maskedKey, saveKey, removeKey, loading } = useGoogleApiKey();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const handleSave = async () => {
    if (!apiKeyInput.trim()) { setError('Digite sua chave API'); return; }
    setSaving(true);
    setError('');
    const result = await saveKey(apiKeyInput.trim());
    setSaving(false);
    if (result.success) {
      toast.success('✅ Chave API configurada com sucesso! Suas gerações agora são gratuitas.');
      setApiKeyInput('');
      setIsChanging(false);
      onOpenChange(false);
    } else {
      setError(result.error || 'Erro ao salvar');
    }
  };

  const handleRemove = async () => {
    const ok = await removeKey();
    if (ok) {
      toast.success('Chave removida. Suas gerações voltarão a usar créditos da plataforma.');
      setConfirmRemove(false);
      onOpenChange(false);
    } else {
      toast.error('Erro ao remover chave.');
    }
  };

  // Management view (key already exists)
  if (hasKey && !isChanging) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-[#1a1525] border-purple-500/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Sua API Key do Google</DialogTitle>
            <DialogDescription className="text-purple-400 text-sm">
              Gerencie sua chave de API pessoal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="px-3 py-2.5 rounded-lg bg-purple-900/30 border border-purple-500/20 font-mono text-sm text-purple-200 break-all">
              {maskedKey}
            </div>

            {confirmRemove ? (
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-900/20 space-y-2">
                <p className="text-sm text-red-300">Tem certeza? Suas gerações voltarão a usar créditos da plataforma.</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={handleRemove} className="text-xs">
                    Sim, remover
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmRemove(false)} className="text-xs border-purple-500/30 text-purple-200">
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setIsChanging(true); setApiKeyInput(''); }}
                  className="flex-1 border-purple-500/30 text-purple-200 hover:bg-purple-500/20 text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Trocar Chave API
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmRemove(true)}
                  className="border-red-500/30 text-red-300 hover:bg-red-500/20 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Registration / Change view
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setIsChanging(false); onOpenChange(v); }}>
      <DialogContent className="bg-[#1a1525] border-purple-500/30 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {isChanging ? 'Trocar Chave API' : 'Configure sua API Key do Google'}
          </DialogTitle>
          <DialogDescription className="text-purple-400 text-sm">
            {isChanging
              ? 'Insira sua nova chave de API do Google Cloud.'
              : 'Use seus créditos grátis do Google Cloud!'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {!isChanging && (
            <div className="p-3 rounded-lg bg-green-900/20 border border-green-500/20 text-sm text-green-200">
              Cadastre sua chave de API gratuita do Google Cloud e gere imagens e vídeos sem usar seus créditos da plataforma. 
              O Google oferece <strong>US$ 300 (~R$ 1.800) em créditos gratuitos</strong> para novos usuários.
            </div>
          )}

          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-fuchsia-400 hover:text-fuchsia-300 text-xs transition-colors"
          >
            Como obter minha chave API gratuita? <ExternalLink className="h-3 w-3" />
          </a>

          <div className="space-y-1.5">
            <Label className="text-purple-200 text-xs">Sua Google Cloud API Key</Label>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => { setApiKeyInput(e.target.value); setError(''); }}
                placeholder="AIzaSy..."
                className="bg-purple-900/20 border-purple-500/25 text-white pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-200"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && <p className="text-red-400 text-xs">❌ {error}</p>}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={saving || !apiKeyInput.trim()}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-sm font-semibold"
            >
              {saving ? 'Validando...' : 'Salvar e Ativar'}
            </Button>
            <Button
              variant="outline"
              onClick={() => { setIsChanging(false); onOpenChange(false); }}
              className="border-purple-500/30 text-purple-200 hover:bg-purple-500/20 text-sm"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
