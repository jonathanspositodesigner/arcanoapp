import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, Bell, Smartphone, Users, TrendingUp, Eye, XCircle, ShieldX, Send, CheckCircle, MousePointer, AlertTriangle, RefreshCw, Trophy, GripVertical, LayoutGrid, RotateCcw } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { fetchPushNotificationStats, PushNotificationStats } from "@/hooks/usePushNotificationAnalytics";
import { useEmailMarketingStats, fetchTopEmailCampaigns, fetchTopPushCampaigns, TopEmailCampaign, TopPushCampaign } from "@/hooks/useEmailMarketingAnalytics";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDashboardCardOrder } from "@/hooks/useDashboardCardOrder";
import { cn } from "@/lib/utils";

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
  // Use the real-time email stats hook
  const { stats: emailStats, loading: emailLoading, refresh: refreshEmailStats } = useEmailMarketingStats();
  
  const [topEmailCampaigns, setTopEmailCampaigns] = useState<TopEmailCampaign[]>([]);
  const [topPushCampaigns, setTopPushCampaigns] = useState<TopPushCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    const [push, topEmail, topPush] = await Promise.all([
      fetchPushNotificationStats(),
      fetchTopEmailCampaigns(5),
      fetchTopPushCampaigns(5)
    ]);
    setPushStats(push);
    setTopEmailCampaigns(topEmail);
    setTopPushCampaigns(topPush);
  }, []);

  // Drag and drop
  const { isReordering, setIsReordering, resetOrder, getDragProps } = useDashboardCardOrder("marketing");

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
    await Promise.all([loadStats(), refreshEmailStats()]);
    setIsRefreshing(false);
  };

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-foreground">Marketing</h1>
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
          <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg text-center">
            <p className="text-sm text-primary font-medium">
              🔄 Arraste os cards para reordenar
            </p>
          </div>
        )}

        {/* Active Tools */}
        <div className={cn(
          "grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8",
          isReordering && "[&>*]:ring-2 [&>*]:ring-primary/20 [&>*]:hover:ring-primary/40"
        )}>
          <Card 
            className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105 relative" 
            onClick={() => !isReordering && navigate('/admin-email-marketing')}
            {...getDragProps("email-marketing")}
          >
            {isReordering && (
              <div className="absolute top-2 right-2 z-10 p-1 bg-primary/20 rounded-md">
                <GripVertical className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="p-2 sm:p-4 bg-gradient-to-r from-primary to-purple-600 rounded-full">
                <Mail className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
              </div>
              <h2 className="text-xs sm:text-2xl font-bold text-foreground">E-mail Marketing</h2>
              <p className="text-muted-foreground hidden sm:block">Crie e envie campanhas de email</p>
            </div>
          </Card>

          <Card 
            className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105 relative" 
            onClick={() => !isReordering && navigate('/admin-push-notifications')}
            {...getDragProps("push-notifications")}
          >
            {isReordering && (
              <div className="absolute top-2 right-2 z-10 p-1 bg-primary/20 rounded-md">
                <GripVertical className="h-4 w-4 text-primary" />
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
            isReordering && "[&>*]:ring-2 [&>*]:ring-primary/20 [&>*]:hover:ring-primary/40"
          )}>
            {/* Email Marketing Analytics Dashboard */}
            <Card 
              className="p-6 border-2 border-primary/30 relative"
              {...getDragProps("email-analytics")}
            >
              {isReordering && (
                <div className="absolute top-2 right-2 z-10 p-1 bg-primary/20 rounded-md">
                  <GripVertical className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/20 rounded-full">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">Analytics de E-mail Marketing</p>
                  <p className="text-xs text-muted-foreground">{emailStats.totalCampaigns} campanhas enviadas</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {/* Total Enviados */}
                <div className="bg-blue-500/10 rounded-lg p-4 text-center">
                  <Send className="h-5 w-5 mx-auto mb-2 text-blue-500" />
                  <p className="text-3xl font-bold text-blue-500">{emailStats.totalSent.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Emails Enviados</p>
                </div>
                
                {/* Entregues */}
                <div className="bg-green-500/10 rounded-lg p-4 text-center">
                  <CheckCircle className="h-5 w-5 mx-auto mb-2 text-green-500" />
                  <p className="text-3xl font-bold text-green-500">{emailStats.totalDelivered.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Entregues</p>
                  <p className="text-xs font-medium text-green-600">{emailStats.deliveryRate.toFixed(1)}%</p>
                </div>
                
                {/* Abertos */}
                <div className="bg-purple-500/10 rounded-lg p-4 text-center">
                  <Eye className="h-5 w-5 mx-auto mb-2 text-purple-500" />
                  <p className="text-3xl font-bold text-purple-500">{emailStats.totalOpened.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Abertos</p>
                  <p className="text-xs font-medium text-purple-600">{emailStats.openRate.toFixed(1)}%</p>
                </div>
                
                {/* Clicados */}
                <div className="bg-amber-500/10 rounded-lg p-4 text-center">
                  <MousePointer className="h-5 w-5 mx-auto mb-2 text-amber-500" />
                  <p className="text-3xl font-bold text-amber-500">{emailStats.totalClicked.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Clicaram</p>
                  <p className="text-xs font-medium text-amber-600">{emailStats.clickRate.toFixed(1)}%</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Bounced */}
                <div className="bg-red-500/10 rounded-lg p-3 text-center">
                  <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-red-500" />
                  <p className="text-xl font-bold text-red-500">{emailStats.totalBounced}</p>
                  <p className="text-xs text-muted-foreground">Bounces ({emailStats.bounceRate.toFixed(1)}%)</p>
                </div>
                
                {/* Spam */}
                <div className="bg-orange-500/10 rounded-lg p-3 text-center">
                  <ShieldX className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                  <p className="text-xl font-bold text-orange-500">{emailStats.totalComplained}</p>
                  <p className="text-xs text-muted-foreground">Marcaram como Spam</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  📧 Taxa de abertura = abertos / entregues • Taxa de clique = cliques / abertos
                </p>
              </div>
            </Card>

            {/* Top Email Campaigns */}
            <Card 
              className="p-6 relative"
              {...getDragProps("top-email")}
            >
              {isReordering && (
                <div className="absolute top-2 right-2 z-10 p-1 bg-primary/20 rounded-md">
                  <GripVertical className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-500/20 rounded-full">
                  <Trophy className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">Top 5 Campanhas de E-mail</p>
                  <p className="text-xs text-muted-foreground">Melhores taxas de clique</p>
                </div>
              </div>
              
              {topEmailCampaigns.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Campanha</TableHead>
                        <TableHead className="text-center">Enviados</TableHead>
                        <TableHead className="text-center">Abertos</TableHead>
                        <TableHead className="text-center">Cliques</TableHead>
                        <TableHead className="text-center">Taxa Clique</TableHead>
                        <TableHead className="text-right">Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topEmailCampaigns.map((campaign, index) => (
                        <TableRow key={campaign.id}>
                          <TableCell className="font-bold text-amber-500">
                            {index + 1}º
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground truncate max-w-[200px]">{campaign.title}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{campaign.subject}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{campaign.sent_count}</TableCell>
                          <TableCell className="text-center">{campaign.opened_count}</TableCell>
                          <TableCell className="text-center">{campaign.clicked_count}</TableCell>
                          <TableCell className="text-center">
                            <span className={`font-bold ${campaign.clickRate >= 5 ? 'text-green-500' : campaign.clickRate >= 2 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                              {campaign.clickRate.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {campaign.sent_at ? format(new Date(campaign.sent_at), "dd/MM/yy", { locale: ptBR }) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">Nenhuma campanha de e-mail enviada ainda</p>
              )}
            </Card>

            {/* Push Notification Analytics Dashboard */}
            <Card 
              className="p-6 border-2 border-indigo-500/30 relative"
              {...getDragProps("push-analytics")}
            >
              {isReordering && (
                <div className="absolute top-2 right-2 z-10 p-1 bg-indigo-500/20 rounded-md">
                  <GripVertical className="h-4 w-4 text-indigo-500" />
                </div>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-500/20 rounded-full">
                  <Bell className="h-6 w-6 text-indigo-500" />
                </div>
                <p className="text-lg font-semibold text-foreground">Analytics de Notificações Push</p>
              </div>
              
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
            </Card>

            {/* Top Push Campaigns */}
            <Card 
              className="p-6 relative"
              {...getDragProps("top-push")}
            >
              {isReordering && (
                <div className="absolute top-2 right-2 z-10 p-1 bg-indigo-500/20 rounded-md">
                  <GripVertical className="h-4 w-4 text-indigo-500" />
                </div>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-500/20 rounded-full">
                  <Trophy className="h-6 w-6 text-indigo-500" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">Top 5 Campanhas Push</p>
                  <p className="text-xs text-muted-foreground">Maior alcance de envios</p>
                </div>
              </div>
              
              {topPushCampaigns.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Notificação</TableHead>
                        <TableHead className="text-center">Enviados</TableHead>
                        <TableHead className="text-center">Falhas</TableHead>
                        <TableHead className="text-center">Taxa Sucesso</TableHead>
                        <TableHead className="text-right">Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topPushCampaigns.map((campaign, index) => {
                        const successRate = campaign.sent_count > 0 
                          ? ((campaign.sent_count - campaign.failed_count) / campaign.sent_count) * 100 
                          : 0;
                        return (
                          <TableRow key={campaign.id}>
                            <TableCell className="font-bold text-indigo-500">
                              {index + 1}º
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-foreground truncate max-w-[200px]">{campaign.title}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{campaign.body}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{campaign.sent_count}</TableCell>
                            <TableCell className="text-center text-red-500">{campaign.failed_count}</TableCell>
                            <TableCell className="text-center">
                              <span className={`font-bold ${successRate >= 90 ? 'text-green-500' : successRate >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
                                {successRate.toFixed(1)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {format(new Date(campaign.sent_at), "dd/MM/yy", { locale: ptBR })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">Nenhuma notificação push enviada ainda</p>
              )}
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminMarketing;
