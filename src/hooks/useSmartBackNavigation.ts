import { useNavigate } from "react-router-dom";
import { useCallback } from "react";

interface UseSmartBackNavigationOptions {
  fallback: string;
}

/**
 * Smart back navigation hook that uses browser history when available,
 * otherwise falls back to a specified route.
 * 
 * This ensures "Voltar" buttons return to the actual previous page
 * instead of a hardcoded route.
 */
export const useSmartBackNavigation = ({ fallback }: UseSmartBackNavigationOptions) => {
  const navigate = useNavigate();

  const goBack = useCallback(() => {
    // Check if there's a previous page in the history
    // React Router sets window.history.state.idx to track navigation index
    const historyIndex = typeof window !== 'undefined' 
      ? (window.history.state?.idx ?? 0) 
      : 0;

    if (historyIndex > 0) {
      // There's a previous page in history, go back to it
      navigate(-1);
    } else {
      // No previous page (fresh tab, direct access), use fallback
      navigate(fallback);
    }
  }, [navigate, fallback]);

  const canGoBack = typeof window !== 'undefined' 
    ? (window.history.state?.idx ?? 0) > 0 
    : false;

  return { goBack, canGoBack };
};
