import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PromptItem {
  id: string;
  title: string;
  prompt: string;
  imageUrl: string;
  thumbnailUrl?: string;
  category?: string;
  isCommunity?: boolean;
  isExclusive?: boolean;
  isPremium?: boolean;
  referenceImages?: string[];
  tutorialUrl?: string;
  createdAt?: string;
  promptType?: 'admin' | 'community' | 'partner';
  clickCount?: number;
  bonusClicks?: number;
}

// Fisher-Yates shuffle - memoized with ref
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

interface UseOptimizedPromptsResult {
  allPrompts: PromptItem[];
  isLoading: boolean;
  error: string | null;
  getFilteredPrompts: (
    contentType: 'exclusive' | 'community',
    category: string
  ) => PromptItem[];
  refetch: () => void;
}

/**
 * Optimized hook for fetching and filtering prompts
 * 
 * Optimizations:
 * 1. Uses aggregated click counts from database function (not 295+ rows)
 * 2. Selects only necessary columns
 * 3. Memoizes shuffle operation with useRef
 * 4. Memoizes filtered results
 */
export function useOptimizedPrompts(): UseOptimizedPromptsResult {
  const [allPrompts, setAllPrompts] = useState<PromptItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Store shuffled array in ref to avoid reshuffling on every render
  const shuffledPromptsRef = useRef<PromptItem[]>([]);
  const lastPromptsLengthRef = useRef<number>(0);

  const fetchPrompts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel with optimized column selection
      const [communityResult, adminResult, partnerResult, clicksResult] = await Promise.all([
        // Only select needed columns
        supabase
          .from('community_prompts')
          .select('id, title, prompt, image_url, category, created_at, bonus_clicks')
          .eq('approved', true)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('admin_prompts')
          .select('id, title, prompt, image_url, thumbnail_url, category, is_premium, reference_images, tutorial_url, created_at, bonus_clicks')
          .order('created_at', { ascending: false }),
        
        supabase
          .from('partner_prompts')
          .select('id, title, prompt, image_url, thumbnail_url, category, is_premium, reference_images, tutorial_url, created_at, bonus_clicks')
          .eq('approved', true)
          .order('created_at', { ascending: false }),
        
        // Use aggregated function instead of fetching all rows
        supabase.rpc('get_prompt_click_counts')
      ]);

      // Check for errors
      if (communityResult.error) throw communityResult.error;
      if (adminResult.error) throw adminResult.error;
      if (partnerResult.error) throw partnerResult.error;
      
      // Build click counts map from aggregated data
      const clickCounts: Record<string, number> = {};
      if (clicksResult.data) {
        (clicksResult.data as { prompt_id: string; click_count: number }[]).forEach(d => {
          clickCounts[d.prompt_id] = d.click_count;
        });
      }

      // Map community prompts
      const communityPrompts: PromptItem[] = (communityResult.data || []).map(item => ({
        id: item.id,
        title: item.title,
        prompt: item.prompt,
        imageUrl: item.image_url,
        category: item.category,
        isCommunity: true,
        isPremium: false,
        createdAt: item.created_at || undefined,
        promptType: 'community' as const,
        clickCount: clickCounts[item.id] || 0,
        bonusClicks: item.bonus_clicks || 0
      }));

      // Map admin prompts
      const adminPrompts: PromptItem[] = (adminResult.data || []).map(item => ({
        id: item.id,
        title: item.title,
        prompt: item.prompt,
        imageUrl: item.image_url,
        thumbnailUrl: item.thumbnail_url || undefined,
        category: item.category,
        isExclusive: true,
        isPremium: item.is_premium || false,
        referenceImages: item.reference_images || [],
        tutorialUrl: item.tutorial_url || null,
        createdAt: item.created_at || undefined,
        promptType: 'admin' as const,
        clickCount: clickCounts[item.id] || 0,
        bonusClicks: item.bonus_clicks || 0
      }));

      // Map partner prompts
      const partnerPrompts: PromptItem[] = (partnerResult.data || []).map(item => ({
        id: item.id,
        title: item.title,
        prompt: item.prompt,
        imageUrl: item.image_url,
        thumbnailUrl: item.thumbnail_url || undefined,
        category: item.category,
        isExclusive: true,
        isPremium: item.is_premium || false,
        referenceImages: item.reference_images || [],
        tutorialUrl: item.tutorial_url || null,
        createdAt: item.created_at || undefined,
        promptType: 'partner' as const,
        clickCount: clickCounts[item.id] || 0,
        bonusClicks: item.bonus_clicks || 0
      }));

      // Combine and sort by date
      const combined = [...adminPrompts, ...partnerPrompts, ...communityPrompts].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      setAllPrompts(combined);
    } catch (err) {
      console.error('Error fetching prompts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load prompts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  // Update shuffled array only when prompts actually change
  useEffect(() => {
    if (allPrompts.length !== lastPromptsLengthRef.current) {
      const verTudoItems = allPrompts.filter(p => p.category !== "Controles de Câmera");
      shuffledPromptsRef.current = shuffleArray(verTudoItems);
      lastPromptsLengthRef.current = allPrompts.length;
    }
  }, [allPrompts]);

  // Memoized filter function
  const getFilteredPrompts = useCallback((
    contentType: 'exclusive' | 'community',
    category: string
  ): PromptItem[] => {
    // Filter by content type first
    const contentTypePrompts = contentType === 'exclusive' 
      ? allPrompts.filter(p => p.isExclusive) 
      : allPrompts.filter(p => p.isCommunity);

    // Sort functions
    const sortByClicks = (a: PromptItem, b: PromptItem) => {
      const clicksA = (a.clickCount || 0) + (a.bonusClicks || 0);
      const clicksB = (b.clickCount || 0) + (b.bonusClicks || 0);
      return clicksB - clicksA;
    };

    const sortByDate = (a: PromptItem, b: PromptItem) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    };

    // For "Ver Tudo" use memoized shuffle
    if (category === "Ver Tudo") {
      return contentType === 'exclusive'
        ? shuffledPromptsRef.current.filter(p => p.isExclusive)
        : shuffledPromptsRef.current.filter(p => p.isCommunity);
    }

    if (category === "Populares") {
      return contentTypePrompts
        .filter(p => p.category !== "Controles de Câmera")
        .sort(sortByClicks);
    }

    if (category === "Novos") {
      return contentTypePrompts
        .filter(p => p.category !== "Controles de Câmera")
        .sort(sortByDate)
        .slice(0, 16);
    }

    if (category === "Grátis") {
      return contentTypePrompts
        .filter(p => !p.isPremium && p.category !== "Controles de Câmera")
        .sort(sortByDate);
    }

    // Specific category
    return contentTypePrompts
      .filter(p => p.category === category)
      .sort(sortByDate);
  }, [allPrompts]);

  return {
    allPrompts,
    isLoading,
    error,
    getFilteredPrompts,
    refetch: fetchPrompts
  };
}
