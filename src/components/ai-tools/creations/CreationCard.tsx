import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Clock, Image as ImageIcon, Video, AlertCircle, Trash2, Wand2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useResilientDownload } from '@/hooks/useResilientDownload';
import type { Creation } from './useMyCreations';

interface CreationCardProps {
  creation: Creation;
  onDelete?: (id: string) => void;
  onOpen?: (creation: Creation) => void;
}

function formatTimeRemaining(expiresAt: string): { text: string; urgency: 'safe' | 'warning' | 'danger' } {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return { text: 'Expirado', urgency: 'danger' };
  }
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  let text: string;
  if (days > 0) {
    text = `${days}d ${remainingHours}h`;
  } else if (hours > 0) {
    text = `${hours}h`;
  } else {
    const minutes = Math.floor(diffMs / (1000 * 60));
    text = `${minutes}m`;
  }
  
  let urgency: 'safe' | 'warning' | 'danger';
  if (hours >= 12) {
    urgency = 'safe';
  } else if (hours >= 4) {
    urgency = 'warning';
  } else {
    urgency = 'danger';
  }
  
  return { text, urgency };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const CreationCard: React.FC<CreationCardProps> = ({ creation, onDelete, onOpen }) => {
  const [imageError, setImageError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { download, isDownloading } = useResilientDownload();
  
  const { text: timeText, urgency } = formatTimeRemaining(creation.expires_at);
  const isVideo = creation.media_type === 'video';
  const isFlyerMaker = creation.tool_name === 'Flyer Maker';

  const handleModify = () => {
    const imageUrl = creation.thumbnail_url || creation.output_url;
    navigate('/flyer-maker', { state: { refineImageUrl: imageUrl } });
  };
  
  // Função para obter URL de preview via proxy quando necessário
  const getProxiedUrl = (url: string): string => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) return url;
    if (url.includes('supabase.co')) return url;
    return `${supabaseUrl}/functions/v1/download-proxy?url=${encodeURIComponent(url)}`;
  };

  const getPreviewUrl = (): string => {
    if (creation.thumbnail_url) {
      return creation.thumbnail_url;
    }
    return getProxiedUrl(creation.output_url);
  };

  // For videos: use actual output_url (proxied if needed), thumbnail as poster
  const videoSrc = isVideo ? getProxiedUrl(creation.output_url) : '';
  const videoPoster = isVideo && creation.thumbnail_url ? creation.thumbnail_url : undefined;
  const previewUrl = getPreviewUrl();
  
  // Download usando hook resiliente (funciona no Safari)
  const handleDownload = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    download({
      url: creation.output_url,
      filename: `${creation.tool_name.replace(/\s/g, '-')}-${creation.id.slice(0, 8)}.${isVideo ? 'mp4' : 'png'}`,
      mediaType: isVideo ? 'video' : 'image',
      timeout: 15000,
      locale: 'pt'
    });
  };

  const handleDelete = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!onDelete || isDeleting) return;
    setIsDeleting(true);
    await onDelete(creation.id);
    setIsDeleting(false);
  };

  const urgencyColors = {
    safe: 'bg-green-500/30 text-green-300 border-green-400/40',
    warning: 'bg-yellow-500/30 text-yellow-300 border-yellow-400/40',
    danger: 'bg-red-500/30 text-red-300 border-red-400/40 animate-pulse'
  };

  return (
    <div
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={() => onOpen?.(creation)}
      onKeyDown={(e) => {
        if (onOpen && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onOpen(creation);
        }
      }}
      className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-accent hover:border-primary/40 transition-all cursor-pointer"
    >
      {/* Media — full bleed */}
      {imageError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground p-4">
          <AlertCircle className="w-8 h-8" />
          <span className="text-xs text-center">Mídia indisponível</span>
        </div>
      ) : isVideo ? (
        <>
          <video
            src={videoSrc}
            poster={videoPoster}
            className="absolute inset-0 w-full h-full object-cover"
            preload="metadata"
            muted
            playsInline
            onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
            onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
            onError={() => setImageError(true)}
          />
          {/* Play indicator visible when not hovering */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-6 h-6 text-white fill-white" />
            </div>
          </div>
        </>
      ) : (
        <img
          src={previewUrl}
          alt={`Criação ${creation.tool_name}`}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={() => setImageError(true)}
        />
      )}

      {/* Top badges — always visible */}
      <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2 pointer-events-none">
        <Badge variant="secondary" className="bg-black/60 backdrop-blur-sm text-white text-[10px] gap-1 border-white/10">
          {isVideo ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
          {isVideo ? 'Vídeo' : 'Imagem'}
        </Badge>
        <Badge
          variant="outline"
          className={cn("text-[10px] gap-1 backdrop-blur-sm", urgencyColors[urgency])}
        >
          <Clock className="w-3 h-3" />
          {timeText}
        </Badge>
      </div>

      {/* Hover overlay — actions + info */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3 gap-2">
        {/* Tool & date */}
        <div className="text-white">
          <p className="text-xs font-medium truncate">{creation.tool_name}</p>
          <p className="text-[10px] text-white/60">{formatDate(creation.created_at)}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading || imageError}
            className="flex-1 h-8 text-xs bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm"
            title="Baixar"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            {isDownloading ? '...' : 'Baixar'}
          </Button>
          {isFlyerMaker && !isVideo && (
          <Button
              variant="outline"
              size="sm"
            onClick={(e) => { e.stopPropagation(); handleModify(); }}
              className="h-8 w-8 p-0 bg-purple-500/30 hover:bg-purple-500/50 border-purple-400/40 text-white backdrop-blur-sm"
              title="Modificar"
            >
              <Wand2 className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="h-8 w-8 p-0 bg-red-500/30 hover:bg-red-500/50 border-red-400/40 text-white backdrop-blur-sm"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreationCard;
