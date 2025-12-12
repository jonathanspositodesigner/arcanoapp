import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Save, Loader2, Mail, Eye, BarChart3, 
  MousePointerClick, Clock, CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface WelcomeTemplate {
  id: string;
  platform: string;
  subject: string;
  content: string;
  sender_name: string;
  sender_email: string;
  is_active: boolean;
}

interface WelcomeEmailLog {
  id: string;
  email: string;
  name: string | null;
  platform: string;
  sent_at: string;
  opened_at: string | null;
  clicked_at: string | null;
  open_count: number;
  click_count: number;
  status: string;
  product_info: string | null;
}

interface TemplateContent {
  heading: string;
  intro: string;
  button_text: string;
  footer: string;
}

const WelcomeEmailTemplates = () => {
  const [templates, setTemplates] = useState<WelcomeTemplate[]>([]);
  const [logs, setLogs] = useState<WelcomeEmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<"promptverso" | "artes">("promptverso");
  const [stats, setStats] = useState({
    totalSent: 0,
    totalOpened: 0,
    totalClicked: 0,
    openRate: 0,
    clickRate: 0,
  });

  const [editingTemplate, setEditingTemplate] = useState<{
    subject: string;
    sender_name: string;
    sender_email: string;
    is_active: boolean;
    content: TemplateContent;
  }>({
    subject: "",
    sender_name: "",
    sender_email: "",
    is_active: true,
    content: {
      heading: "",
      intro: "",
      button_text: "",
      footer: "",
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const template = templates.find((t) => t.platform === selectedPlatform);
    if (template) {
      let content: TemplateContent;
      try {
        content = JSON.parse(template.content);
      } catch {
        content = {
          heading: "",
          intro: "",
          button_text: "Acessar Plataforma",
          footer: "",
        };
      }
      setEditingTemplate({
        subject: template.subject,
        sender_name: template.sender_name,
        sender_email: template.sender_email,
        is_active: template.is_active,
        content,
      });
    }
  }, [selectedPlatform, templates]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch templates
    const { data: templatesData } = await supabase
      .from("welcome_email_templates")
      .select("*");

    if (templatesData) {
      setTemplates(templatesData);
    }

    // Fetch logs with pagination
    const { data: logsData } = await supabase
      .from("welcome_email_logs")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(100);

    if (logsData) {
      setLogs(logsData);

      // Calculate stats
      const totalSent = logsData.length;
      const totalOpened = logsData.filter((l) => l.opened_at).length;
      const totalClicked = logsData.filter((l) => l.clicked_at).length;

      setStats({
        totalSent,
        totalOpened,
        totalClicked,
        openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
        clickRate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0,
      });
    }

    setLoading(false);
  };

  const handleSave = async () => {
    const template = templates.find((t) => t.platform === selectedPlatform);
    if (!template) return;

    setSaving(true);

    const { error } = await supabase
      .from("welcome_email_templates")
      .update({
        subject: editingTemplate.subject,
        sender_name: editingTemplate.sender_name,
        sender_email: editingTemplate.sender_email,
        is_active: editingTemplate.is_active,
        content: JSON.stringify(editingTemplate.content),
      })
      .eq("id", template.id);

    setSaving(false);

    if (error) {
      toast.error("Erro ao salvar template");
      return;
    }

    toast.success("Template salvo com sucesso!");
    fetchData();
  };

  const platformLabels = {
    promptverso: "Promptverso",
    artes: "Biblioteca de Artes",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalSent}</p>
              <p className="text-xs text-muted-foreground">Enviados</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Eye className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalOpened}</p>
              <p className="text-xs text-muted-foreground">Abertos</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <MousePointerClick className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalClicked}</p>
              <p className="text-xs text-muted-foreground">Cliques</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <BarChart3 className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.openRate}%</p>
              <p className="text-xs text-muted-foreground">Taxa Abertura</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.clickRate}%</p>
              <p className="text-xs text-muted-foreground">Taxa Cliques</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs value={selectedPlatform} onValueChange={(v) => setSelectedPlatform(v as "promptverso" | "artes")}>
        <TabsList>
          <TabsTrigger value="promptverso">Promptverso</TabsTrigger>
          <TabsTrigger value="artes">Biblioteca de Artes</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedPlatform} className="mt-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">
                Template de Boas-Vindas - {platformLabels[selectedPlatform]}
              </h3>
              <div className="flex items-center gap-3">
                <Label>Ativo</Label>
                <Switch
                  checked={editingTemplate.is_active}
                  onCheckedChange={(checked) =>
                    setEditingTemplate({ ...editingTemplate, is_active: checked })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Form */}
              <div className="space-y-4">
                <div>
                  <Label>Assunto do email</Label>
                  <Input
                    value={editingTemplate.subject}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, subject: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome do remetente</Label>
                    <Input
                      value={editingTemplate.sender_name}
                      onChange={(e) =>
                        setEditingTemplate({ ...editingTemplate, sender_name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Email do remetente</Label>
                    <Input
                      value={editingTemplate.sender_email}
                      onChange={(e) =>
                        setEditingTemplate({ ...editingTemplate, sender_email: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label>Título do email</Label>
                  <Input
                    value={editingTemplate.content.heading}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        content: { ...editingTemplate.content, heading: e.target.value },
                      })
                    }
                    placeholder="Bem-vindo ao ArcanoApp!"
                  />
                </div>

                <div>
                  <Label>Mensagem de introdução</Label>
                  <Textarea
                    value={editingTemplate.content.intro}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        content: { ...editingTemplate.content, intro: e.target.value },
                      })
                    }
                    placeholder="Sua compra foi confirmada..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Texto do botão</Label>
                  <Input
                    value={editingTemplate.content.button_text}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        content: { ...editingTemplate.content, button_text: e.target.value },
                      })
                    }
                    placeholder="Acessar Plataforma"
                  />
                </div>

                <div>
                  <Label>Rodapé</Label>
                  <Textarea
                    value={editingTemplate.content.footer}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        content: { ...editingTemplate.content, footer: e.target.value },
                      })
                    }
                    placeholder="Se tiver dúvidas..."
                    rows={2}
                  />
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Template
                </Button>
              </div>

              {/* Preview */}
              <div>
                <Label className="mb-2 block">Preview</Label>
                <div className="border rounded-lg p-4 bg-muted/30 max-h-[500px] overflow-y-auto">
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <h2 className="text-xl font-bold text-center text-primary mb-4">
                      {editingTemplate.content.heading || "Título do email"}
                    </h2>
                    <p className="text-sm text-gray-600 mb-4">
                      {editingTemplate.content.intro || "Mensagem de introdução..."}
                    </p>
                    <div className="bg-purple-50 rounded-lg p-4 mb-4 border border-purple-200">
                      <p className="text-sm font-medium text-purple-800 mb-2">
                        📋 Dados do seu primeiro acesso:
                      </p>
                      <p className="text-sm">
                        <strong>Email:</strong> cliente@email.com
                      </p>
                      <p className="text-sm">
                        <strong>Senha:</strong>{" "}
                        <code className="bg-white px-2 py-1 rounded">cliente@email.com</code>
                      </p>
                      <p className="text-xs text-orange-700 mt-2 bg-orange-50 p-2 rounded">
                        ⚠️ Por segurança, você deverá trocar sua senha no primeiro acesso.
                      </p>
                    </div>
                    <button className="w-full bg-primary text-white py-3 rounded-lg font-medium">
                      🚀 {editingTemplate.content.button_text || "Acessar Plataforma"}
                    </button>
                    <p className="text-xs text-gray-500 text-center mt-4 pt-4 border-t">
                      {editingTemplate.content.footer || "Rodapé do email"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Logs */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Histórico de Envios Recentes
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Plataforma</th>
                <th className="pb-3 font-medium">Enviado em</th>
                <th className="pb-3 font-medium text-center">Abriu</th>
                <th className="pb-3 font-medium text-center">Clicou</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 20).map((log) => (
                <tr key={log.id} className="border-b border-border/50">
                  <td className="py-3">
                    <div>
                      <p className="font-medium">{log.email}</p>
                      {log.name && <p className="text-xs text-muted-foreground">{log.name}</p>}
                    </div>
                  </td>
                  <td className="py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        log.platform === "promptverso"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {log.platform === "promptverso" ? "Promptverso" : "Artes"}
                    </span>
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {format(new Date(log.sent_at), "dd/MM/yyyy HH:mm")}
                  </td>
                  <td className="py-3 text-center">
                    {log.opened_at ? (
                      <span className="text-green-600 font-medium">
                        ✓ {log.open_count}x
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="py-3 text-center">
                    {log.clicked_at ? (
                      <span className="text-blue-600 font-medium">
                        ✓ {log.click_count}x
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    Nenhum email de boas-vindas enviado ainda
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default WelcomeEmailTemplates;
