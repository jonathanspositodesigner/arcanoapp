import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GeminiVideoRequest {
  prompt: string;
  aspectRatio: '16:9' | '9:16';
  duration: number;
  quality: '720p' | '1080p';
  context: 'video-generator' | 'movie-led-maker';
  referenceImageUrl?: string;
}

export interface GeminiQueueJob {
  id: string;
  user_id: string;
  provider: string;
  status: string;
  prompt: string;
  aspect_ratio: string;
  duration: number;
  quality: string;
  context: string;
  operation_name: string | null;
  video_url: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export function useGeminiVideoQueue() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const enqueueVideo = async (request: GeminiVideoRequest): Promise<GeminiQueueJob> => {
    setIsSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Sessão expirada. Faça login novamente.');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video-gemini/enqueue`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            prompt: request.prompt,
            aspect_ratio: request.aspectRatio,
            duration: request.duration,
            quality: request.quality,
            context: request.context,
            reference_image_url: request.referenceImageUrl || null,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enfileirar vídeo');
      }

      // Fetch the full job data
      const { data: job, error } = await supabase
        .from('video_generation_queue')
        .select('*')
        .eq('id', data.job_id)
        .single();

      if (error || !job) throw new Error('Job criado mas não encontrado');

      return job as unknown as GeminiQueueJob;
    } finally {
      setIsSubmitting(false);
    }
  };

  const subscribeToJob = (jobId: string, onUpdate: (job: GeminiQueueJob) => void) => {
    return supabase
      .channel(`gemini-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_generation_queue',
          filter: `id=eq.${jobId}`,
        },
        (payload) => onUpdate(payload.new as unknown as GeminiQueueJob)
      )
      .subscribe();
  };

  const triggerProcessing = async () => {
    try {
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video-gemini/process`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
    } catch {
      // Non-critical: cron will pick it up
    }
  };

  return { enqueueVideo, subscribeToJob, triggerProcessing, isSubmitting };
}
