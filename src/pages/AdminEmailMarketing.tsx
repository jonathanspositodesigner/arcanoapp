import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Mail, Send, Save, TestTube, Loader2, 
  MailCheck, FileText, Users
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import EmailEditor from "@/components/email-marketing/EmailEditor";
import RecipientSelector from "@/components/email-marketing/RecipientSelector";
import CampaignHistory from "@/components/email-marketing/CampaignHistory";
import EmojiPicker from "@/components/email-marketing/EmojiPicker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
}

const AdminEmailMarketing = () => {
  const [campaign, setCampaign] = useState<Campaign>({
    title: "",
    subject: "",
    content: "<p>Escreva seu email aqui...</p>",
    sender_name: "Arcano Lab",
    sender_email: "contato@seudominio.com",
    recipient_filter: "all",
    filter_value: "",
  });
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [refreshHistory, setRefreshHistory] = useState(0);
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    totalSent: 0,
    lastCampaign: null as string | null,
  });

  useEffect(() => {
    fetchStats();
  }, [refreshHistory]);

  const fetchStats = async () => {
    const { data: campaigns } = await supabase
      .from("email_campaigns")
      .select("sent_count, sent_at, status")
      .order("sent_at", { ascending: false });

    if (campaigns) {
      const sentCampaigns = campaigns.filter(c => c.status === "sent");
      setStats({
        totalCampaigns: sentCampaigns.length,
        totalSent: campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0),
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

    if (!campaign.id) {
      await handleSaveDraft();
    }

    if (!campaign.id && !campaign.title) {
      toast.error("Salve a campanha primeiro");
      return;
    }

    setSendingTest(true);

    const { data, error } = await supabase.functions.invoke("send-email-campaign", {
      body: {
        campaign_id: campaign.id,
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

  const handleSendCampaign = async () => {
    if (!campaign.title || !campaign.subject || !campaign.content) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (!campaign.id) {
      await handleSaveDraft();
    }

    if (!campaign.id) {
      toast.error("Erro ao salvar campanha");
      return;
    }

    setSending(true);

    const { data, error } = await supabase.functions.invoke("send-email-campaign", {
      body: { campaign_id: campaign.id },
    });

    setSending(false);

    if (error || data?.error) {
      toast.error(data?.error || "Erro ao enviar campanha");
      return;
    }

    toast.success(`Campanha enviada! ${data.sent_count} emails enviados.`);
    resetForm();
    setRefreshHistory(prev => prev + 1);
  };

  const resetForm = () => {
    setCampaign({
      title: "",
      subject: "",
      content: "<p>Escreva seu email aqui...</p>",
      sender_name: "Arcano Lab",
      sender_email: "contato@seudominio.com",
      recipient_filter: "all",
      filter_value: "",
    });
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
      });
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
      });
      toast.info("Campanha duplicada. Edite e salve.");
    }
  };

  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">E-mail Marketing</h1>
        <p className="text-muted-foreground mb-8">Crie e envie campanhas de email</p>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.lastCampaign 
                    ? new Date(stats.lastCampaign).toLocaleDateString("pt-BR")
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
                        placeholder="Arcano Lab"
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
                      onChange={(value) => setCampaign({ ...campaign, recipient_filter: value })}
                      packValue={campaign.filter_value}
                      onPackChange={(value) => setCampaign({ ...campaign, filter_value: value })}
                    />
                  </div>
                </div>

                {/* Right column - Test */}
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

                  {campaign.status === "sent" && (
                    <Card className="p-4 bg-green-500/10 border-green-500/30">
                      <p className="text-sm text-green-600 font-medium">
                        ✓ Esta campanha já foi enviada
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
                <Button variant="outline" onClick={resetForm}>
                  Limpar
                </Button>
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
                </div>
              </div>
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
    </AdminLayout>
  );
};

export default AdminEmailMarketing;
