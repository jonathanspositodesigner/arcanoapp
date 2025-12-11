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
import { Bell, Mail, Save, Check, Pencil, Trash2, X } from "lucide-react";
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
  const [editingPushId, setEditingPushId] = useState<string | null>(null);
  
  // Email state
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [useEmailTemplate, setUseEmailTemplate] = useState(true);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "push" | "email"; id: string; name: string } | null>(null);

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
    
    if (editingPushId) {
      // Update existing
      setIsSaving(true);
      try {
        const { data, error } = await supabase
          .from("push_notification_templates")
          .update({
            title: pushTitle,
            body: pushBody,
            url: pushUrl || null,
          })
          .eq("id", editingPushId)
          .select()
          .single();
        
        if (error) throw error;
        
        toast.success("Modelo atualizado!");
        fetchPushTemplates();
        resetPushForm();
        if (data && selectedPushId === editingPushId) {
          onSelectPushTemplate(data);
        }
      } catch (error) {
        console.error("Error updating push template:", error);
        toast.error("Erro ao atualizar modelo");
      } finally {
        setIsSaving(false);
      }
    } else {
      // Create new
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
        resetPushForm();
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
    }
  };

  const handleSaveEmailTemplate = async () => {
    if (!emailSubject.trim() || !emailContent.trim()) {
      toast.error("Assunto e conteúdo são obrigatórios");
      return;
    }
    
    if (editingEmailId) {
      // Update existing
      setIsSaving(true);
      try {
        const { data, error } = await supabase
          .from("email_templates")
          .update({
            subject: emailSubject,
            content: emailContent,
          })
          .eq("id", editingEmailId)
          .select()
          .single();
        
        if (error) throw error;
        
        toast.success("Modelo atualizado!");
        fetchEmailTemplates();
        resetEmailForm();
        if (data && selectedEmailId === editingEmailId) {
          onSelectEmailTemplate(data);
        }
      } catch (error) {
        console.error("Error updating email template:", error);
        toast.error("Erro ao atualizar modelo");
      } finally {
        setIsSaving(false);
      }
    } else {
      // Create new
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
        resetEmailForm();
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
    }
  };

  const handleEditPush = (template: PushTemplate) => {
    setEditingPushId(template.id);
    setPushTitle(template.title);
    setPushBody(template.body);
    setPushUrl(template.url || "");
    setUsePushTemplate(false);
  };

  const handleEditEmail = (template: EmailTemplate) => {
    setEditingEmailId(template.id);
    setEmailSubject(template.subject);
    setEmailContent(template.content);
    setUseEmailTemplate(false);
  };

  const handleDeletePush = async () => {
    if (!deleteConfirm || deleteConfirm.type !== "push") return;
    
    try {
      const { error } = await supabase
        .from("push_notification_templates")
        .delete()
        .eq("id", deleteConfirm.id);
      
      if (error) throw error;
      
      toast.success("Modelo excluído!");
      fetchPushTemplates();
      if (selectedPushId === deleteConfirm.id) {
        setSelectedPushId(null);
        onSelectPushTemplate(null);
      }
    } catch (error) {
      console.error("Error deleting push template:", error);
      toast.error("Erro ao excluir modelo");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleDeleteEmail = async () => {
    if (!deleteConfirm || deleteConfirm.type !== "email") return;
    
    try {
      const { error } = await supabase
        .from("email_templates")
        .delete()
        .eq("id", deleteConfirm.id);
      
      if (error) throw error;
      
      toast.success("Modelo excluído!");
      fetchEmailTemplates();
      if (selectedEmailId === deleteConfirm.id) {
        setSelectedEmailId(null);
        onSelectEmailTemplate(null);
      }
    } catch (error) {
      console.error("Error deleting email template:", error);
      toast.error("Erro ao excluir modelo");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const resetPushForm = () => {
    setPushTitle("");
    setPushBody("");
    setPushUrl("");
    setEditingPushId(null);
    setUsePushTemplate(true);
  };

  const resetEmailForm = () => {
    setEmailSubject("");
    setEmailContent("");
    setEditingEmailId(null);
    setUseEmailTemplate(true);
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
    <>
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
                  onCheckedChange={(checked) => {
                    setUsePushTemplate(checked);
                    if (checked) resetPushForm();
                  }}
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
                        >
                          <RadioGroupItem value={template.id} id={template.id} onClick={() => handleSelectPush(template)} />
                          <div className="flex-1 min-w-0" onClick={() => handleSelectPush(template)}>
                            <p className="font-medium">{template.name}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {template.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {selectedPushId === template.id && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditPush(template);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm({ type: "push", id: template.id, name: template.name });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {editingPushId && (
                    <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Editando modelo</span>
                      <Button variant="ghost" size="sm" onClick={resetPushForm}>
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  )}
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
                    {editingPushId ? "Atualizar Modelo" : "Salvar Modelo"}
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
                  onCheckedChange={(checked) => {
                    setUseEmailTemplate(checked);
                    if (checked) resetEmailForm();
                  }}
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
                        >
                          <RadioGroupItem value={template.id} id={template.id} onClick={() => handleSelectEmail(template)} />
                          <div className="flex-1 min-w-0" onClick={() => handleSelectEmail(template)}>
                            <p className="font-medium">{template.name}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {template.subject}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {selectedEmailId === template.id && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditEmail(template);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm({ type: "email", id: template.id, name: template.name });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {editingEmailId && (
                    <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Editando modelo</span>
                      <Button variant="ghost" size="sm" onClick={resetEmailForm}>
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  )}
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
                    {editingEmailId ? "Atualizar Modelo" : "Salvar Modelo"}
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

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o modelo "{deleteConfirm?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirm?.type === "push") handleDeletePush();
                else handleDeleteEmail();
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
