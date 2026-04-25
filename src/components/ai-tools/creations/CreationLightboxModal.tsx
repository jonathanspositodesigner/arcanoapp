import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Trash2, Wand2, Sparkles, Video as VideoIcon, Maximize2, Loader2 } from 'lucide-react';
import { useResilientDownload } from '@/hooks/useResilientDownload';
import { toast } from 'sonner';
import { urlToFile } from '@/lib/urlToFile';
import type { Creation } from './useMyCreations';

interface CreationLightboxModalProps {
  creation: Creation | null;
  open: boolean;
  onClose: () => void;
  onDelete?: (id: string) => Promise<boolean> | void;
}

const CreationLightboxModal: React.FC<CreationLightboxModalProps> = ({
  creation,
  open,
  onClose,
  onDelete,
}) => {
  const navigate = useNavigate();
  const { download, isDownloading } = useResilientDownload();
  const [navigating, setNavigating] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!creation) return null;
  const isVideo = creation.media_type === 'video';

  const getProxiedUrl = (url: string): string => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) return url;
    if (url.includes('supabase.co')) return url;
    return `${supabaseUrl}/functions/v1/download-proxy?url=${encodeURIComponent(url)}`;
  };

  const handleDownload = () => {
    download({
      url: creation.output_url,
      filename: `${creation.tool_name.replace(/\s/g, '-')}-${creation.id.slice(0, 8)}.${isVideo ? 'mp4' : 'png'}`,
      mediaType: isVideo ? 'video' : 'image',
      timeout: 20000,
      locale: 'pt',
    });
  };

  const handleDelete = async () => {
    if (!onDelete || isDeleting) return;
    setIsDeleting(true);
    const ok = await onDelete(creation.id);
    setIsDeleting(false);
    if (ok !== false) onClose();
  };

  // Pré-valida (sem baixar arquivo) e navega passando a URL como state.
  // O File real é construído na ferramenta de destino, em background.
  const goToToolWithUrl = (path: string, mode: 'image' | 'video', extra: Record<string, any> = {}) => {
    setNavigating(path);
    try {
      navigate(path, {
        state: {
          [mode === 'image' ? 'prefillImageUrl' : 'prefillVideoUrl']: creation.output_url,
          prefillSourceTool: creation.tool_name,
          ...extra,
        },
      });
      onClose();
    } catch (err) {
      console.error('[Lightbox] Navigation error:', err);
      toast.error('Não foi possível abrir a ferramenta');
      setNavigating(null);
    }
  };

  const handleUpscale = () => {
    if (isVideo) goToToolWithUrl('/video-upscaler-tool', 'video');
    else goToToolWithUrl('/upscaler-arcano-tool', 'image');
  };

  const handleModify = () => goToToolWithUrl('/gerar-imagem', 'image');
  const handleGenerateVideo = () =>
    goToToolWithUrl('/gerar-video', 'image', { prefillModel: 'veo3.1-fast' });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 gap-0 bg-background border-border overflow-hidden">
        {/* Mídia */}
        <div className="relative bg-black flex items-center justify-center max-h-[70vh] min-h-[300px]">
          {isVideo ? (
            <video
              src={getProxiedUrl(creation.output_url)}
              controls
              autoPlay
              playsInline
              className="max-h-[70vh] w-auto max-w-full"
            />
          ) : (
            <img
              src={getProxiedUrl(creation.output_url)}
              alt={creation.tool_name}
              className="max-h-[70vh] w-auto max-w-full object-contain"
            />
          )}
        </div>

        {/* Ações */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{creation.tool_name}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(creation.created_at).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={isDownloading}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              {isDownloading ? 'Baixando...' : 'Baixar'}
            </Button>

            <Button
              variant="outline"
              onClick={handleUpscale}
              disabled={!!navigating}
              className="gap-2 border-primary/40 text-foreground hover:bg-primary/10"
            >
              {navigating?.includes('upscaler') ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
              Fazer Upscale
            </Button>

            {!isVideo && (
              <>
                <Button
                  variant="outline"
                  onClick={handleModify}
                  disabled={!!navigating}
                  className="gap-2 border-purple-400/40 text-foreground hover:bg-purple-500/10"
                >
                  {navigating === '/gerar-imagem' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  Modificar
                </Button>

                <Button
                  variant="outline"
                  onClick={handleGenerateVideo}
                  disabled={!!navigating}
                  className="gap-2 border-blue-400/40 text-foreground hover:bg-blue-500/10"
                >
                  {navigating === '/gerar-video' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <VideoIcon className="w-4 h-4" />
                  )}
                  Gerar Vídeo
                </Button>
              </>
            )}

            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-2 border-red-400/40 text-red-300 hover:bg-red-500/10 col-span-2 sm:col-span-1"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreationLightboxModal;