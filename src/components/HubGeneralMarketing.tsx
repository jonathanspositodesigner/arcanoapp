import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Eye, Send, CheckCircle, MousePointer, AlertTriangle, RefreshCw, ShoppingCart } from "lucide-react";
import { fetchPushNotificationStats, PushNotificationStats, fetchPushCampaignStats, PushCampaignStats } from "@/hooks/usePushNotificationAnalytics";
import { HubViewType } from "./AdminHubSidebar";

interface HubGeneralMarketingProps {
  onNavigate?: (view: HubViewType) => void;
}

const HubGeneralMarketing = ({ onNavigate }: HubGeneralMarketingProps) => {
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
  
  const [pushCampaignStats, setPushCampaignStats] = useState<PushCampaignStats>({
    totalCampaigns: 0,
    totalSent: 0,
    totalDelivered: 0,
    totalFailed: 0,
    totalClicked: 0,
    deliveryRate: 0,
    clickRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    const [push, pushCampaign] = await Promise.all([
      fetchPushNotificationStats(),
      fetchPushCampaignStats()
    ]);
    setPushStats(push);
    setPushCampaignStats(pushCampaign);
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadStats();
      setIsLoading(false);
    };
    init();
  }, [loadStats]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadStats();
    setIsRefreshing(false);
  };

  const handleCardClick = (view: HubViewType) => {
    if (onNavigate) {
      onNavigate(view);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold text-foreground">Marketing Geral</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>
      <p className="text-muted-foreground mb-6">Visão consolidada de todas as plataformas</p>

      {/* Active Tools */}
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-6 mb-8">
        <Card 
          className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" 
          onClick={() => handleCardClick("push-notifications")}
        >
          <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
            <div className="p-2 sm:p-4 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-full">
              <Bell className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
            </div>
            <h2 className="text-xs sm:text-2xl font-bold text-foreground">Notificações Push</h2>
            <p className="text-muted-foreground hidden sm:block">Envie notificações para o app</p>
          </div>
        </Card>

        <Card 
          className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" 
          onClick={() => handleCardClick("abandoned-checkouts")}
        >
          <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
            <div className="p-2 sm:p-4 bg-gradient-to-r from-red-500 to-orange-600 rounded-full">
              <ShoppingCart className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
            </div>
            <h2 className="text-xs sm:text-2xl font-bold text-foreground">Checkouts Abandonados</h2>
            <p className="text-muted-foreground hidden sm:block">Remarketing de carrinhos</p>
          </div>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando analytics...</div>
      ) : (
        <div className="space-y-6">
          {/* Push Notification Analytics */}
          <Card className="p-6 border-2 border-yellow-500/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-500/20 rounded-full">
                <Bell className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Analytics de Push Notifications</p>
                <p className="text-xs text-muted-foreground">{pushCampaignStats.totalCampaigns} campanhas enviadas</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-yellow-500/10 rounded-lg p-4 text-center">
                <Send className="h-5 w-5 mx-auto mb-2 text-yellow-600" />
                <p className="text-3xl font-bold text-yellow-600">{pushCampaignStats.totalSent.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Enviados</p>
              </div>
              
              <div className="bg-green-500/10 rounded-lg p-4 text-center">
                <CheckCircle className="h-5 w-5 mx-auto mb-2 text-green-500" />
                <p className="text-3xl font-bold text-green-500">{pushCampaignStats.totalDelivered.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Entregues</p>
                <p className="text-xs font-medium text-green-600">{pushCampaignStats.deliveryRate.toFixed(1)}%</p>
              </div>
              
              <div className="bg-red-500/10 rounded-lg p-4 text-center">
                <AlertTriangle className="h-5 w-5 mx-auto mb-2 text-red-500" />
                <p className="text-3xl font-bold text-red-500">{pushCampaignStats.totalFailed.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Falharam</p>
              </div>
              
              <div className="bg-purple-500/10 rounded-lg p-4 text-center">
                <MousePointer className="h-5 w-5 mx-auto mb-2 text-purple-500" />
                <p className="text-3xl font-bold text-purple-500">{pushCampaignStats.totalClicked.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Clicaram</p>
                <p className="text-xs font-medium text-purple-600">{pushCampaignStats.clickRate.toFixed(1)}%</p>
              </div>
            </div>
          </Card>

          {/* Push Subscription Stats */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-500/20 rounded-full">
                <Bell className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Assinaturas de Notificações Push</p>
                <p className="text-xs text-muted-foreground">{pushStats.totalSubscriptions} dispositivos inscritos</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-500/10 rounded-lg p-4 text-center">
                <CheckCircle className="h-5 w-5 mx-auto mb-2 text-green-500" />
                <p className="text-3xl font-bold text-green-500">{pushStats.totalActivated}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Ativados</p>
              </div>
              
              <div className="bg-blue-500/10 rounded-lg p-4 text-center">
                <Eye className="h-5 w-5 mx-auto mb-2 text-blue-500" />
                <p className="text-3xl font-bold text-blue-500">{pushStats.promptShown}</p>
                <p className="text-xs text-muted-foreground mt-1">Viram o Prompt</p>
              </div>
              
              <div className="bg-purple-500/10 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-purple-500">{pushStats.conversionRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground mt-1">Taxa de Conversão</p>
              </div>
              
              <div className="bg-red-500/10 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-red-500">{pushStats.dismissed}</p>
                <p className="text-xs text-muted-foreground mt-1">Recusaram</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default HubGeneralMarketing;
