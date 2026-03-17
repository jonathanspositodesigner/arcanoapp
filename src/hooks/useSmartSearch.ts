import { useState, useEffect, useMemo } from 'react';
import { expandSearchTerms } from '@/lib/synonyms';

interface UseSmartSearchResult {
  /** The raw search term (for controlled input) */
  searchTerm: string;
  /** Setter for the search input */
  setSearchTerm: (term: string) => void;
  /** Debounced version of searchTerm */
  debouncedSearch: string;
  /** Expanded list of search terms including synonyms */
  expandedTerms: string[];
  /** Whether a search is active */
  isSearching: boolean;
}

/**
 * Reusable smart search hook with debounce + synonym expansion.
 * Use in any library/modal that needs intelligent search.
 *
 * @param debounceMs - debounce delay in ms (default 300)
 */
export function useSmartSearch(debounceMs = 300): UseSmartSearchResult {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), debounceMs);
    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  const expandedTerms = useMemo(
    () => (debouncedSearch.trim() ? expandSearchTerms(debouncedSearch) : []),
    [debouncedSearch],
  );

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearch,
    expandedTerms,
    isSearching: debouncedSearch.trim().length > 0,
  };
}

/**
 * Build a Supabase `.or()` filter string from expanded terms.
 * Works for any table that has title + optional tags/category columns.
 *
 * @param terms - expanded search terms from useSmartSearch
 * @param fields - columns to search in (default: title + category)
 * @param tagField - array column name for `.cs` filter (optional)
 */
export function buildSmartSearchFilter(
  terms: string[],
  fields: string[] = ['title'],
  tagField?: string,
): string {
  if (terms.length === 0) return '';

  const filters: string[] = [];

  for (const term of terms) {
    for (const field of fields) {
      filters.push(`${field}.ilike.%${term}%`);
    }
    if (tagField) {
      filters.push(`${tagField}.cs.{${term}}`);
    }
  }

  return filters.join(',');
}
