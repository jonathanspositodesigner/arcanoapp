import { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

interface LibraryMeta {
  promptId?: string;
  promptType?: 'admin' | 'partner';
}

/**
 * Centralizes collaborator credit attribution logic across all AI tools.
 * 
 * Usage:
 *   const { referencePromptId, setFromLibrary, clear } = useCollaboratorAttribution();
 * 
 * - Call `setFromLibrary(meta)` when user selects an item from the library
 * - Call `clear()` when user uploads own image, removes reference, or clears form
 * - Pass `referencePromptId` to the job insert/invoke
 */
export function useCollaboratorAttribution() {
  const location = useLocation();

  // Initialize from navigation state (coming from biblioteca with partner prompt)
  const [referencePromptId, setReferencePromptId] = useState<string | null>(() => {
    const state = location.state as { prefillPromptId?: string; prefillPromptType?: string } | null;
    if (state?.prefillPromptType === 'partner' && state?.prefillPromptId) {
      return state.prefillPromptId;
    }
    return null;
  });

  /**
   * Set attribution from a library selection.
   * Only sets if the item is from a partner prompt; otherwise clears.
   */
  const setFromLibrary = useCallback((meta?: LibraryMeta | null) => {
    if (meta?.promptType === 'partner' && meta?.promptId) {
      setReferencePromptId(meta.promptId);
    } else {
      setReferencePromptId(null);
    }
  }, []);

  /**
   * Clear attribution — call on manual upload, reference removal, or form reset.
   */
  const clear = useCallback(() => {
    setReferencePromptId(null);
  }, []);

  return { referencePromptId, setFromLibrary, clear };
}