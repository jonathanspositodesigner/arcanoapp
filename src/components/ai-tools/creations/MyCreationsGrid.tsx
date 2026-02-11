import React, { useEffect, useRef, useCallback } from 'react';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import CreationCard from './CreationCard';
import type { Creation } from './useMyCreations';
import { useNavigate } from 'react-router-dom';

interface MyCreationsGridProps {
  creations: Creation[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  onDelete?: (id: string) => void;
}

const MyCreationsGrid: React.FC<MyCreationsGridProps> = ({
  creations,
  isLoading,
  error,
  hasMore,
  onLoadMore,
  onRetry,
  onDelete
}) => {
  const navigate = useNavigate();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll observer
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0.1
    });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver]);

  // Error state
  if (error && creations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <RefreshCw className="w-8 h-8 text-red-400" />
        </div>
        <p className="text-red-300 mb-2">Erro ao carregar criações</p>
        <p className="text-sm text-purple-300/60 mb-4">{error}</p>
        <Button 
          variant="outline" 
          onClick={onRetry}
          className="border-purple-500/30 text-purple-200 hover:bg-purple-500/10"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  // Empty state
  if (!isLoading && creations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 flex items-center justify-center mb-4">
          <Sparkles className="w-10 h-10 text-purple-400" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          Você ainda não tem criações
        </h3>
        <p className="text-sm text-purple-300/70 mb-6 max-w-sm">
          Gere algo em uma das ferramentas de IA para aparecer nesta lista.
        </p>
        <Button
          onClick={() => navigate('/upscaler-arcano')}
          className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:opacity-90 text-white"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Ir para Upscaler Arcano
        </Button>
      </div>
    );
  }

  // Loading skeleton (initial load)
  if (isLoading && creations.length === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-square w-full bg-purple-500/10" />
            <Skeleton className="h-4 w-3/4 bg-purple-500/10" />
            <Skeleton className="h-3 w-1/2 bg-purple-500/10" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {creations.map((creation) => (
          <CreationCard key={creation.id} creation={creation} onDelete={onDelete} />
        ))}
      </div>

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="h-4" />

      {/* Loading more indicator */}
      {isLoading && creations.length > 0 && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        </div>
      )}

      {/* End of list */}
      {!hasMore && creations.length > 0 && (
        <p className="text-center text-sm text-purple-300/50 py-4">
          Fim da lista
        </p>
      )}
    </div>
  );
};

export default MyCreationsGrid;
