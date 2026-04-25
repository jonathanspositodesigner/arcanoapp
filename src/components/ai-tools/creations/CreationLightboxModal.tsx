import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Download, Trash2, Wand2, Video as VideoIcon, Maximize2, Loader2, X } from 'lucide-react';
import { useResilientDownload } from '@/hooks/useResilientDownload';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
      <DialogPortal>
        <DialogOverlay className="bg-black/95" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex items-center justify-center outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          onClick={onClose}
        >
          {/* Mídia em tela cheia */}
          {isVideo ? (
            <video
              src={getProxiedUrl(creation.output_url)}
              controls
              autoPlay
              playsInline
              onClick={(e) => e.stopPropagation()}
              className="max-h-[100vh] max-w-[100vw] object-contain"
            />
          ) : (
            <img
              src={getProxiedUrl(creation.output_url)}
              alt={creation.tool_name}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[100vh] max-w-[100vw] object-contain"
            />
          )}

          {/* Botão fechar (X) flutuante */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white backdrop-blur-md flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Barra de ações flutuante translúcida sobre a imagem */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-2 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-lg max-w-[95vw]"
          >
            <ActionIcon
              label={isDownloading ? 'Baixando...' : 'Baixar'}
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </ActionIcon>

            <ActionIcon
              label="Fazer Upscale"
              onClick={handleUpscale}
              disabled={!!navigating}
            >
              {navigating?.includes('upscaler') ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </ActionIcon>

            {!isVideo && (
              <>
                <ActionIcon label="Modificar" onClick={handleModify} disabled={!!navigating}>
                  {navigating === '/gerar-imagem' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                </ActionIcon>

                <ActionIcon label="Gerar Vídeo" onClick={handleGenerateVideo} disabled={!!navigating}>
                  {navigating === '/gerar-video' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <VideoIcon className="w-4 h-4" />
                  )}
                </ActionIcon>
              </>
            )}

            <span className="w-px h-5 bg-white/15 mx-0.5" />

            <ActionIcon
              label="Excluir"
              onClick={handleDelete}
              disabled={isDeleting}
              danger
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </ActionIcon>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

interface ActionIconProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}

const ActionIcon: React.FC<ActionIconProps> = ({ label, onClick, disabled, danger, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
    className={cn(
      'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
      'text-white/80 hover:text-white hover:bg-white/10',
      danger && 'hover:bg-red-500/30 hover:text-red-200',
      disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent'
    )}
  >
    {children}
  </button>
);

export default CreationLightboxModal;