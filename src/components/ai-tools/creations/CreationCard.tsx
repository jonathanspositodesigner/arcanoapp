import React, { useState } from 'react';
import { Download, Clock, Image as ImageIcon, Video, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Creation } from './useMyCreations';

interface CreationCardProps {
  creation: Creation;
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
  if (days >= 3) {
    urgency = 'safe';
  } else if (days >= 1) {
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

const CreationCard: React.FC<CreationCardProps> = ({ creation }) => {
  const [imageError, setImageError] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const { text: timeText, urgency } = formatTimeRemaining(creation.expires_at);
  const isVideo = creation.media_type === 'video';
  
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(creation.output_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${creation.tool_name.replace(/\s/g, '-')}-${creation.id.slice(0, 8)}.${isVideo ? 'mp4' : 'png'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[CreationCard] Download error:', error);
      // Fallback: open in new tab
      window.open(creation.output_url, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const urgencyColors = {
    safe: 'bg-green-500/20 text-green-400 border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    danger: 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse'
  };

  return (
    <Card className="overflow-hidden bg-purple-900/20 border-purple-500/30 hover:border-purple-500/50 transition-all group">
      {/* Media Preview */}
      <div className="relative aspect-square bg-purple-950/50 flex items-center justify-center overflow-hidden">
        {imageError ? (
          <div className="flex flex-col items-center gap-2 text-purple-400/60 p-4">
            <AlertCircle className="w-8 h-8" />
            <span className="text-xs text-center">Mídia indisponível ou expirada</span>
          </div>
        ) : isVideo ? (
          <video
            src={creation.output_url}
            className="w-full h-full object-contain"
            controls
            preload="metadata"
            onError={() => setImageError(true)}
          />
        ) : (
          <img
            src={creation.output_url}
            alt={`Criação ${creation.tool_name}`}
            className="w-full h-full object-contain"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        )}
        
        {/* Media type indicator */}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="bg-black/50 text-white text-[10px] gap-1">
            {isVideo ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
            {isVideo ? 'Vídeo' : 'Imagem'}
          </Badge>
        </div>
      </div>
      
      {/* Info Section */}
      <div className="p-3 space-y-2">
        {/* Expiration & Download */}
        <div className="flex items-center justify-between gap-2">
          <Badge 
            variant="outline" 
            className={cn("text-[10px] gap-1", urgencyColors[urgency])}
          >
            <Clock className="w-3 h-3" />
            {timeText}
          </Badge>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading || imageError}
            className="h-7 text-xs bg-purple-500/10 border-purple-500/30 text-purple-200 hover:bg-purple-500/20"
          >
            <Download className="w-3 h-3 mr-1" />
            {isDownloading ? '...' : 'Baixar'}
          </Button>
        </div>
        
        {/* Tool name & date */}
        <div className="text-[11px] text-purple-300/70 truncate">
          {creation.tool_name} • {formatDate(creation.created_at)}
        </div>
      </div>
    </Card>
  );
};

export default CreationCard;
