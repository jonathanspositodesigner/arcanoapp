import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, Bell, Eye, Send, CheckCircle, MousePointer, AlertTriangle, RefreshCw, Trophy, ShieldX } from "lucide-react";
import { fetchPushNotificationStats, PushNotificationStats } from "@/hooks/usePushNotificationAnalytics";
import { useEmailMarketingStats, fetchTopEmailCampaigns, fetchPushCampaignStats, TopEmailCampaign, PushCampaignStats } from "@/hooks/useEmailMarketingAnalytics";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const HubGeneralMarketing = () => {
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
  // No platform filter - shows ALL campaigns
  const { stats: emailStats, loading: emailLoading, refresh: refreshEmailStats } = useEmailMarketingStats();
  
  const [topEmailCampaigns, setTopEmailCampaigns] = useState<TopEmailCampaign[]>([]);
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
    const [push, topEmail, pushCampaign] = await Promise.all([
      fetchPushNotificationStats(),
      fetchTopEmailCampaigns(5), // No platform filter
      fetchPushCampaignStats()
    ]);
    setPushStats(push);
    setTopEmailCampaigns(topEmail);
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
    await Promise.all([loadStats(), refreshEmailStats()]);
    setIsRefreshing(false);
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
            <p className="text-muted-foreground hidden sm:block">Campanhas para todas as plataformas</p>
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

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando analytics...</div>
      ) : (
        <div className="space-y-6">
          {/* Email Marketing Analytics */}
          <Card className="p-6 border-2 border-primary/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/20 rounded-full">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Analytics de E-mail Marketing (Geral)</p>
                <p className="text-xs text-muted-foreground">{emailStats.totalCampaigns} campanhas enviadas em todas as plataformas</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-blue-500/10 rounded-lg p-4 text-center">
                <Send className="h-5 w-5 mx-auto mb-2 text-blue-500" />
                <p className="text-3xl font-bold text-blue-500">{emailStats.totalSent.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Emails Enviados</p>
              </div>
              
              <div className="bg-green-500/10 rounded-lg p-4 text-center">
                <CheckCircle className="h-5 w-5 mx-auto mb-2 text-green-500" />
                <p className="text-3xl font-bold text-green-500">{emailStats.totalDelivered.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Entregues</p>
                <p className="text-xs font-medium text-green-600">{emailStats.deliveryRate.toFixed(1)}%</p>
              </div>
              
              <div className="bg-purple-500/10 rounded-lg p-4 text-center">
                <Eye className="h-5 w-5 mx-auto mb-2 text-purple-500" />
                <p className="text-3xl font-bold text-purple-500">{emailStats.totalOpened.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Abertos</p>
                <p className="text-xs font-medium text-purple-600">{emailStats.openRate.toFixed(1)}%</p>
              </div>
              
              <div className="bg-amber-500/10 rounded-lg p-4 text-center">
                <MousePointer className="h-5 w-5 mx-auto mb-2 text-amber-500" />
                <p className="text-3xl font-bold text-amber-500">{emailStats.totalClicked.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Clicaram</p>
                <p className="text-xs font-medium text-amber-600">{emailStats.clickRate.toFixed(1)}%</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-500/10 rounded-lg p-3 text-center">
                <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-red-500" />
                <p className="text-xl font-bold text-red-500">{emailStats.totalBounced}</p>
                <p className="text-xs text-muted-foreground">Bounces ({emailStats.bounceRate.toFixed(1)}%)</p>
              </div>
              
              <div className="bg-orange-500/10 rounded-lg p-3 text-center">
                <ShieldX className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                <p className="text-xl font-bold text-orange-500">{emailStats.totalComplained}</p>
                <p className="text-xs text-muted-foreground">Marcaram como Spam</p>
              </div>
            </div>
          </Card>

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

          {/* Top Email Campaigns */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/20 rounded-full">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Top 5 Campanhas de E-mail (Todas as Plataformas)</p>
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
                        <TableCell className="font-bold text-primary">{index + 1}º</TableCell>
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
