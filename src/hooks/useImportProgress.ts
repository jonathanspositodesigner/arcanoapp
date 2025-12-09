import { useState, useEffect, useCallback } from 'react';
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
  progress: number;
  total: number;
  current: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  jobId: string | null;
}

export const useImportProgress = () => {
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    isImporting: false,
    isPaused: false,
    progress: 0,
    total: 0,
    current: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    jobId: null
  });

  // Fetch active job on mount
  useEffect(() => {
    const fetchActiveJob = async () => {
      const { data } = await supabase
        .from('import_jobs')
        .select('*')
        .in('status', ['running', 'paused'])
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

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
  }, []);

  const updateFromJob = (job: ImportJob) => {
    const progress = job.total_records > 0 
      ? Math.round((job.processed_records / job.total_records) * 100) 
      : 0;

    setImportProgress({
      isImporting: job.status === 'running' || job.status === 'paused',
      isPaused: job.status === 'paused',
      progress,
      total: job.total_records,
      current: job.processed_records,
      created: job.created_records,
      updated: job.updated_records,
      skipped: job.skipped_records,
      errors: job.error_count,
      jobId: job.id
    });

    // Clear state if completed or cancelled
    if (job.status === 'completed' || job.status === 'cancelled') {
      setTimeout(() => {
        setImportProgress({
          isImporting: false,
          isPaused: false,
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
  };

  const startImport = useCallback(async (total: number): Promise<string | null> => {
    const { data, error } = await supabase
      .from('import_jobs')
      .insert({
        status: 'running',
        total_records: total,
        processed_records: 0
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Failed to create import job:', error);
      return null;
    }

    return data.id;
  }, []);

  const updateProgress = useCallback(async (
    jobId: string, 
    processed: number, 
    created: number, 
    updated: number, 
    skipped: number,
    errors: number
  ) => {
    await supabase
      .from('import_jobs')
      .update({
        processed_records: processed,
        created_records: created,
        updated_records: updated,
        skipped_records: skipped,
        error_count: errors,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }, []);

  const pauseImport = useCallback(async (jobId: string) => {
    await supabase
      .from('import_jobs')
      .update({ status: 'paused', updated_at: new Date().toISOString() })
      .eq('id', jobId);
  }, []);

  const resumeImport = useCallback(async (jobId: string) => {
    await supabase
      .from('import_jobs')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', jobId);
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

  const finishImport = useCallback(async (jobId: string) => {
    await supabase
      .from('import_jobs')
      .update({ 
        status: 'completed', 
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }, []);

  const checkJobStatus = useCallback(async (jobId: string): Promise<string | null> => {
    const { data } = await supabase
      .from('import_jobs')
      .select('status')
      .eq('id', jobId)
      .single();

    return data?.status || null;
  }, []);

  return {
    ...importProgress,
    startImport,
    updateProgress,
    pauseImport,
    resumeImport,
    cancelImport,
    finishImport,
    checkJobStatus
  };
};
