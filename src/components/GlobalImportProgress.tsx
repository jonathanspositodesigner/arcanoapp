import { useImportProgress } from "@/hooks/useImportProgress";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Upload, Pause, Play, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const GlobalImportProgress = () => {
  const { 
    isImporting, 
    isPaused,
    progress, 
    current, 
    total,
    created,
    updated,
    skipped,
    errors,
    jobId,
    pauseImport,
    resumeImport,
    cancelImport
  } = useImportProgress();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isImporting) return null;

  const handlePauseResume = async () => {
    if (!jobId) return;
    if (isPaused) {
      await resumeImport(jobId);
    } else {
      await pauseImport(jobId);
    }
  };

  const handleCancel = async () => {
    if (!jobId) return;
    if (confirm('Tem certeza que deseja cancelar a importação? O progresso será perdido.')) {
      await cancelImport(jobId);
    }
  };

  const handleClick = () => {
    if (location.pathname !== '/admin-import-clients') {
      navigate('/admin-import-clients');
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary/10 backdrop-blur-sm border-b border-primary/20">
      <div className="container max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center gap-3">
          <Upload className={`h-4 w-4 text-primary ${isPaused ? '' : 'animate-pulse'}`} />
          
          <div 
            className="flex-1 cursor-pointer" 
            onClick={handleClick}
            title="Clique para ir à página de importação"
          >
            <Progress value={progress} className="h-2" />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-primary font-medium whitespace-nowrap">
              {isPaused ? 'Pausado: ' : 'Importando: '}
              {progress}% ({current}/{total})
            </span>
            
            {(created > 0 || updated > 0 || skipped > 0) && (
              <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
                | +{created} | ↑{updated} | ⊘{skipped}
                {errors > 0 && <span className="text-destructive"> | ✕{errors}</span>}
              </span>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handlePauseResume}
              title={isPaused ? 'Continuar' : 'Pausar'}
            >
              {isPaused ? (
                <Play className="h-3 w-3" />
              ) : (
                <Pause className="h-3 w-3" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={handleCancel}
              title="Cancelar importação"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalImportProgress;
