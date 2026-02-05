import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bug, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useAIDebug } from '@/contexts/AIDebugContext';
import JobStepIndicator from './JobStepIndicator';
import JobDebugModal from './JobDebugModal';

interface JobDebugPanelProps {
  jobId: string | null;
  tableName: string;
  currentStep?: string | null;
  failedAtStep?: string | null;
  errorMessage?: string | null;
  position?: number | null;
  status?: string;
}

/**
 * JobDebugPanel - Painel de debug que aparece nas ferramentas quando modo debug está ativo
 */
const JobDebugPanel: React.FC<JobDebugPanelProps> = ({
  jobId,
  tableName,
  currentStep,
  failedAtStep,
  errorMessage,
  position,
  status,
}) => {
  const { isDebugEnabled } = useAIDebug();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDebugModal, setShowDebugModal] = useState(false);

  // Não renderiza se debug não está ativo
  if (!isDebugEnabled) return null;

  // Não renderiza se não tem job ativo
  if (!jobId && !status) return null;

  const isActive = status && !['completed', 'failed', 'cancelled', 'idle'].includes(status);
  const isFailed = status === 'failed' || status === 'error';

  return (
    <>
      <Card className={`mt-4 border-2 ${isFailed ? 'border-red-500/50 bg-red-500/5' : 'border-yellow-500/50 bg-yellow-500/5'}`}>
        <div 
          className="p-3 flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-yellow-500" />
            <span className="font-medium text-sm text-yellow-500">Debug Mode</span>
            {status && (
              <Badge variant="outline" className="text-xs">
                {status}
              </Badge>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {isExpanded && (
          <div className="px-3 pb-3 space-y-3 border-t border-yellow-500/20 pt-3">
            {/* Step Indicator */}
            <JobStepIndicator
              step={currentStep}
              failedAtStep={failedAtStep}
              errorMessage={errorMessage}
              position={position}
              showIcon={true}
            />

            {/* Job ID */}
            {jobId && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Job ID:</span>{' '}
                <span className="font-mono">{jobId.slice(0, 8)}...</span>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
                <span className="font-medium">Erro:</span> {errorMessage}
              </div>
            )}

            {/* Debug Modal Button */}
            {jobId && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDebugModal(true);
                }}
                className="w-full gap-2 text-xs"
              >
                <ExternalLink className="h-3 w-3" />
                Ver Detalhes Completos
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Debug Modal */}
      {jobId && (
        <JobDebugModal
          isOpen={showDebugModal}
          onClose={() => setShowDebugModal(false)}
          jobId={jobId}
          tableName={tableName}
        />
      )}
    </>
  );
};

export default JobDebugPanel;
