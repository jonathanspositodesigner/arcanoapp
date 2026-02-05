// Types for unified AI tool processor

export type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'waiting' | 'completed' | 'error';

export interface ErrorDetails {
  message: string;
  code?: string | number;
  solution?: string;
  details?: any;
}

export interface QueueMessage {
  emoji: string;
  text: string;
}

export interface AIToolConfig {
  /** Unique tool identifier */
  toolName: string;
  /** Database table name for jobs */
  tableName: 'upscaler_jobs' | 'pose_changer_jobs' | 'veste_ai_jobs' | 'video_upscaler_jobs';
  /** Edge function path (e.g., 'runninghub-upscaler/run') */
  edgeFunctionPath: string;
  /** Credit cost for this tool */
  creditCost: number;
  /** Storage folder path (e.g., 'upscaler', 'pose-changer') */
  storagePath: string;
  /** Toast message on success */
  successMessage?: string;
  /** Custom queue messages */
  queueMessages?: QueueMessage[];
  /** Polling interval in ms (default: 15000) */
  pollingInterval?: number;
  /** Timeout in minutes (default: 10) */
  timeoutMinutes?: number;
}

export interface StartJobOptions {
  /** Payload to send to edge function (merged with jobId, userId, creditCost) */
  edgeFunctionPayload: Record<string, any>;
  /** Initial job data to insert in database */
  jobInsertData: Record<string, any>;
  /** Called right before edge function is invoked (for UI updates) */
  onBeforeEdgeCall?: () => void;
}

export interface AIToolProcessorState {
  status: ProcessingStatus;
  progress: number;
  jobId: string | null;
  queuePosition: number;
  outputUrl: string | null;
  error: ErrorDetails | null;
  queueMessageIndex: number;
}

export interface AIToolProcessorActions {
  startJob: (options: StartJobOptions) => Promise<boolean>;
  cancelJob: () => Promise<void>;
  reset: () => void;
  uploadToStorage: (file: File | Blob, prefix: string) => Promise<string>;
  setProgress: (progress: number) => void;
  setStatus: (status: ProcessingStatus) => void;
}

export interface UseAIToolProcessorReturn extends AIToolProcessorState, AIToolProcessorActions {
  isProcessing: boolean;
  currentQueueMessage: QueueMessage;
  showNoCreditsModal: boolean;
  setShowNoCreditsModal: (show: boolean) => void;
  noCreditsReason: 'not_logged' | 'insufficient';
  showActiveJobModal: boolean;
  setShowActiveJobModal: (show: boolean) => void;
  activeToolName: string;
  activeJobStatus: string;
  activeJobId: string;
  activeTable: string;
  activeStartedAt?: string;
}

// Default queue messages used across tools
export const DEFAULT_QUEUE_MESSAGES: QueueMessage[] = [
  { emoji: '🎨', text: 'Preparando sua transformação...' },
  { emoji: '✨', text: 'Aguardando mágica IA...' },
  { emoji: '🚀', text: 'Quase lá, continue esperando!' },
  { emoji: '🌟', text: 'Processando resultado incrível...' },
];
