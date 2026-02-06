import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type MediaType = 'all' | 'image' | 'video';

export interface Creation {
  id: string;
  output_url: string;
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
      
      const newCreations = (data || []) as Creation[];
      
      if (reset) {
        setCreations(newCreations);
        setOffset(pageSize);
      } else {
        setCreations(prev => [...prev, ...newCreations]);
        setOffset(prev => prev + pageSize);
      }
      
      setHasMore(newCreations.length === pageSize);
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

  return {
    creations,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh
  };
}
