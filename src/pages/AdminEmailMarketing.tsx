import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Mail, Send, Save, TestTube, Loader2, 
  MailCheck, FileText, Users, Calendar, Clock,
  BookTemplate, Pencil, Trash2, Download
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import EmailEditor from "@/components/email-marketing/EmailEditor";
import RecipientSelector from "@/components/email-marketing/RecipientSelector";
import CampaignHistory from "@/components/email-marketing/CampaignHistory";
import EmojiPicker from "@/components/email-marketing/EmojiPicker";
import SendingProgress from "@/components/email-marketing/SendingProgress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface Campaign {
  id?: string;
  title: string;
  subject: string;
  content: string;
  sender_name: string;
  sender_email: string;
  recipient_filter: string;
  filter_value?: string;
  status?: string;
  is_scheduled?: boolean;
  schedule_type?: string;
  scheduled_at?: string;
  scheduled_time?: string;
  scheduled_day_of_week?: number;
  scheduled_day_of_month?: number;
}

interface EmailTemplate {
  id: string;
  name: string;
  title: string;
  subject: string;
  content: string;
  sender_name: string;
  sender_email: string;
  created_at: string;
}

const AdminEmailMarketing = () => {
  const [campaign, setCampaign] = useState<Campaign>({
    title: "",
    subject: "",
    content: "<p>Escreva seu email aqui...</p>",
    sender_name: "Vox Visual",
    sender_email: "contato@voxvisual.com.br",
    recipient_filter: "all",
    filter_value: "",
    is_scheduled: false,
    schedule_type: "once",
    scheduled_time: "09:00",
  });
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [refreshHistory, setRefreshHistory] = useState(0);
  const [scheduledDate, setScheduledDate] = useState("");
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    totalSent: 0,
    scheduledCount: 0,
    lastCampaign: null as string | null,
  });
  
  // Template state
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deleteTemplateConfirm, setDeleteTemplateConfirm] = useState<EmailTemplate | null>(null);

  // Progress modal state
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null);
  const [sendingCampaignTitle, setSendingCampaignTitle] = useState<string>("");

  useEffect(() => {
    fetchStats();
    fetchTemplates();
  }, [refreshHistory]);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from("email_templates")
      .select("*")
      .order("created_at", { ascending: false });
    setTemplates((data || []).map(t => ({
      ...t,
      title: t.title || "",
      sender_name: t.sender_name || "Vox Visual",
      sender_email: t.sender_email || "contato@voxvisual.com.br",
    })));
  };

  const handleSaveAsTemplate = async () => {
    if (!campaign.title || !campaign.subject || !campaign.content) {
      toast.error("Preencha título, assunto e conteúdo");
      return;
    }

    const name = prompt("Digite o nome do modelo:");
    if (!name?.trim()) return;

    setSavingTemplate(true);
    try {
      const { error } = await supabase
        .from("email_templates")
        .insert({
          name: name.trim(),
          title: campaign.title,
          subject: campaign.subject,
          content: campaign.content,
          sender_name: campaign.sender_name,
          sender_email: campaign.sender_email,
        });

      if (error) throw error;

      toast.success("Modelo salvo com sucesso!");
      fetchTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Erro ao salvar modelo");
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleLoadTemplate = (template: EmailTemplate) => {
    setCampaign({
      id: undefined, // LIMPAR O ID para forçar nova campanha
      title: template.title || template.name,
      subject: template.subject,
      content: template.content,
      sender_name: template.sender_name || "Vox Visual",
      sender_email: template.sender_email || "contato@voxvisual.com.br",
      recipient_filter: "all",
      filter_value: "",
      is_scheduled: false,
      schedule_type: "once",
      scheduled_time: "09:00",
    });
    toast.success("Modelo carregado - Nova campanha criada!");
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTemplateConfirm) return;

    try {
      const { error } = await supabase
        .from("email_templates")
        .delete()
        .eq("id", deleteTemplateConfirm.id);

      if (error) throw error;

      toast.success("Modelo excluído!");
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Erro ao excluir modelo");
    } finally {
      setDeleteTemplateConfirm(null);
    }
  };

  const fetchStats = async () => {
    const { data: campaigns } = await supabase
      .from("email_campaigns")
      .select("sent_count, sent_at, status, is_scheduled")
      .order("sent_at", { ascending: false });

    if (campaigns) {
      const sentCampaigns = campaigns.filter(c => c.status === "sent");
      const scheduledCampaigns = campaigns.filter(c => c.is_scheduled && c.status === "scheduled");
      setStats({
        totalCampaigns: sentCampaigns.length,
        totalSent: campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0),
        scheduledCount: scheduledCampaigns.length,
        lastCampaign: campaigns[0]?.sent_at || null,
      });
    }
  };

  const handleSaveDraft = async () => {
    if (!campaign.title || !campaign.subject) {
      toast.error("Preencha título e assunto");
      return;
    }

    setSaving(true);

    const payload = {
      ...campaign,
      status: "draft",
    };

    let result;
    if (campaign.id) {
      result = await supabase
        .from("email_campaigns")
        .update(payload)
        .eq("id", campaign.id);
    } else {
      result = await supabase
        .from("email_campaigns")
        .insert(payload)
        .select()
        .single();
      
      if (result.data) {
        setCampaign({ ...campaign, id: result.data.id });
      }
    }

    setSaving(false);

    if (result.error) {
      toast.error("Erro ao salvar rascunho");
      return;
    }

    toast.success("Rascunho salvo!");
    setRefreshHistory(prev => prev + 1);
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error("Digite um email para teste");
      return;
    }

    if (!campaign.title || !campaign.subject) {
      toast.error("Preencha título e assunto primeiro");
      return;
    }

    setSendingTest(true);

    let campaignId = campaign.id;
    
    if (!campaignId) {
      const payload = {
        ...campaign,
        status: "draft",
      };
      
      const { data, error } = await supabase
        .from("email_campaigns")
        .insert(payload)
        .select()
        .single();
      
      if (error || !data) {
        toast.error("Erro ao salvar campanha");
        setSendingTest(false);
        return;
      }
      
      campaignId = data.id;
      setCampaign(prev => ({ ...prev, id: data.id }));
    }

    const { data, error } = await supabase.functions.invoke("send-email-campaign", {
      body: {
        campaign_id: campaignId,
        test_email: testEmail,
      },
    });

    setSendingTest(false);

    if (error || data?.error) {
      toast.error(data?.error || "Erro ao enviar email de teste");
      return;
    }

    toast.success("Email de teste enviado!");
  };

  const calculateNextSendAt = (): string | null => {
    if (!campaign.is_scheduled) return null;

    const now = new Date();
    let nextSend: Date;

    if (campaign.schedule_type === "once") {
      if (!scheduledDate || !campaign.scheduled_time) return null;
      const [hours, minutes] = campaign.scheduled_time.split(":");
      nextSend = new Date(scheduledDate);
      nextSend.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    } else if (campaign.schedule_type === "daily") {
      if (!campaign.scheduled_time) return null;
      const [hours, minutes] = campaign.scheduled_time.split(":");
      nextSend = new Date(now);
      nextSend.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      if (nextSend <= now) {
        nextSend.setDate(nextSend.getDate() + 1);
      }
    } else if (campaign.schedule_type === "weekly") {
      if (!campaign.scheduled_time || campaign.scheduled_day_of_week === undefined) return null;
      const [hours, minutes] = campaign.scheduled_time.split(":");
      nextSend = new Date(now);
      const currentDay = nextSend.getDay();
      let daysUntilTarget = campaign.scheduled_day_of_week - currentDay;
      if (daysUntilTarget < 0) daysUntilTarget += 7;
      if (daysUntilTarget === 0) {
        nextSend.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        if (nextSend <= now) {
          daysUntilTarget = 7;
        }
      }
      if (daysUntilTarget > 0) {
        nextSend.setDate(nextSend.getDate() + daysUntilTarget);
      }
      nextSend.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    } else if (campaign.schedule_type === "monthly") {
      if (!campaign.scheduled_time || !campaign.scheduled_day_of_month) return null;
      const [hours, minutes] = campaign.scheduled_time.split(":");
      nextSend = new Date(now);
      nextSend.setDate(campaign.scheduled_day_of_month);
      nextSend.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      if (nextSend <= now) {
        nextSend.setMonth(nextSend.getMonth() + 1);
      }
    } else {
      return null;
    }

    return nextSend.toISOString();
  };

  const handleScheduleCampaign = async () => {
    if (!campaign.title || !campaign.subject || !campaign.content) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (campaign.recipient_filter === "custom_email" && !campaign.filter_value) {
      toast.error("Digite o email do destinatário");
      return;
    }

    if (campaign.recipient_filter === "specific_pack" && !campaign.filter_value) {
      toast.error("Selecione o pack");
      return;
    }

    const nextSendAt = calculateNextSendAt();
    if (!nextSendAt) {
      toast.error("Configure a data e hora do agendamento");
      return;
    }

    setSending(true);

    const payload = {
      ...campaign,
      status: "scheduled",
      is_scheduled: true,
      next_send_at: nextSendAt,
      scheduled_at: campaign.schedule_type === "once" ? nextSendAt : null,
    };

    let result;
    if (campaign.id) {
      result = await supabase
        .from("email_campaigns")
        .update(payload)
        .eq("id", campaign.id);
    } else {
      result = await supabase
        .from("email_campaigns")
        .insert(payload)
        .select()
        .single();
    }

    setSending(false);

    if (result.error) {
      toast.error("Erro ao agendar campanha");
      return;
    }

    toast.success(`Campanha agendada para ${format(new Date(nextSendAt), "dd/MM/yyyy 'às' HH:mm")}`);
    resetForm();
    setRefreshHistory(prev => prev + 1);
  };

  const handleSendCampaign = async () => {
    if (!campaign.title || !campaign.subject || !campaign.content) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (campaign.recipient_filter === "custom_email" && !campaign.filter_value) {
      toast.error("Digite o email do destinatário");
      return;
    }

    if (campaign.recipient_filter === "specific_pack" && !campaign.filter_value) {
      toast.error("Selecione o pack");
      return;
    }

    let campaignId = campaign.id;
    
    if (!campaignId) {
      // Save draft first to get campaign ID
      setSaving(true);
      const payload = {
        ...campaign,
        status: "draft",
      };
      const { data: savedCampaign, error: saveError } = await supabase
        .from("email_campaigns")
        .insert(payload)
        .select()
        .single();
      
      setSaving(false);
      
      if (saveError || !savedCampaign) {
        toast.error("Erro ao salvar campanha");
        return;
      }
      
      campaignId = savedCampaign.id;
      setCampaign({ ...campaign, id: campaignId });
    }

    // Show progress modal
    setSendingCampaignId(campaignId);
    setSendingCampaignTitle(campaign.title);
    setShowProgressModal(true);

    // Start sending in background
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-email-campaign", {
      body: { campaign_id: campaignId },
    });
    setSending(false);

    if (error || data?.error) {
      toast.error(data?.error || "Erro ao iniciar envio");
      setShowProgressModal(false);
      return;
    }

    // The progress modal will handle the rest via realtime
    if (data?.completed) {
      toast.success(`Campanha enviada! ${data.sent_count} emails enviados.`);
      setShowProgressModal(false);
      resetForm();
      setRefreshHistory(prev => prev + 1);
    }
  };

  const handleProgressClose = () => {
    setShowProgressModal(false);
    setSendingCampaignId(null);
    setSendingCampaignTitle("");
  };

  const handleProgressComplete = () => {
    resetForm();
    setRefreshHistory(prev => prev + 1);
    // Keep modal open briefly to show completion
    setTimeout(() => {
      handleProgressClose();
    }, 1500);
  };

  const resetForm = () => {
    setCampaign({
      title: "",
      subject: "",
      content: "<p>Escreva seu email aqui...</p>",
      sender_name: "ArcanoApp",
      sender_email: "contato@seudominio.com",
      recipient_filter: "all",
      filter_value: "",
      is_scheduled: false,
      schedule_type: "once",
      scheduled_time: "09:00",
    });
    setScheduledDate("");
  };

  const handleEdit = async (c: any) => {
    const { data } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", c.id)
      .single();

    if (data) {
      setCampaign({
        id: data.id,
        title: data.title,
        subject: data.subject,
        content: data.content,
        sender_name: data.sender_name,
        sender_email: data.sender_email,
        recipient_filter: data.recipient_filter,
        filter_value: data.filter_value || "",
        status: data.status,
        is_scheduled: data.is_scheduled || false,
        schedule_type: data.schedule_type || "once",
        scheduled_time: data.scheduled_time || "09:00",
        scheduled_day_of_week: data.scheduled_day_of_week,
        scheduled_day_of_month: data.scheduled_day_of_month,
      });
      if (data.scheduled_at) {
        setScheduledDate(data.scheduled_at.split("T")[0]);
      }
    }
  };

  const handleDuplicate = async (c: any) => {
    const { data } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", c.id)
      .single();

    if (data) {
      setCampaign({
        title: `${data.title} (cópia)`,
        subject: data.subject,
        content: data.content,
        sender_name: data.sender_name,
        sender_email: data.sender_email,
        recipient_filter: data.recipient_filter,
        filter_value: data.filter_value || "",
        is_scheduled: false,
        schedule_type: "once",
        scheduled_time: "09:00",
      });
      setScheduledDate("");
      toast.info("Campanha duplicada. Edite e salve.");
    }
  };

  const dayOfWeekOptions = [
    { value: 0, label: "Domingo" },
    { value: 1, label: "Segunda-feira" },
    { value: 2, label: "Terça-feira" },
    { value: 3, label: "Quarta-feira" },
    { value: 4, label: "Quinta-feira" },
    { value: 5, label: "Sexta-feira" },
    { value: 6, label: "Sábado" },
  ];

  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">E-mail Marketing</h1>
        <p className="text-muted-foreground mb-8">Crie e envie campanhas de email</p>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalCampaigns}</p>
                <p className="text-sm text-muted-foreground">Campanhas enviadas</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <MailCheck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalSent}</p>
                <p className="text-sm text-muted-foreground">Emails enviados</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Calendar className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.scheduledCount}</p>
                <p className="text-sm text-muted-foreground">Agendadas</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.lastCampaign 
                    ? format(new Date(stats.lastCampaign), "dd/MM")
                    : "-"
                  }
                </p>
                <p className="text-sm text-muted-foreground">Última campanha</p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="create" className="space-y-6">
          <TabsList>
            <TabsTrigger value="create" className="gap-2">
              <Mail className="h-4 w-4" />
              Nova Campanha
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <BookTemplate className="h-4 w-4" />
              Modelos
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <FileText className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <Card className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left column - Form */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Título interno</Label>
                    <div className="flex gap-2">
                      <Input
                        id="title"
                        placeholder="Ex: Black Friday 2024"
                        value={campaign.title}
                        onChange={(e) => setCampaign({ ...campaign, title: e.target.value })}
                      />
                      <EmojiPicker
                        onSelect={(emoji) => setCampaign({ ...campaign, title: campaign.title + emoji })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="subject">Assunto do email</Label>
                    <div className="flex gap-2">
                      <Input
                        id="subject"
                        placeholder="Ex: 🔥 Oferta especial só hoje!"
                        value={campaign.subject}
                        onChange={(e) => setCampaign({ ...campaign, subject: e.target.value })}
                      />
                      <EmojiPicker
                        onSelect={(emoji) => setCampaign({ ...campaign, subject: campaign.subject + emoji })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sender_name">Nome do remetente</Label>
                      <Input
                        id="sender_name"
                        placeholder="ArcanoApp"
                        value={campaign.sender_name}
                        onChange={(e) => setCampaign({ ...campaign, sender_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="sender_email">Email do remetente</Label>
                      <Input
                        id="sender_email"
                        placeholder="contato@dominio.com"
                        value={campaign.sender_email}
                        onChange={(e) => setCampaign({ ...campaign, sender_email: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Use um domínio verificado no Resend
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label>Destinatários</Label>
                    <RecipientSelector
                      value={campaign.recipient_filter}
                      onChange={(value) => setCampaign({ ...campaign, recipient_filter: value, filter_value: "" })}
                      packValue={campaign.recipient_filter === "specific_pack" ? campaign.filter_value : ""}
                      onPackChange={(value) => setCampaign({ ...campaign, filter_value: value })}
                      customEmail={campaign.recipient_filter === "custom_email" ? campaign.filter_value : ""}
                      onCustomEmailChange={(value) => setCampaign({ ...campaign, filter_value: value })}
                    />
                    {campaign.recipient_filter === "custom_email" && campaign.filter_value && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Email definido: {campaign.filter_value}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right column - Test & Schedule */}
                <div className="space-y-4">
                  <Card className="p-4 bg-muted/30">
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <TestTube className="h-4 w-4" />
                      Enviar email de teste
                    </h3>
                    <div className="flex gap-2">
                      <Input
                        placeholder="seu@email.com"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                      />
                      <Button
                        variant="outline"
                        onClick={handleSendTest}
                        disabled={sendingTest || !campaign.content}
                      >
                        {sendingTest ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Testar"
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Envie um email de teste antes de disparar para todos
                    </p>
                  </Card>

                  {/* Scheduling Section */}
                  <Card className="p-4 bg-orange-500/5 border-orange-500/20">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-orange-500" />
                        Agendar envio
                      </h3>
                      <Switch
                        checked={campaign.is_scheduled}
                        onCheckedChange={(checked) => setCampaign({ ...campaign, is_scheduled: checked })}
                      />
                    </div>

                    {campaign.is_scheduled && (
                      <div className="space-y-3">
                        <div>
                          <Label>Tipo de agendamento</Label>
                          <Select
                            value={campaign.schedule_type}
                            onValueChange={(value) => setCampaign({ ...campaign, schedule_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="once">Envio único</SelectItem>
                              <SelectItem value="daily">Diário</SelectItem>
                              <SelectItem value="weekly">Semanal</SelectItem>
                              <SelectItem value="monthly">Mensal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {campaign.schedule_type === "once" && (
                          <div>
                            <Label>Data do envio</Label>
                            <Input
                              type="date"
                              value={scheduledDate}
                              onChange={(e) => setScheduledDate(e.target.value)}
                              min={format(new Date(), "yyyy-MM-dd")}
                            />
                          </div>
                        )}

                        {campaign.schedule_type === "weekly" && (
                          <div>
                            <Label>Dia da semana</Label>
                            <Select
                              value={campaign.scheduled_day_of_week?.toString()}
                              onValueChange={(value) => setCampaign({ ...campaign, scheduled_day_of_week: parseInt(value) })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o dia" />
                              </SelectTrigger>
                              <SelectContent>
                                {dayOfWeekOptions.map((day) => (
                                  <SelectItem key={day.value} value={day.value.toString()}>
                                    {day.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {campaign.schedule_type === "monthly" && (
                          <div>
                            <Label>Dia do mês</Label>
                            <Input
                              type="number"
                              min={1}
                              max={31}
                              value={campaign.scheduled_day_of_month || ""}
                              onChange={(e) => setCampaign({ ...campaign, scheduled_day_of_month: parseInt(e.target.value) || undefined })}
                              placeholder="1-31"
                            />
                          </div>
                        )}

                        <div>
                          <Label className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Horário
                          </Label>
                          <Input
                            type="time"
                            value={campaign.scheduled_time}
                            onChange={(e) => setCampaign({ ...campaign, scheduled_time: e.target.value })}
                          />
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {campaign.schedule_type === "once" && "O email será enviado uma única vez na data e hora selecionada"}
                          {campaign.schedule_type === "daily" && "O email será enviado todos os dias no horário selecionado"}
                          {campaign.schedule_type === "weekly" && "O email será enviado toda semana no dia e horário selecionado"}
                          {campaign.schedule_type === "monthly" && "O email será enviado todo mês no dia e horário selecionado"}
                        </p>
                      </div>
                    )}
                  </Card>

                  {campaign.status === "sent" && (
                    <Card className="p-4 bg-green-500/10 border-green-500/30">
                      <p className="text-sm text-green-600 font-medium">
                        ✓ Esta campanha já foi enviada
                      </p>
                    </Card>
                  )}

                  {campaign.status === "scheduled" && (
                    <Card className="p-4 bg-orange-500/10 border-orange-500/30">
                      <p className="text-sm text-orange-600 font-medium">
                        ⏰ Esta campanha está agendada
                      </p>
                    </Card>
                  )}
                </div>
              </div>

              {/* Editor */}
              <div className="mt-6">
                <Label>Conteúdo do email</Label>
                <div className="mt-2">
                  <EmailEditor
                    value={campaign.content}
                    onChange={(html) => setCampaign({ ...campaign, content: html })}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center mt-6 pt-6 border-t border-border">
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetForm}>
                  Limpar
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSaveAsTemplate}
                  disabled={savingTemplate}
                >
                  {savingTemplate ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <BookTemplate className="h-4 w-4 mr-2" />
                  )}
                  Salvar como Modelo
                </Button>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Rascunho
                </Button>
                  {campaign.is_scheduled ? (
                    <Button
                      onClick={handleScheduleCampaign}
                      disabled={sending}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Calendar className="h-4 w-4 mr-2" />
                      )}
                      Agendar Campanha
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSendCampaign}
                      disabled={sending || campaign.status === "sent"}
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Enviar Campanha
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Modelos Salvos</h2>
                  <p className="text-sm text-muted-foreground">
                    Reutilize modelos de email para suas campanhas
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {templates.length} modelo(s)
                </p>
              </div>

              {templates.length === 0 ? (
                <div className="text-center py-12">
                  <BookTemplate className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Nenhum modelo salvo ainda</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Crie uma campanha e clique em "Salvar como Modelo"
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {templates.map((template) => (
                    <Card key={template.id} className="p-4 hover:border-primary/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{template.name}</h3>
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {template.subject}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>De: {template.sender_name}</span>
                            <span>•</span>
                            <span>{format(new Date(template.created_at), "dd/MM/yyyy")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLoadTemplate(template)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Usar
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTemplateConfirm(template)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <CampaignHistory
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              refreshTrigger={refreshHistory}
            />
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!deleteTemplateConfirm} onOpenChange={(open) => !open && setDeleteTemplateConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o modelo "{deleteTemplateConfirm?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteTemplate}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sending Progress Modal */}
      <Dialog open={showProgressModal} onOpenChange={setShowProgressModal}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          {sendingCampaignId && (
            <SendingProgress
              campaignId={sendingCampaignId}
              campaignTitle={sendingCampaignTitle}
              onClose={handleProgressClose}
              onComplete={handleProgressComplete}
            />
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminEmailMarketing;
