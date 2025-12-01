import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

const SetupAdmin = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const setupAdmins = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup-admin-users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      
      if (data.success) {
        setResult(data);
        toast.success("Usuários admin criados com sucesso!");
      } else {
        toast.error("Erro ao criar usuários admin");
        setResult(data);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao conectar com o servidor");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 shadow-hover">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Configuração de Administradores
          </h1>
          <p className="text-muted-foreground">
            Clique no botão abaixo para criar automaticamente os usuários admin
          </p>
        </div>

        {!result && (
          <Button
            onClick={setupAdmins}
            disabled={isLoading}
            className="w-full bg-gradient-primary hover:opacity-90 text-lg py-6"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Criando usuários...
              </>
            ) : (
              "Criar Usuários Admin"
            )}
          </Button>
        )}

        {result && (
          <div className="space-y-4">
            <div className="bg-muted p-6 rounded-lg space-y-4">
              <h2 className="text-xl font-bold text-foreground mb-4">Resultados:</h2>
              
              {result.results?.map((user: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-background rounded-lg">
                  <div>
                    <p className="font-semibold">{user.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Status: {user.status === 'created' ? 'Criado' : user.status === 'already_exists' ? 'Já existia' : 'Erro'}
                    </p>
                    {user.error && (
                      <p className="text-sm text-destructive">{user.error}</p>
                    )}
                  </div>
                  {(user.status === 'created' || user.status === 'already_exists') ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-destructive" />
                  )}
                </div>
              ))}
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <p className="text-sm font-semibold mb-2">Credenciais de Login:</p>
              <div className="space-y-2 text-sm">
                <p><strong>Admin 1:</strong> david@admin.com / david</p>
                <p><strong>Admin 2:</strong> jonathan@admin.com / elozvgckc6</p>
              </div>
            </div>

            <Button
              onClick={() => navigate('/admin-login')}
              className="w-full bg-gradient-primary hover:opacity-90"
            >
              Ir para Login Admin
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SetupAdmin;
