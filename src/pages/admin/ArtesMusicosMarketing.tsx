import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Send, CheckCircle, MousePointer, AlertTriangle, RefreshCw, GripVertical, LayoutGrid, RotateCcw } from "lucide-react";
import AdminLayoutPlatform from "@/components/AdminLayoutPlatform";
import { fetchPushNotificationStats, PushNotificationStats, fetchPushCampaignStats, PushCampaignStats } from "@/hooks/usePushNotificationAnalytics";
import { useDashboardCardOrder } from "@/hooks/useDashboardCardOrder";
import { cn } from "@/lib/utils";

const ArtesMusicosMarketing = () => {
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

  const { isReordering, setIsReordering, resetOrder, getDragProps } = useDashboardCardOrder("marketing_artes_musicos");

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

  return (
    <AdminLayoutPlatform platform="artes-musicos">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-foreground">Marketing - Artes Músicos</h1>
          <div className="flex items-center gap-2">
            <Button
              variant={isReordering ? "default" : "outline"}
              size="sm"
              onClick={() => setIsReordering(!isReordering)}
              className="gap-2"
            >
              <LayoutGrid className="h-4 w-4" />
              {isReordering ? "Concluir" : "Reorganizar"}
            </Button>
            {isReordering && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetOrder}
                className="gap-2 text-muted-foreground"
              >
                <RotateCcw className="h-4 w-4" />
                Resetar
              </Button>
            )}
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
        </div>
        <p className="text-muted-foreground mb-4">Ferramentas de divulgação e campanhas</p>

        {isReordering && (
          <div className="mb-4 p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg text-center">
            <p className="text-sm text-violet-600 font-medium">
              🔄 Arraste os cards para reordenar
            </p>
          </div>
        )}

        {/* Active Tools */}
        <div className={cn(
          "grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8",
          isReordering && "[&>*]:ring-2 [&>*]:ring-violet-500/20 [&>*]:hover:ring-violet-500/40"
        )}>
          <Card 
            className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105 relative" 
            onClick={() => !isReordering && navigate('/admin-push-notifications')}
            {...getDragProps("push-notifications")}
          >
            {isReordering && (
              <div className="absolute top-2 right-2 z-10 p-1 bg-violet-500/20 rounded-md">
                <GripVertical className="h-4 w-4 text-violet-500" />
              </div>
            )}
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="p-2 sm:p-4 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-full">
                <Bell className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
              </div>
              <h2 className="text-xs sm:text-2xl font-bold text-foreground">Notificações Push</h2>
              <p className="text-muted-foreground hidden sm:block">Envie notificações para o app</p>
            </div>
          </Card>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando analytics...</div>
        ) : (
          <div className={cn(
            "space-y-6",
            isReordering && "[&>*]:ring-2 [&>*]:ring-violet-500/20 [&>*]:hover:ring-violet-500/40"
          )}>
            {/* Push Notification Analytics */}
            <Card className="p-6 border-2 border-violet-500/30 relative" {...getDragProps("push-analytics")}>
              {isReordering && (
                <div className="absolute top-2 right-2 z-10 p-1 bg-violet-500/20 rounded-md">
                  <GripVertical className="h-4 w-4 text-violet-500" />
                </div>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-violet-500/20 rounded-full">
                  <Bell className="h-6 w-6 text-violet-500" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">Analytics de Notificações Push</p>
                  <p className="text-xs text-muted-foreground">{pushCampaignStats.totalCampaigns} campanhas enviadas</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-500/10 rounded-lg p-4 text-center">
                  <Send className="h-5 w-5 mx-auto mb-2 text-blue-500" />
                  <p className="text-3xl font-bold text-blue-500">{pushCampaignStats.totalSent.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Push Enviados</p>
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
                  <p className="text-xs text-muted-foreground mt-1">Falhas</p>
                </div>
                
                <div className="bg-amber-500/10 rounded-lg p-4 text-center">
                  <MousePointer className="h-5 w-5 mx-auto mb-2 text-amber-500" />
                  <p className="text-3xl font-bold text-amber-500">{pushCampaignStats.totalClicked.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Clicaram</p>
                  <p className="text-xs font-medium text-amber-600">{pushCampaignStats.clickRate.toFixed(1)}%</p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayoutPlatform>
  );
};

export default ArtesMusicosMarketing;
