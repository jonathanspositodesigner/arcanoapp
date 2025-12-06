import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send, Bell, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminPushNotifications = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/biblioteca-prompts");

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/admin-login');
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        toast.error("Acesso negado");
        navigate('/');
        return;
      }

      setIsAdmin(true);
      
      // Get subscriber count
      const { count } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true });
      
      setSubscriberCount(count || 0);
      setIsLoading(false);
    };

    checkAdminStatus();
  }, [navigate]);

  const handleSendNotification = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Preencha o título e a mensagem");
      return;
    }

    setIsSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Sessão expirada");
        return;
      }

      const response = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: title.trim(),
          body: body.trim(),
          url: url.trim() || '/biblioteca-prompts'
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      
      toast.success(`Notificação enviada! ${result.results.success} enviados, ${result.results.failed} falharam`);
      
      // Clear form
      setTitle("");
      setBody("");
      setUrl("/biblioteca-prompts");
      
      // Refresh subscriber count
      const { count } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true });
      setSubscriberCount(count || 0);
      
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast.error(`Erro ao enviar: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Carregando...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin-dashboard')}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Painel
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Bell className="h-10 w-10 text-primary" />
            Notificações Push
          </h1>
          <p className="text-muted-foreground text-lg">
            Envie notificações para todos os usuários inscritos
          </p>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 text-lg">
            <Users className="h-6 w-6 text-primary" />
            <span className="font-medium">{subscriberCount}</span>
            <span className="text-muted-foreground">usuários inscritos</span>
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Título da Notificação</Label>
            <Input
              id="title"
              placeholder="Ex: Novos prompts disponíveis!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">{title.length}/50 caracteres</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Mensagem</Label>
            <Textarea
              id="body"
              placeholder="Ex: Confira os novos selos 3D que acabamos de adicionar!"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">{body.length}/200 caracteres</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL de destino (opcional)</Label>
            <Input
              id="url"
              placeholder="/biblioteca-prompts"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Página que abrirá quando o usuário clicar na notificação
            </p>
          </div>

          <Button
            onClick={handleSendNotification}
            disabled={isSending || !title.trim() || !body.trim() || subscriberCount === 0}
            className="w-full gap-2 bg-gradient-primary"
            size="lg"
          >
            {isSending ? (
              <>Enviando...</>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Enviar Notificação
              </>
            )}
          </Button>

          {subscriberCount === 0 && (
            <p className="text-center text-muted-foreground text-sm">
              Nenhum usuário inscrito para receber notificações
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminPushNotifications;
