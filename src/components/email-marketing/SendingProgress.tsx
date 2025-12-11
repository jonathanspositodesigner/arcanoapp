import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Loader2, Pause, Play, X, Mail, CheckCircle, XCircle, AlertTriangle 
} from "lucide-react";

interface SendingProgressProps {
  campaignId: string;
  campaignTitle: string;
  onClose: () => void;
  onComplete: () => void;
}

interface CampaignProgress {
  status: string;
  is_paused: boolean;
  sent_count: number;
  failed_count: number;
  recipients_count: number;
}

const SendingProgress = ({ campaignId, campaignTitle, onClose, onComplete }: SendingProgressProps) => {
  const [progress, setProgress] = useState<CampaignProgress>({
    status: "sending",
    is_paused: false,
    sent_count: 0,
    failed_count: 0,
    recipients_count: 0,
  });
  const [pausing, setPausing] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Initial fetch
  useEffect(() => {
    const fetchInitial = async () => {
      const { data } = await supabase
        .from("email_campaigns")
        .select("status, is_paused, sent_count, failed_count, recipients_count")
        .eq("id", campaignId)
        .single();
      
      if (data) {
        setProgress({
          status: data.status || "sending",
          is_paused: data.is_paused || false,
          sent_count: data.sent_count || 0,
          failed_count: data.failed_count || 0,
          recipients_count: data.recipients_count || 0,
        });
      }
    };
    fetchInitial();
  }, [campaignId]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`campaign-progress-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'email_campaigns',
          filter: `id=eq.${campaignId}`
        },
        (payload: any) => {
          console.log("Realtime update:", payload.new);
          setProgress({
            status: payload.new.status || "sending",
            is_paused: payload.new.is_paused || false,
            sent_count: payload.new.sent_count || 0,
            failed_count: payload.new.failed_count || 0,
            recipients_count: payload.new.recipients_count || 0,
          });

          // Check if completed
          if (payload.new.status === "sent" || payload.new.status === "cancelled") {
            setTimeout(() => {
              onComplete();
            }, 2000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, onComplete]);

  const handlePause = async () => {
    setPausing(true);
    try {
      const { error } = await supabase
        .from("email_campaigns")
        .update({ is_paused: true })
        .eq("id", campaignId);

      if (error) throw error;
      toast.info("Pausando envio...");
    } catch (err: any) {
      toast.error("Erro ao pausar");
      console.error(err);
    } finally {
      setPausing(false);
    }
  };

  const handleResume = async () => {
    setResuming(true);
    try {
      // First, set is_paused to false
      await supabase
        .from("email_campaigns")
        .update({ is_paused: false, status: "sending" })
        .eq("id", campaignId);

      // Then invoke the edge function to continue sending
      const { data, error } = await supabase.functions.invoke("send-email-campaign", {
        body: { campaign_id: campaignId, resume: true, batch_size: 50 }
      });

      if (error) throw error;

      toast.success("Envio retomado!");
    } catch (err: any) {
      toast.error("Erro ao retomar");
      console.error(err);
    } finally {
      setResuming(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { error } = await supabase
        .from("email_campaigns")
        .update({ status: "cancelled", is_paused: true })
        .eq("id", campaignId);

      if (error) throw error;
      toast.warning("Campanha cancelada");
      onClose();
    } catch (err: any) {
      toast.error("Erro ao cancelar");
      console.error(err);
    } finally {
      setCancelling(false);
    }
  };

  const total = progress.recipients_count || 1;
  const processed = progress.sent_count + progress.failed_count;
  const remaining = total - processed;
  const percentage = Math.round((processed / total) * 100);
  const isPaused = progress.is_paused || progress.status === "paused";
  const isCompleted = progress.status === "sent" || progress.status === "cancelled";

  return (
    <Card className="p-6 max-w-md mx-auto">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPaused ? (
              <Pause className="h-5 w-5 text-orange-500" />
            ) : isCompleted ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            )}
            <span className="font-medium">
              {isPaused ? "Campanha pausada" : isCompleted ? "Envio concluído" : "Enviando campanha"}
            </span>
          </div>
          <Badge variant={isPaused ? "secondary" : isCompleted ? "default" : "outline"}>
            {percentage}%
          </Badge>
        </div>

        {/* Campaign title */}
        <p className="text-sm text-muted-foreground truncate">
          {campaignTitle}
        </p>

        {/* Progress bar */}
        <Progress value={percentage} className="h-3" />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="font-semibold">{progress.sent_count}</span>
            </div>
            <p className="text-xs text-muted-foreground">Enviados</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-red-600">
              <XCircle className="h-4 w-4" />
              <span className="font-semibold">{progress.failed_count}</span>
            </div>
            <p className="text-xs text-muted-foreground">Falhas</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-orange-600">
              <Mail className="h-4 w-4" />
              <span className="font-semibold">{remaining > 0 ? remaining : 0}</span>
            </div>
            <p className="text-xs text-muted-foreground">Restantes</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          {!isCompleted && (
            <>
              {isPaused ? (
                <Button 
                  onClick={handleResume} 
                  disabled={resuming}
                  className="flex-1 gap-2"
                >
                  {resuming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Retomar
                </Button>
              ) : (
                <Button 
                  variant="secondary"
                  onClick={handlePause} 
                  disabled={pausing}
                  className="flex-1 gap-2"
                >
                  {pausing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                  Pausar
                </Button>
              )}
              <Button 
                variant="destructive"
                onClick={handleCancel} 
                disabled={cancelling}
                className="gap-2"
              >
                {cancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                Cancelar
              </Button>
            </>
          )}
          {isCompleted && (
            <Button onClick={onClose} className="flex-1">
              Fechar
            </Button>
          )}
        </div>

        {/* Warning for paused */}
        {isPaused && !isCompleted && (
          <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg text-sm">
            <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
            <p className="text-orange-700 dark:text-orange-300">
              O envio está pausado. Clique em "Retomar" para continuar enviando os emails restantes.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default SendingProgress;
