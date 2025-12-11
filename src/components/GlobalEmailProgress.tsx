import { useEmailCampaignProgress } from "@/hooks/useEmailCampaignProgress";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Mail, Pause, Play, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const GlobalEmailProgress = () => {
  const { 
    activeCampaign,
    isSending, 
    isPaused,
    progress, 
    sent, 
    failed,
    total,
    pauseCampaign,
    resumeCampaign,
    cancelCampaign
  } = useEmailCampaignProgress();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isSending) return null;

  const handlePauseResume = async () => {
    if (!activeCampaign) return;
    if (isPaused) {
      await resumeCampaign(activeCampaign.id);
    } else {
      await pauseCampaign(activeCampaign.id);
    }
  };

  const handleCancel = async () => {
    if (!activeCampaign) return;
    if (confirm('Tem certeza que deseja cancelar o envio? Os emails já enviados não serão afetados.')) {
      await cancelCampaign(activeCampaign.id);
    }
  };

  const handleClick = () => {
    if (location.pathname !== '/admin-email-marketing') {
      navigate('/admin-email-marketing');
    }
  };

  const getStatusText = () => {
    if (isPaused) return 'Pausado: ';
    return 'Enviando: ';
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-blue-500/10 backdrop-blur-sm border-b border-blue-500/20">
      <div className="container max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center gap-3">
          <Mail className={`h-4 w-4 text-blue-500 ${isPaused ? '' : 'animate-pulse'}`} />
          
          <div 
            className="flex-1 cursor-pointer" 
            onClick={handleClick}
            title="Clique para ir à página de Email Marketing"
          >
            <Progress value={progress} className="h-2 bg-blue-500/20 [&>div]:bg-blue-500" />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">
              {getStatusText()}
              {progress}% ({sent}/{total})
            </span>
            
            {failed > 0 && (
              <span className="text-xs text-destructive whitespace-nowrap hidden sm:inline">
                | ✕{failed} falhas
              </span>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-blue-600 hover:text-blue-700 hover:bg-blue-500/20"
              onClick={handlePauseResume}
              title={isPaused ? 'Continuar envio' : 'Pausar envio'}
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
              className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleCancel}
              title="Cancelar envio"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalEmailProgress;
