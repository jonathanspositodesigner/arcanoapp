import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Mail, Save, Check } from "lucide-react";

interface PushTemplate {
  id: string;
  name: string;
  title: string;
  body: string;
  url: string | null;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
}

interface AnnouncementConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPushTemplate: (template: PushTemplate | null) => void;
  onSelectEmailTemplate: (template: EmailTemplate | null) => void;
  selectedPushTemplate: PushTemplate | null;
  selectedEmailTemplate: EmailTemplate | null;
}

export function AnnouncementConfigModal({
  open,
  onOpenChange,
  onSelectPushTemplate,
  onSelectEmailTemplate,
  selectedPushTemplate,
  selectedEmailTemplate,
}: AnnouncementConfigModalProps) {
  const [activeTab, setActiveTab] = useState<"push" | "email">("push");
  
  // Push state
  const [pushTemplates, setPushTemplates] = useState<PushTemplate[]>([]);
  const [usePushTemplate, setUsePushTemplate] = useState(true);
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushUrl, setPushUrl] = useState("");
  const [selectedPushId, setSelectedPushId] = useState<string | null>(null);
  
  // Email state
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [useEmailTemplate, setUseEmailTemplate] = useState(true);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPushTemplates();
      fetchEmailTemplates();
    }
  }, [open]);

  useEffect(() => {
    if (selectedPushTemplate) {
      setSelectedPushId(selectedPushTemplate.id);
    }
    if (selectedEmailTemplate) {
      setSelectedEmailId(selectedEmailTemplate.id);
    }
  }, [selectedPushTemplate, selectedEmailTemplate]);

  const fetchPushTemplates = async () => {
    const { data } = await supabase
      .from("push_notification_templates")
      .select("*")
      .order("created_at", { ascending: false });
    setPushTemplates(data || []);
  };

  const fetchEmailTemplates = async () => {
    const { data } = await supabase
      .from("email_templates")
      .select("*")
      .order("created_at", { ascending: false });
    setEmailTemplates(data || []);
  };

  const handleSavePushTemplate = async () => {
    if (!pushTitle.trim() || !pushBody.trim()) {
      toast.error("Título e corpo são obrigatórios");
      return;
    }
    
    const name = prompt("Digite o nome do modelo:");
    if (!name?.trim()) return;
    
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from("push_notification_templates")
        .insert({
          name: name.trim(),
          title: pushTitle,
          body: pushBody,
          url: pushUrl || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success("Modelo de push salvo!");
      fetchPushTemplates();
      setPushTitle("");
      setPushBody("");
      setPushUrl("");
      setUsePushTemplate(true);
      if (data) {
        setSelectedPushId(data.id);
        onSelectPushTemplate(data);
      }
    } catch (error) {
      console.error("Error saving push template:", error);
      toast.error("Erro ao salvar modelo");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEmailTemplate = async () => {
    if (!emailSubject.trim() || !emailContent.trim()) {
      toast.error("Assunto e conteúdo são obrigatórios");
      return;
    }
    
    const name = prompt("Digite o nome do modelo:");
    if (!name?.trim()) return;
    
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .insert({
          name: name.trim(),
          subject: emailSubject,
          content: emailContent,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success("Modelo de email salvo!");
      fetchEmailTemplates();
      setEmailSubject("");
      setEmailContent("");
      setUseEmailTemplate(true);
      if (data) {
        setSelectedEmailId(data.id);
        onSelectEmailTemplate(data);
      }
    } catch (error) {
      console.error("Error saving email template:", error);
      toast.error("Erro ao salvar modelo");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectPush = (template: PushTemplate) => {
    setSelectedPushId(template.id);
    onSelectPushTemplate(template);
  };

  const handleSelectEmail = (template: EmailTemplate) => {
    setSelectedEmailId(template.id);
    onSelectEmailTemplate(template);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Modelos de Anúncio</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "push" | "email")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="push" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Push
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
          </TabsList>

          {/* Push Tab */}
          <TabsContent value="push" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <Label>Selecionar modelo pronto</Label>
              <Switch
                checked={usePushTemplate}
                onCheckedChange={setUsePushTemplate}
              />
            </div>

            {usePushTemplate ? (
              <div className="space-y-2">
                {pushTemplates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum modelo salvo. Desative o switch para criar um novo.
                  </p>
                ) : (
                  <RadioGroup value={selectedPushId || ""} onValueChange={(val) => {
                    const template = pushTemplates.find(t => t.id === val);
                    if (template) handleSelectPush(template);
                  }}>
                    {pushTemplates.map((template) => (
                      <div
                        key={template.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedPushId === template.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => handleSelectPush(template)}
                      >
                        <RadioGroupItem value={template.id} id={template.id} />
                        <div className="flex-1">
                          <p className="font-medium">{template.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {template.title}
                          </p>
                        </div>
                        {selectedPushId === template.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="push-title">Título</Label>
                  <Input
                    id="push-title"
                    value={pushTitle}
                    onChange={(e) => setPushTitle(e.target.value)}
                    placeholder="Ex: Novas Atualizações!"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="push-body">Corpo da mensagem</Label>
                  <Textarea
                    id="push-body"
                    value={pushBody}
                    onChange={(e) => setPushBody(e.target.value)}
                    placeholder="Ex: Confira as novidades que acabaram de chegar..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="push-url">URL (opcional)</Label>
                  <Input
                    id="push-url"
                    value={pushUrl}
                    onChange={(e) => setPushUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={handleSavePushTemplate}
                  disabled={isSaving}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Modelo
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <Label>Selecionar modelo pronto</Label>
              <Switch
                checked={useEmailTemplate}
                onCheckedChange={setUseEmailTemplate}
              />
            </div>

            {useEmailTemplate ? (
              <div className="space-y-2">
                {emailTemplates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum modelo salvo. Desative o switch para criar um novo.
                  </p>
                ) : (
                  <RadioGroup value={selectedEmailId || ""} onValueChange={(val) => {
                    const template = emailTemplates.find(t => t.id === val);
                    if (template) handleSelectEmail(template);
                  }}>
                    {emailTemplates.map((template) => (
                      <div
                        key={template.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedEmailId === template.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => handleSelectEmail(template)}
                      >
                        <RadioGroupItem value={template.id} id={template.id} />
                        <div className="flex-1">
                          <p className="font-medium">{template.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {template.subject}
                          </p>
                        </div>
                        {selectedEmailId === template.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email-subject">Assunto</Label>
                  <Input
                    id="email-subject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Ex: 🎉 Novidades na plataforma!"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email-content">Conteúdo (HTML)</Label>
                  <Textarea
                    id="email-content"
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    placeholder="<h1>Olá!</h1><p>Confira as novidades...</p>"
                    className="mt-1 min-h-[150px] font-mono text-sm"
                  />
                </div>
                <Button
                  onClick={handleSaveEmailTemplate}
                  disabled={isSaving}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Modelo
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-4 p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">
            <strong>Modelos selecionados:</strong>
          </p>
          <div className="flex flex-col gap-1 mt-2 text-sm">
            <p>
              Push: {selectedPushTemplate ? (
                <span className="text-primary font-medium">{selectedPushTemplate.name}</span>
              ) : (
                <span className="text-destructive">Nenhum selecionado</span>
              )}
            </p>
            <p>
              Email: {selectedEmailTemplate ? (
                <span className="text-primary font-medium">{selectedEmailTemplate.name}</span>
              ) : (
                <span className="text-destructive">Nenhum selecionado</span>
              )}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
