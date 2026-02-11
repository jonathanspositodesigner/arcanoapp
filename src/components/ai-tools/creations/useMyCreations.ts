import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type MediaType = 'all' | 'image' | 'video';

export interface Creation {
  id: string;
  output_url: string;
  thumbnail_url: string | null;
  tool_name: string;
  media_type: 'image' | 'video';
  created_at: string;
  expires_at: string;
}

interface UseMyCreationsOptions {
  mediaType?: MediaType;
  pageSize?: number;
}

export function useMyCreations(options: UseMyCreationsOptions = {}) {
  const { mediaType = 'all', pageSize = 24 } = options;
  
  const [creations, setCreations] = useState<Creation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const fetchCreations = useCallback(async (reset = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const currentOffset = reset ? 0 : offset;
      
      const { data, error: rpcError } = await supabase.rpc('get_user_ai_creations', {
        p_media_type: mediaType,
        p_offset: currentOffset,
        p_limit: pageSize
      });
      
      if (rpcError) {
        throw new Error(rpcError.message);
      }
      
      // Filtrar itens expirados no client-side (para casos de race condition)
      const now = new Date();
      const validCreations = ((data || []) as Creation[]).filter(c => {
        const expiresAt = new Date(c.expires_at);
        return expiresAt.getTime() > now.getTime();
      });
      
      if (reset) {
        setCreations(validCreations);
        setOffset(pageSize);
      } else {
        // Também filtrar itens existentes que podem ter expirado
        setCreations(prev => {
          const filteredPrev = prev.filter(c => {
            const expiresAt = new Date(c.expires_at);
            return expiresAt.getTime() > now.getTime();
          });
          return [...filteredPrev, ...validCreations];
        });
        setOffset(prev => prev + pageSize);
      }
      
      setHasMore(validCreations.length === pageSize);
    } catch (err) {
      console.error('[useMyCreations] Error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar criações');
    } finally {
      setIsLoading(false);
    }
  }, [mediaType, offset, pageSize]);

  // Reset and fetch when mediaType changes
  useEffect(() => {
    setCreations([]);
    setOffset(0);
    setHasMore(true);
    fetchCreations(true);
  }, [mediaType]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchCreations(false);
    }
  }, [fetchCreations, isLoading, hasMore]);

  const refresh = useCallback(() => {
    setCreations([]);
    setOffset(0);
    setHasMore(true);
    fetchCreations(true);
  }, [fetchCreations]);

  const deleteCreation = useCallback(async (creationId: string) => {
    try {
      const { data, error: rpcError } = await supabase.rpc('delete_user_ai_creation', {
        p_creation_id: creationId
      });
      
      if (rpcError) throw new Error(rpcError.message);
      
      if (data) {
        setCreations(prev => prev.filter(c => c.id !== creationId));
        toast.success('Criação excluída com sucesso');
      } else {
        toast.error('Não foi possível excluir esta criação');
      }
      return !!data;
    } catch (err) {
      console.error('[useMyCreations] Delete error:', err);
      toast.error('Erro ao excluir criação');
      return false;
    }
  }, []);

  return {
    creations,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
    deleteCreation
  };
}
