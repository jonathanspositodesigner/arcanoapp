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

    // Trigger edge function to process in background
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
