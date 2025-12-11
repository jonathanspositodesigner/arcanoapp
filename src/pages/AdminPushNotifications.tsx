import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Send, Loader2, Smartphone, Users, Clock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NotificationLog {
  id: string;
  title: string;
  body: string;
  url: string | null;
  sent_count: number;
  failed_count: number;
  sent_at: string;
}

const AdminPushNotifications = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchLogs();
  }, []);

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const { count } = await supabase
        .from("push_subscriptions")
        .select("*", { count: "exact", head: true });
      
      setSubscriptionCount(count || 0);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchLogs = async () => {
    const { data } = await supabase
      .from("push_notification_logs")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(20);

    setLogs((data as NotificationLog[]) || []);
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Preencha o título e a mensagem");
      return;
    }

    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-push-notification", {
        body: { title, body, url: url || undefined }
      });

      if (error) throw error;

      if (data.sent > 0) {
        toast.success(`Notificação enviada para ${data.sent} dispositivos!`);
        setTitle("");
        setBody("");
        setUrl("");
        fetchLogs();
        fetchStats();
      } else if (data.total === 0) {
        toast.info("Nenhum dispositivo inscrito para receber notificações");
      } else {
        toast.warning(`Falha ao enviar para ${data.failed} dispositivos`);
      }
    } catch (error: any) {
      console.error("Error sending notification:", error);
      toast.error("Erro ao enviar notificação: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Notificações Push</h1>
        <p className="text-muted-foreground mb-8">Envie notificações para dispositivos com o app instalado</p>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dispositivos Inscritos</p>
                <p className="text-2xl font-bold">
                  {isLoadingStats ? "..." : subscriptionCount}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Enviadas (último)</p>
                <p className="text-2xl font-bold">
                  {logs[0]?.sent_count || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-full">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Última Notificação</p>
                <p className="text-sm font-medium">
                  {logs[0] 
                    ? format(new Date(logs[0].sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                    : "Nenhuma enviada"}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Send Form */}
        <Card className="p-6 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Enviar Notificação</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Título *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Nova arte disponível!"
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {title.length}/50 caracteres
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Mensagem *
              </label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Ex: Confira as novas artes que acabamos de adicionar à biblioteca!"
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {body.length}/200 caracteres
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                URL de Destino (opcional)
              </label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Ex: /biblioteca-artes"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Para onde o usuário será direcionado ao clicar
              </p>
            </div>

            <Button
              onClick={handleSend}
              disabled={isSending || !title.trim() || !body.trim()}
              className="w-full sm:w-auto"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Notificação
                </>
              )}
            </Button>

            {subscriptionCount === 0 && (
              <p className="text-sm text-orange-500 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Nenhum dispositivo inscrito para receber notificações
              </p>
            )}
          </div>
        </Card>

        {/* History */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Histórico de Envios</h2>

          {logs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma notificação enviada ainda
            </p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between p-4 bg-secondary/50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{log.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{log.body}</p>
                    {log.url && (
                      <p className="text-xs text-primary mt-1">→ {log.url}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {log.sent_count}
                      </Badge>
                      {log.failed_count > 0 && (
                        <Badge variant="secondary" className="text-red-500">
                          <XCircle className="h-3 w-3 mr-1" />
                          {log.failed_count}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminPushNotifications;
