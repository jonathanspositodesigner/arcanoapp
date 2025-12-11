import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Mail, Smartphone, Send, Loader2 } from "lucide-react";

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

interface AnnouncementPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pushTemplate: PushTemplate | null;
  emailTemplate: EmailTemplate | null;
  onConfirmSend: () => void;
  isSending: boolean;
}

export function AnnouncementPreviewModal({
  open,
  onOpenChange,
  pushTemplate,
  emailTemplate,
  onConfirmSend,
  isSending,
}: AnnouncementPreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Prévia do Anúncio
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="push" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="push" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Push Notification
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Marketing
            </TabsTrigger>
          </TabsList>

          {/* Push Preview */}
          <TabsContent value="push" className="flex-1 overflow-y-auto mt-4">
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
          </TabsContent>

          {/* Email Preview */}
          <TabsContent value="email" className="flex-1 overflow-y-auto mt-4">
            {emailTemplate ? (
              <div className="border rounded-lg overflow-hidden bg-background">
                {/* Email header */}
                <div className="bg-muted/50 p-4 border-b">
                  <div className="space-y-2 text-sm">
                    <div className="flex">
                      <span className="text-muted-foreground w-20">De:</span>
                      <span className="font-medium">ArcanoApp &lt;contato@voxvisual.com.br&gt;</span>
                    </div>
                    <div className="flex">
                      <span className="text-muted-foreground w-20">Para:</span>
                      <span className="font-medium">Todos os clientes de Artes</span>
                    </div>
                    <div className="flex">
                      <span className="text-muted-foreground w-20">Assunto:</span>
                      <span className="font-medium">{emailTemplate.subject}</span>
                    </div>
                  </div>
                </div>
                
                {/* Email body */}
                <div className="p-6">
                  <div 
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: emailTemplate.content }}
                  />
                </div>

                <div className="bg-muted/30 p-3 border-t">
                  <p className="text-xs text-muted-foreground text-center">
                    Modelo: <span className="font-medium">{emailTemplate.name}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                <p>Nenhum modelo de Email selecionado</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancelar
          </Button>
          <Button 
            onClick={onConfirmSend} 
            disabled={isSending || !pushTemplate || !emailTemplate}
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
                Confirmar Envio
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
