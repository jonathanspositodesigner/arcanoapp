import { useState, useEffect, useCallback } from 'react';

interface ImportProgress {
  isImporting: boolean;
  progress: number;
  total: number;
  current: number;
}

const STORAGE_KEY = 'import_progress';

// Broadcast channel for cross-tab communication
const channel = typeof BroadcastChannel !== 'undefined' 
  ? new BroadcastChannel('import_progress_channel') 
  : null;

export const useImportProgress = () => {
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    isImporting: false,
    progress: 0,
    total: 0,
    current: 0
  });

  // Listen for updates from other components/tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          setImportProgress(data);
        } catch {}
      }
    };

    const handleBroadcast = (e: MessageEvent) => {
      if (e.data?.type === 'import_progress') {
        setImportProgress(e.data.payload);
      }
    };

    // Check initial state
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        // Only restore if import is in progress
        if (data.isImporting) {
          setImportProgress(data);
        }
      } catch {}
    }

    window.addEventListener('storage', handleStorage);
    channel?.addEventListener('message', handleBroadcast);

    return () => {
      window.removeEventListener('storage', handleStorage);
      channel?.removeEventListener('message', handleBroadcast);
    };
  }, []);

  const updateProgress = useCallback((progress: ImportProgress) => {
    setImportProgress(progress);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    channel?.postMessage({ type: 'import_progress', payload: progress });
  }, []);

  const startImport = useCallback((total: number) => {
    const progress: ImportProgress = {
      isImporting: true,
      progress: 0,
      total,
      current: 0
    };
    updateProgress(progress);
  }, [updateProgress]);

  const setProgress = useCallback((current: number, total: number) => {
    const progress: ImportProgress = {
      isImporting: true,
      progress: Math.round((current / total) * 100),
      total,
      current
    };
    updateProgress(progress);
  }, [updateProgress]);

  const finishImport = useCallback(() => {
    const progress: ImportProgress = {
      isImporting: false,
      progress: 100,
      total: 0,
      current: 0
    };
    updateProgress(progress);
    // Clear after a short delay
    setTimeout(() => {
      localStorage.removeItem(STORAGE_KEY);
    }, 3000);
  }, [updateProgress]);

  return {
    ...importProgress,
    startImport,
    setProgress,
    finishImport
  };
};
