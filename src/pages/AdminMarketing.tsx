import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Mail, Bell, Smartphone, Users, TrendingUp, Eye, XCircle, ShieldX } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { fetchPushNotificationStats, PushNotificationStats } from "@/hooks/usePushNotificationAnalytics";

const AdminMarketing = () => {
  const navigate = useNavigate();
  const [pushStats, setPushStats] = useState<PushNotificationStats>({
    promptShown: 0,
    activatedViaPrompt: 0,
    activatedViaManual: 0,
    dismissed: 0,
    permissionDenied: 0,
    totalActivated: 0,
    totalSubscriptions: 0,
    conversionRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      const stats = await fetchPushNotificationStats();
      setPushStats(stats);
      setIsLoading(false);
    };
    loadStats();
  }, []);

  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Marketing</h1>
        <p className="text-muted-foreground mb-8">Ferramentas de divulgação e campanhas</p>

        {/* Active Tools */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
          <Card 
            className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" 
            onClick={() => navigate('/admin-email-marketing')}
          >
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="p-2 sm:p-4 bg-gradient-to-r from-primary to-purple-600 rounded-full">
                <Mail className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
              </div>
              <h2 className="text-xs sm:text-2xl font-bold text-foreground">E-mail Marketing</h2>
              <p className="text-muted-foreground hidden sm:block">Crie e envie campanhas de email</p>
            </div>
          </Card>

          <Card 
            className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" 
            onClick={() => navigate('/admin-push-notifications')}
          >
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="p-2 sm:p-4 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-full">
                <Bell className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
              </div>
              <h2 className="text-xs sm:text-2xl font-bold text-foreground">Notificações Push</h2>
              <p className="text-muted-foreground hidden sm:block">Envie notificações para o app</p>
            </div>
          </Card>
        </div>

        {/* Push Notification Analytics Dashboard */}
        <Card className="p-6 border-2 border-indigo-500/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-500/20 rounded-full">
              <Bell className="h-6 w-6 text-indigo-500" />
            </div>
            <p className="text-lg font-semibold text-foreground">Analytics de Notificações Push</p>
          </div>
          
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {/* Total Ativados */}
                <div className="bg-green-500/10 rounded-lg p-4 text-center">
                  <Smartphone className="h-5 w-5 mx-auto mb-2 text-green-500" />
                  <p className="text-3xl font-bold text-green-500">{pushStats.totalSubscriptions}</p>
                  <p className="text-xs text-muted-foreground mt-1">Dispositivos Ativos</p>
                </div>
                
                {/* Via Prompt */}
                <div className="bg-blue-500/10 rounded-lg p-4 text-center">
                  <Users className="h-5 w-5 mx-auto mb-2 text-blue-500" />
                  <p className="text-3xl font-bold text-blue-500">{pushStats.activatedViaPrompt}</p>
                  <p className="text-xs text-muted-foreground mt-1">Ativados via Prompt</p>
                </div>
                
                {/* Via Manual */}
                <div className="bg-purple-500/10 rounded-lg p-4 text-center">
                  <Users className="h-5 w-5 mx-auto mb-2 text-purple-500" />
                  <p className="text-3xl font-bold text-purple-500">{pushStats.activatedViaManual}</p>
                  <p className="text-xs text-muted-foreground mt-1">Ativados Manualmente</p>
                </div>
                
                {/* Taxa de Conversão */}
                <div className="bg-amber-500/10 rounded-lg p-4 text-center">
                  <TrendingUp className="h-5 w-5 mx-auto mb-2 text-amber-500" />
                  <p className={`text-3xl font-bold ${
                    pushStats.conversionRate >= 30 ? 'text-green-500' : 
                    pushStats.conversionRate >= 15 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {pushStats.conversionRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Taxa de Conversão</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                {/* Prompts Exibidos */}
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Eye className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xl font-bold text-foreground">{pushStats.promptShown}</p>
                  <p className="text-xs text-muted-foreground">Prompts Exibidos</p>
                </div>
                
                {/* Dispensados */}
                <div className="bg-orange-500/10 rounded-lg p-3 text-center">
                  <XCircle className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                  <p className="text-xl font-bold text-orange-500">{pushStats.dismissed}</p>
                  <p className="text-xs text-muted-foreground">Dispensaram</p>
                </div>
                
                {/* Negaram Permissão */}
                <div className="bg-red-500/10 rounded-lg p-3 text-center">
                  <ShieldX className="h-4 w-4 mx-auto mb-1 text-red-500" />
                  <p className="text-xl font-bold text-red-500">{pushStats.permissionDenied}</p>
                  <p className="text-xs text-muted-foreground">Negaram Permissão</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  📊 Conversão = usuários que ativaram via prompt / prompts exibidos
                </p>
              </div>
            </>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminMarketing;
