import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ImportJob {
  id: string;
  status: 'running' | 'paused' | 'cancelled' | 'completed';
  total_records: number;
  processed_records: number;
  created_records: number;
  updated_records: number;
  skipped_records: number;
  error_count: number;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface ImportProgress {
  isImporting: boolean;
  isPaused: boolean;
  isReconnecting: boolean;
  progress: number;
  total: number;
  current: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  jobId: string | null;
}

// Time in ms before considering a job "stuck"
const STUCK_THRESHOLD_MS = 45000;
// How often to check for stuck jobs
const WATCHDOG_INTERVAL_MS = 15000;

export const useImportProgress = () => {
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    isImporting: false,
    isPaused: false,
    isReconnecting: false,
    progress: 0,
    total: 0,
    current: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    jobId: null
  });

  const watchdogRef = useRef<NodeJS.Timeout | null>(null);
  const lastReconnectRef = useRef<number>(0);

  const updateFromJob = useCallback((job: ImportJob) => {
    const progress = job.total_records > 0 
      ? Math.round((job.processed_records / job.total_records) * 100) 
      : 0;

    setImportProgress(prev => ({
      ...prev,
      isImporting: job.status === 'running' || job.status === 'paused',
      isPaused: job.status === 'paused',
      isReconnecting: false,
      progress,
      total: job.total_records,
      current: job.processed_records,
      created: job.created_records,
      updated: job.updated_records,
      skipped: job.skipped_records,
      errors: job.error_count,
      jobId: job.id
    }));

    // Clear state if completed or cancelled
    if (job.status === 'completed' || job.status === 'cancelled') {
      setTimeout(() => {
        setImportProgress({
          isImporting: false,
          isPaused: false,
          isReconnecting: false,
          progress: 0,
          total: 0,
          current: 0,
          created: 0,
          updated: 0,
          skipped: 0,
          errors: 0,
          jobId: null
        });
      }, 3000);
    }
  }, []);

  // Watchdog: Re-invoke edge function if job is stuck
  const checkAndReconnect = useCallback(async (jobId: string) => {
    // Prevent multiple reconnects in quick succession
    const now = Date.now();
    if (now - lastReconnectRef.current < 10000) {
      return;
    }

    try {
      const { data: job } = await supabase
        .from('import_jobs')
        .select('updated_at, status, processed_records, total_records')
        .eq('id', jobId)
        .single();

      if (!job) return;

      // Skip if job is not running
      if (job.status !== 'running') return;

      // Check if job is stuck (no update for STUCK_THRESHOLD_MS)
      const lastUpdate = new Date(job.updated_at).getTime();
      const timeSinceUpdate = now - lastUpdate;

      if (timeSinceUpdate > STUCK_THRESHOLD_MS) {
        console.log(`Job ${jobId} appears stuck (${Math.round(timeSinceUpdate / 1000)}s since last update), re-invoking edge function...`);
        
        lastReconnectRef.current = now;
        setImportProgress(prev => ({ ...prev, isReconnecting: true }));

        await supabase.functions.invoke('process-import-job', {
          body: { job_id: jobId }
        });

        // Reset reconnecting state after a short delay
        setTimeout(() => {
          setImportProgress(prev => ({ ...prev, isReconnecting: false }));
        }, 2000);
      }
    } catch (err) {
      console.error('Watchdog check failed:', err);
    }
  }, []);

  // Fetch active job on mount
  useEffect(() => {
    const fetchActiveJob = async () => {
      const { data } = await supabase
        .from('import_jobs')
        .select('*')
        .in('status', ['running', 'paused'])
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        updateFromJob(data as ImportJob);
      }
    };

    fetchActiveJob();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('import_jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'import_jobs'
        },
        (payload) => {
          if (payload.new) {
            updateFromJob(payload.new as ImportJob);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [updateFromJob]);

  // Watchdog effect: check if job is stuck and needs to be re-invoked
  useEffect(() => {
    // Clear any existing watchdog
    if (watchdogRef.current) {
      clearInterval(watchdogRef.current);
      watchdogRef.current = null;
    }

    // Only run watchdog if we have an active, non-paused job
    if (!importProgress.jobId || importProgress.isPaused || !importProgress.isImporting) {
      return;
    }

    // Initial check after a short delay
    const initialCheck = setTimeout(() => {
      checkAndReconnect(importProgress.jobId!);
    }, 5000);

    // Set up recurring watchdog
    watchdogRef.current = setInterval(() => {
      checkAndReconnect(importProgress.jobId!);
    }, WATCHDOG_INTERVAL_MS);

    return () => {
      clearTimeout(initialCheck);
      if (watchdogRef.current) {
        clearInterval(watchdogRef.current);
        watchdogRef.current = null;
      }
    };
  }, [importProgress.jobId, importProgress.isPaused, importProgress.isImporting, checkAndReconnect]);

  // Start import and trigger edge function
  const startImport = useCallback(async (total: number, csvData: any[]): Promise<string | null> => {
    // Create job with CSV data
    const { data, error } = await supabase
      .from('import_jobs')
      .insert({
        status: 'running',
        total_records: total,
        processed_records: 0,
        created_records: 0,
        updated_records: 0,
        skipped_records: 0,
        error_count: 0,
        current_batch: 0,
        csv_data: csvData
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Failed to create import job:', error);
      return null;
    }

    // Trigger edge function to process
    try {
      await supabase.functions.invoke('process-import-job', {
        body: { job_id: data.id }
      });
    } catch (err) {
      console.error('Failed to trigger import processing:', err);
    }

    return data.id;
  }, []);

  const pauseImport = useCallback(async (jobId: string) => {
    await supabase
      .from('import_jobs')
      .update({ status: 'paused', updated_at: new Date().toISOString() })
      .eq('id', jobId);
  }, []);

  const resumeImport = useCallback(async (jobId: string) => {
    // Set status to running
    await supabase
      .from('import_jobs')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', jobId);
    
    // Re-trigger edge function to continue processing
    try {
      await supabase.functions.invoke('process-import-job', {
        body: { job_id: jobId }
      });
    } catch (err) {
      console.error('Failed to resume import processing:', err);
    }
  }, []);

  const cancelImport = useCallback(async (jobId: string) => {
    await supabase
      .from('import_jobs')
      .update({ 
        status: 'cancelled', 
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }, []);

  return {
    ...importProgress,
    startImport,
    pauseImport,
    resumeImport,
    cancelImport
  };
};
