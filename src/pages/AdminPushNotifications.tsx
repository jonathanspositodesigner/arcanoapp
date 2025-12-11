import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Bell, Send, Loader2, Smartphone, Clock, CheckCircle, XCircle, 
  Save, FileText, Calendar, Trash2, Play, Pause, Edit2, Plus
} from "lucide-react";
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

interface Template {
  id: string;
  name: string;
  title: string;
  body: string;
  url: string | null;
  created_at: string;
}

interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  url: string | null;
  schedule_type: string;
  scheduled_at: string | null;
  scheduled_time: string | null;
  scheduled_day_of_week: number | null;
  scheduled_day_of_month: number | null;
  is_active: boolean;
  last_sent_at: string | null;
  next_send_at: string;
  created_at: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

const AdminPushNotifications = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  
  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  
  // Schedules
  const [schedules, setSchedules] = useState<ScheduledNotification[]>([]);
  const [scheduleType, setScheduleType] = useState<string>("once");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [scheduledDayOfWeek, setScheduledDayOfWeek] = useState<number>(1);
  const [scheduledDayOfMonth, setScheduledDayOfMonth] = useState<number>(1);
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchLogs();
    fetchTemplates();
    fetchSchedules();
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
      .limit(10);

    setLogs((data as NotificationLog[]) || []);
  };

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from("push_notification_templates")
      .select("*")
      .order("created_at", { ascending: false });

    setTemplates((data as Template[]) || []);
  };

  const fetchSchedules = async () => {
    const { data } = await supabase
      .from("push_scheduled_notifications")
      .select("*")
      .order("next_send_at", { ascending: true });

    setSchedules((data as ScheduledNotification[]) || []);
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

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !title.trim() || !body.trim()) {
      toast.error("Preencha o nome do modelo, título e mensagem");
      return;
    }

    setIsSavingTemplate(true);

    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from("push_notification_templates")
          .update({
            name: templateName,
            title,
            body,
            url: url || null
          })
          .eq("id", editingTemplate.id);

        if (error) throw error;
        toast.success("Modelo atualizado!");
        setEditingTemplate(null);
      } else {
        const { error } = await supabase
          .from("push_notification_templates")
          .insert({
            name: templateName,
            title,
            body,
            url: url || null
          });

        if (error) throw error;
        toast.success("Modelo salvo!");
      }

      setTemplateName("");
      setTitle("");
      setBody("");
      setUrl("");
      fetchTemplates();
    } catch (error: any) {
      toast.error("Erro ao salvar modelo: " + error.message);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleUseTemplate = (template: Template) => {
    setTitle(template.title);
    setBody(template.body);
    setUrl(template.url || "");
    toast.success("Modelo carregado!");
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTitle(template.title);
    setBody(template.body);
    setUrl(template.url || "");
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Excluir este modelo?")) return;

    try {
      const { error } = await supabase
        .from("push_notification_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Modelo excluído!");
      fetchTemplates();
    } catch (error: any) {
      toast.error("Erro ao excluir modelo: " + error.message);
    }
  };

  const calculateNextSendAt = (): Date => {
    const now = new Date();
    const [hours, minutes] = scheduledTime.split(":").map(Number);

    if (scheduleType === "once") {
      const date = new Date(scheduledDate + "T" + scheduledTime);
      return date;
    } else if (scheduleType === "daily") {
      const next = new Date(now);
      next.setHours(hours, minutes, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    } else if (scheduleType === "weekly") {
      const next = new Date(now);
      const daysUntil = (scheduledDayOfWeek - now.getDay() + 7) % 7 || 7;
      next.setDate(next.getDate() + daysUntil);
      next.setHours(hours, minutes, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 7);
      }
      return next;
    } else {
      // monthly
      const next = new Date(now.getFullYear(), now.getMonth(), scheduledDayOfMonth, hours, minutes, 0, 0);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      return next;
    }
  };

  const handleCreateSchedule = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Preencha o título e a mensagem");
      return;
    }

    if (scheduleType === "once" && !scheduledDate) {
      toast.error("Selecione a data do envio");
      return;
    }

    setIsCreatingSchedule(true);

    try {
      const nextSendAt = calculateNextSendAt();

      const scheduleData: any = {
        title,
        body,
        url: url || null,
        schedule_type: scheduleType,
        next_send_at: nextSendAt.toISOString(),
        scheduled_time: scheduledTime + ":00"
      };

      if (scheduleType === "once") {
        scheduleData.scheduled_at = new Date(scheduledDate + "T" + scheduledTime).toISOString();
      } else if (scheduleType === "weekly") {
        scheduleData.scheduled_day_of_week = scheduledDayOfWeek;
      } else if (scheduleType === "monthly") {
        scheduleData.scheduled_day_of_month = scheduledDayOfMonth;
      }

      const { error } = await supabase
        .from("push_scheduled_notifications")
        .insert(scheduleData);

      if (error) throw error;

      toast.success("Agendamento criado!");
      setTitle("");
      setBody("");
      setUrl("");
      setScheduledDate("");
      fetchSchedules();
    } catch (error: any) {
      toast.error("Erro ao criar agendamento: " + error.message);
    } finally {
      setIsCreatingSchedule(false);
    }
  };

  const handleToggleSchedule = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("push_scheduled_notifications")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;
      toast.success(isActive ? "Agendamento pausado" : "Agendamento ativado");
      fetchSchedules();
    } catch (error: any) {
      toast.error("Erro ao atualizar agendamento: " + error.message);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("Excluir este agendamento?")) return;

    try {
      const { error } = await supabase
        .from("push_scheduled_notifications")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Agendamento excluído!");
      fetchSchedules();
    } catch (error: any) {
      toast.error("Erro ao excluir agendamento: " + error.message);
    }
  };

  const getScheduleTypeLabel = (type: string) => {
    switch (type) {
      case "once": return "Única vez";
      case "daily": return "Diário";
      case "weekly": return "Semanal";
      case "monthly": return "Mensal";
      default: return type;
    }
  };

  const getScheduleDescription = (schedule: ScheduledNotification) => {
    if (schedule.schedule_type === "once") {
      return format(new Date(schedule.scheduled_at!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } else if (schedule.schedule_type === "daily") {
      return `Todos os dias às ${schedule.scheduled_time?.slice(0, 5)}`;
    } else if (schedule.schedule_type === "weekly") {
      const day = DAYS_OF_WEEK.find(d => d.value === schedule.scheduled_day_of_week);
      return `Toda ${day?.label} às ${schedule.scheduled_time?.slice(0, 5)}`;
    } else {
      return `Todo dia ${schedule.scheduled_day_of_month} às ${schedule.scheduled_time?.slice(0, 5)}`;
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
                <p className="text-sm text-muted-foreground">Agendamentos Ativos</p>
                <p className="text-2xl font-bold">
                  {schedules.filter(s => s.is_active).length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="send" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="send" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Enviar</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Modelos</span>
            </TabsTrigger>
            <TabsTrigger value="schedules" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Agendar</span>
            </TabsTrigger>
          </TabsList>

          {/* Send Tab */}
          <TabsContent value="send" className="space-y-6">
            <Card className="p-6">
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
                    placeholder="Ex: Confira as novas artes que acabamos de adicionar!"
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
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleSend}
                    disabled={isSending || !title.trim() || !body.trim()}
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar Agora
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>

            {/* History */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Últimos 10 Envios</h2>

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
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">
                  {editingTemplate ? "Editar Modelo" : "Salvar Novo Modelo"}
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Nome do Modelo *
                  </label>
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Ex: Promoção de fim de ano"
                  />
                </div>

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
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Mensagem *
                  </label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Ex: Confira as novas artes!"
                    rows={3}
                    maxLength={200}
                  />
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
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSaveTemplate}
                    disabled={isSavingTemplate || !templateName.trim() || !title.trim() || !body.trim()}
                  >
                    {isSavingTemplate ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {editingTemplate ? "Atualizar Modelo" : "Salvar Modelo"}
                  </Button>
                  {editingTemplate && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingTemplate(null);
                        setTemplateName("");
                        setTitle("");
                        setBody("");
                        setUrl("");
                      }}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Modelos Salvos</h2>

              {templates.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum modelo salvo ainda
                </p>
              ) : (
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-start justify-between p-4 bg-secondary/50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{template.name}</p>
                        <p className="text-sm text-muted-foreground">{template.title}</p>
                        <p className="text-xs text-muted-foreground truncate mt-1">{template.body}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUseTemplate(template)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditTemplate(template)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Schedules Tab */}
          <TabsContent value="schedules" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Criar Agendamento</h2>
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
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Mensagem *
                  </label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Ex: Confira as novas artes!"
                    rows={3}
                    maxLength={200}
                  />
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
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Frequência
                  </label>
                  <Select value={scheduleType} onValueChange={setScheduleType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">Única vez</SelectItem>
                      <SelectItem value="daily">Diariamente</SelectItem>
                      <SelectItem value="weekly">Semanalmente</SelectItem>
                      <SelectItem value="monthly">Mensalmente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {scheduleType === "once" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Data *
                      </label>
                      <Input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Hora *
                      </label>
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {scheduleType === "daily" && (
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Horário *
                    </label>
                    <Input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                    />
                  </div>
                )}

                {scheduleType === "weekly" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Dia da Semana *
                      </label>
                      <Select 
                        value={String(scheduledDayOfWeek)} 
                        onValueChange={(v) => setScheduledDayOfWeek(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS_OF_WEEK.map((day) => (
                            <SelectItem key={day.value} value={String(day.value)}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Horário *
                      </label>
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {scheduleType === "monthly" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Dia do Mês *
                      </label>
                      <Select 
                        value={String(scheduledDayOfMonth)} 
                        onValueChange={(v) => setScheduledDayOfMonth(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <SelectItem key={day} value={String(day)}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Horário *
                      </label>
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleCreateSchedule}
                  disabled={isCreatingSchedule || !title.trim() || !body.trim()}
                >
                  {isCreatingSchedule ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Criar Agendamento
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Agendamentos</h2>

              {schedules.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum agendamento criado ainda
                </p>
              ) : (
                <div className="space-y-3">
                  {schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className={`flex items-start justify-between p-4 rounded-lg ${
                        schedule.is_active ? "bg-secondary/50" : "bg-secondary/20 opacity-60"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-foreground">{schedule.title}</p>
                          <Badge variant={schedule.is_active ? "default" : "secondary"}>
                            {getScheduleTypeLabel(schedule.schedule_type)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{schedule.body}</p>
                        <p className="text-xs text-primary mt-1">
                          {getScheduleDescription(schedule)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Próximo envio: {format(new Date(schedule.next_send_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Switch
                          checked={schedule.is_active}
                          onCheckedChange={() => handleToggleSchedule(schedule.id, schedule.is_active)}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminPushNotifications;
