import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, Smartphone, Send, Loader2 } from "lucide-react";

interface PushTemplate {
  id: string;
  name: string;
  title: string;
  body: string;
  url: string | null;
}

interface AnnouncementPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pushTemplate: PushTemplate | null;
  onConfirmSend: () => void;
  isSending: boolean;
}

export function AnnouncementPreviewModal({
  open,
  onOpenChange,
  pushTemplate,
  onConfirmSend,
  isSending,
}: AnnouncementPreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Prévia do Push Notification
          </DialogTitle>
          <DialogDescription>
            Confira como a notificação será exibida para os usuários
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {pushTemplate ? (
            <div className="flex justify-center">
              {/* Phone mockup */}
              <div className="w-[320px] bg-secondary rounded-[2.5rem] p-3 shadow-xl">
                <div className="bg-background rounded-[2rem] overflow-hidden">
                  {/* Phone status bar */}
                  <div className="bg-muted/50 px-6 py-2 flex justify-between items-center text-xs text-muted-foreground">
                    <span>9:41</span>
                    <div className="flex items-center gap-1">
                      <span>📶</span>
                      <span>🔋</span>
                    </div>
                  </div>
                  
                  {/* Notification */}
                  <div className="p-4">
                    <div className="bg-secondary/80 backdrop-blur rounded-2xl p-4 shadow-lg border border-border">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Smartphone className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-sm text-foreground">ArcanoApp</span>
                            <span className="text-xs text-muted-foreground">agora</span>
                          </div>
                          <p className="font-medium text-foreground mt-1">
                            {pushTemplate.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-3">
                            {pushTemplate.body}
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground text-center mt-4">
                      Modelo: <span className="font-medium">{pushTemplate.name}</span>
                    </p>
                    {pushTemplate.url && (
                      <p className="text-xs text-muted-foreground text-center mt-1">
                        Link: <span className="font-medium text-primary">{pushTemplate.url}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              <p>Nenhum modelo de Push selecionado</p>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancelar
          </Button>
          <Button 
            onClick={onConfirmSend} 
            disabled={isSending || !pushTemplate}
            className="bg-gradient-primary"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Push
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
