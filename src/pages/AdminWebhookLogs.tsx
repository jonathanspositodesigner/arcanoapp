import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, AlertCircle } from "lucide-react";

const AdminWebhookLogs = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => navigate('/admin-artes-eventos/ferramentas')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">Logs de Webhook</h1>
            <p className="text-muted-foreground">
              Histórico de webhooks recebidos
            </p>
          </div>
        </div>

        <Card className="p-8">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Logs Desativados
              </h2>
              <p className="text-muted-foreground max-w-md">
                Os logs de webhook foram desativados para economizar recursos de armazenamento 
                e reduzir custos operacionais. Os webhooks continuam funcionando normalmente 
                para ativar/desativar planos.
              </p>
            </div>
            <div className="pt-4">
              <Button variant="outline" onClick={() => navigate('/admin-artes-eventos/ferramentas')}>
                Voltar para Ferramentas
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminWebhookLogs;
