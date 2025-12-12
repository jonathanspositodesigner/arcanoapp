import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Save, Check, Pencil, Trash2, X } from "lucide-react";
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

interface AnnouncementConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPushTemplate: (template: PushTemplate | null) => void;
  selectedPushTemplate: PushTemplate | null;
}

export function AnnouncementConfigModal({
  open,
  onOpenChange,
  onSelectPushTemplate,
  selectedPushTemplate,
}: AnnouncementConfigModalProps) {
  const [pushTemplates, setPushTemplates] = useState<PushTemplate[]>([]);
  const [usePushTemplate, setUsePushTemplate] = useState(true);
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushUrl, setPushUrl] = useState("");
  const [selectedPushId, setSelectedPushId] = useState<string | null>(null);
  const [editingPushId, setEditingPushId] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (open) {
      fetchPushTemplates();
    }
  }, [open]);

  useEffect(() => {
    if (selectedPushTemplate) {
      setSelectedPushId(selectedPushTemplate.id);
    }
  }, [selectedPushTemplate]);

  const fetchPushTemplates = async () => {
    const { data } = await supabase
      .from("push_notification_templates")
      .select("*")
      .order("created_at", { ascending: false });
    setPushTemplates(data || []);
  };

  const handleSavePushTemplate = async () => {
    if (!pushTitle.trim() || !pushBody.trim()) {
      toast.error("Título e corpo são obrigatórios");
      return;
    }
    
    if (editingPushId) {
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

  const handleEditPush = (template: PushTemplate) => {
    setEditingPushId(template.id);
    setPushTitle(template.title);
    setPushBody(template.body);
    setPushUrl(template.url || "");
    setUsePushTemplate(false);
  };

  const handleDeletePush = async () => {
    if (!deleteConfirm) return;
    
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

  const resetPushForm = () => {
    setPushTitle("");
    setPushBody("");
    setPushUrl("");
    setEditingPushId(null);
    setUsePushTemplate(true);
  };

  const handleSelectPush = (template: PushTemplate) => {
    setSelectedPushId(template.id);
    onSelectPushTemplate(template);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Configurar Push Notification
            </DialogTitle>
            <DialogDescription>
              Configure o modelo de notificação push para anunciar atualizações
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
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
                              setDeleteConfirm({ id: template.id, name: template.name });
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
                  <div className="flex items-center justify-between bg-muted/50 p-2 rounded-lg">
                    <span className="text-sm">Editando modelo...</span>
                    <Button variant="ghost" size="sm" onClick={resetPushForm}>
                      <X className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Título da Notificação</Label>
                  <Input
                    value={pushTitle}
                    onChange={(e) => setPushTitle(e.target.value)}
                    placeholder="🎨 Novidades chegaram!"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Corpo da Notificação</Label>
                  <Textarea
                    value={pushBody}
                    onChange={(e) => setPushBody(e.target.value)}
                    placeholder="Confira as novas artes disponíveis na sua biblioteca!"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>URL ao clicar (opcional)</Label>
                  <Input
                    value={pushUrl}
                    onChange={(e) => setPushUrl(e.target.value)}
                    placeholder="/biblioteca-artes"
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

            {selectedPushId && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  ✓ Modelo selecionado: <span className="font-medium text-foreground">
                    {pushTemplates.find(t => t.id === selectedPushId)?.name}
                  </span>
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o modelo "{deleteConfirm?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePush} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export type { PushTemplate };
