import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  RefreshCw, 
  Mail, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  CalendarIcon,
  Send,
  Info,
  Loader2
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";

type PeriodFilter = 'today' | '7' | '15' | '30' | 'custom';

interface EmailStats {
  sent: number;
  pending: number;
  failed: number;
}

interface PurchaseEmailStatus {
  id: string;
  email: string;
  name?: string;
  platform: string;
  product_id: number | null;
  product_name: string;
  received_at: string;
  email_status: 'sent' | 'pending' | 'failed';
  email_sent_at?: string;
  failure_reason?: string;
}

// Mapeamento de plataformas do webhook_logs para welcome_email_logs
const PLATFORM_MAPPING: Record<string, string[]> = {
  'artes-eventos': ['artes-eventos', 'artes'],
  'artes-musicos': ['artes-musicos', 'musicos'],
  'hotmart-es': ['hotmart-es', 'ferramentas_ia'],
  'prompts': ['prompts', 'promptclub'],
  'app': ['app'],
};

const WelcomeEmailsMonitor = () => {
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const queryClient = useQueryClient();

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate = endOfDay(now);

    switch (period) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case '7':
        startDate = startOfDay(subDays(now, 7));
        break;
      case '15':
        startDate = startOfDay(subDays(now, 15));
        break;
      case '30':
        startDate = startOfDay(subDays(now, 30));
        break;
      case 'custom':
        if (customRange?.from && customRange?.to) {
          startDate = startOfDay(customRange.from);
          endDate = endOfDay(customRange.to);
        } else {
          startDate = startOfDay(now);
        }
        break;
      default:
        startDate = startOfDay(now);
    }

    return { startDate, endDate };
  };

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['welcome-emails-monitor', period, customRange],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();

      // Buscar compras bem-sucedidas do webhook_logs
      const { data: purchases, error: purchasesError } = await supabase
        .from('webhook_logs')
        .select('id, email, platform, product_id, received_at, payload')
        .in('status', ['paid', 'PURCHASE_COMPLETE', 'approved'])
        .gte('received_at', startDate.toISOString())
        .lte('received_at', endDate.toISOString())
        .order('received_at', { ascending: false });

      if (purchasesError) throw purchasesError;

      // Buscar TODOS os emails enviados (sem filtro de data para pegar matching correto)
      const { data: emailLogs, error: emailError } = await supabase
        .from('welcome_email_logs')
        .select('email, platform, status, sent_at, error_message')
        .gte('sent_at', subDays(startDate, 1).toISOString()); // Pegar emails até 1 dia antes

      if (emailError) throw emailError;

      // Criar mapa de emails enviados - chave por email apenas (mais flexível)
      const emailByEmailOnly = new Map<string, { status: string; sent_at: string; error_message?: string; platform: string }>();
      emailLogs?.forEach(log => {
        const key = log.email?.toLowerCase();
        if (key) {
          // Manter o mais recente
          const existing = emailByEmailOnly.get(key);
          if (!existing || new Date(log.sent_at || 0) > new Date(existing.sent_at)) {
            emailByEmailOnly.set(key, { 
              status: log.status || 'sent', 
              sent_at: log.sent_at || '',
              error_message: log.error_message || undefined,
              platform: log.platform || ''
            });
          }
        }
      });

      // Deduplicar compras por email (manter apenas a mais recente de cada email)
      const uniquePurchases = new Map<string, typeof purchases[0]>();
      for (const p of purchases || []) {
        const key = p.email?.toLowerCase();
        if (key && !uniquePurchases.has(key)) {
          uniquePurchases.set(key, p);
        }
      }

      // Mapear status de cada compra
      const purchasesWithStatus: PurchaseEmailStatus[] = Array.from(uniquePurchases.values()).map(p => {
        const emailKey = p.email?.toLowerCase();
        const emailInfo = emailKey ? emailByEmailOnly.get(emailKey) : undefined;
        
        // Extrair nome do payload se disponível
        let buyerName: string | undefined;
        try {
          const payload = p.payload as any;
          buyerName = payload?.customer?.name || payload?.data?.buyer?.name || undefined;
        } catch {
          // ignore
        }
        
        let emailStatus: 'sent' | 'pending' | 'failed' = 'pending';
        let failureReason: string | undefined;
        
        if (emailInfo) {
          if (emailInfo.status === 'failed') {
            emailStatus = 'failed';
            failureReason = emailInfo.error_message || 'Erro desconhecido no envio';
          } else {
            emailStatus = 'sent';
          }
        } else {
          // Determinar motivo do pendente
          failureReason = getPendingReason(p.platform, p.received_at);
        }

        return {
          id: p.id,
          email: p.email || '',
          name: buyerName,
          platform: p.platform || '',
          product_id: p.product_id,
          product_name: getProductName(p.product_id),
          received_at: p.received_at || '',
          email_status: emailStatus,
          email_sent_at: emailInfo?.sent_at,
          failure_reason: failureReason
        };
      });

      // Calcular estatísticas
      const stats: EmailStats = {
        sent: purchasesWithStatus.filter(p => p.email_status === 'sent').length,
        pending: purchasesWithStatus.filter(p => p.email_status === 'pending').length,
        failed: purchasesWithStatus.filter(p => p.email_status === 'failed').length
      };

      return { purchases: purchasesWithStatus, stats };
    },
    refetchInterval: 60000
  });

  // Mutation para reenviar emails pendentes
  const resendMutation = useMutation({
    mutationFn: async (pendingEmails: PurchaseEmailStatus[]) => {
      const response = await supabase.functions.invoke('resend-pending-emails', {
        body: { 
          customers: pendingEmails.map(p => ({
            email: p.email,
            name: p.name || p.email.split('@')[0],
            platform: p.platform,
            product_id: p.product_id
          }))
        }
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Emails reenviados: ${data?.summary?.sent || 0} enviados, ${data?.summary?.failed || 0} falhas`);
      queryClient.invalidateQueries({ queryKey: ['welcome-emails-monitor'] });
    },
    onError: (error) => {
      toast.error(`Erro ao reenviar: ${error.message}`);
    }
  });

  const getPendingReason = (platform: string, receivedAt: string): string => {
    const receivedDate = new Date(receivedAt);
    const now = new Date();
    const minutesAgo = (now.getTime() - receivedDate.getTime()) / (1000 * 60);

    if (minutesAgo < 2) {
      return 'Compra recente - aguardando processamento';
    }

    if (platform === 'hotmart-es') {
      return 'Webhook Hotmart: email registrado com platform diferente ou não processado';
    }

    return 'Email não encontrado no sistema de logs';
  };

  const getProductName = (productId: number | null): string => {
    if (!productId) return 'Desconhecido';
    
    const products: Record<number, string> = {
      267850: 'Artes Arcanas Vitalício',
      267873: 'Artes Arcanas 1 Ano',
      267872: 'Artes Arcanas 6 Meses',
      339215: 'Músicos Vitalício',
      339213: 'Músicos 1 Ano',
      339214: 'Músicos 6 Meses',
      274697: 'PromptClub Vitalício',
      274698: 'PromptClub 1 Ano',
      274699: 'PromptClub 6 Meses',
      7004722: 'Upscaler Arcano (ES)',
      148481: 'Upscaler Arcano (BR)'
    };

    return products[productId] || `Produto #${productId}`;
  };

  const getPlatformLabel = (platform: string): string => {
    const labels: Record<string, string> = {
      'artes-eventos': 'Artes Eventos',
      'artes-musicos': 'Artes Músicos',
      'prompts': 'PromptClub',
      'hotmart-es': 'Hotmart ES',
      'app': 'App'
    };
    return labels[platform] || platform;
  };

  const handlePeriodChange = (newPeriod: PeriodFilter) => {
    setPeriod(newPeriod);
    if (newPeriod !== 'custom') {
      setCustomRange(undefined);
    }
  };

  const handleCustomRangeSelect = (range: DateRange | undefined) => {
    setCustomRange(range);
    if (range?.from && range?.to) {
      setPeriod('custom');
      setIsCalendarOpen(false);
    }
  };

  const handleResendPending = () => {
    const pendingEmails = data?.purchases.filter(p => p.email_status === 'pending') || [];
    if (pendingEmails.length === 0) {
      toast.info('Nenhum email pendente para reenviar');
      return;
    }
    resendMutation.mutate(pendingEmails);
  };

  const pendingCount = data?.stats.pending || 0;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Monitoramento de Emails de Boas-Vindas
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Acompanhe o envio de emails para novas compras
            </p>
          </div>
          <div className="flex gap-2">
            {pendingCount > 0 && (
              <Button 
                variant="default" 
                size="sm"
                onClick={handleResendPending}
                disabled={resendMutation.isPending}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                {resendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Reenviar {pendingCount} Pendentes
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Filtros de período */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Período:</span>
          {(['today', '7', '15', '30'] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePeriodChange(p)}
            >
              {p === 'today' ? 'Hoje' : `${p} dias`}
            </Button>
          ))}
          
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={period === 'custom' ? 'default' : 'outline'}
                size="sm"
                className="min-w-[140px]"
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                {period === 'custom' && customRange?.from && customRange?.to
                  ? `${format(customRange.from, 'dd/MM')} - ${format(customRange.to, 'dd/MM')}`
                  : 'Personalizado'
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={customRange}
                onSelect={handleCustomRangeSelect}
                locale={ptBR}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 border-green-500/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-full">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Enviados</p>
                <p className="text-2xl font-bold text-green-500">
                  {isLoading ? '-' : data?.stats.sent || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-yellow-500/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-full">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {isLoading ? '-' : data?.stats.pending || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-red-500/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-full">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Falhas</p>
                <p className="text-2xl font-bold text-red-500">
                  {isLoading ? '-' : data?.stats.failed || 0}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabela de compras */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Data/Hora</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Email</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground hidden md:table-cell">Plataforma</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground hidden lg:table-cell">Produto</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Carregando...
                    </td>
                  </tr>
                ) : !data?.purchases?.length ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Nenhuma compra encontrada no período
                    </td>
                  </tr>
                ) : (
                  data.purchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-muted/30">
                      <td className="p-3 text-sm">
                        {format(new Date(purchase.received_at), 'dd/MM HH:mm', { locale: ptBR })}
                      </td>
                      <td className="p-3 text-sm font-mono">
                        <div>
                          {purchase.email.length > 25 
                            ? `${purchase.email.substring(0, 25)}...` 
                            : purchase.email
                          }
                        </div>
                        {purchase.name && (
                          <div className="text-xs text-muted-foreground">{purchase.name}</div>
                        )}
                      </td>
                      <td className="p-3 text-sm hidden md:table-cell">
                        {getPlatformLabel(purchase.platform)}
                      </td>
                      <td className="p-3 text-sm hidden lg:table-cell">
                        {purchase.product_name}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {purchase.email_status === 'sent' && (
                            <Badge className="bg-green-500/20 text-green-500 border-green-500/30 hover:bg-green-500/30">
                              ENVIADO
                            </Badge>
                          )}
                          {purchase.email_status === 'pending' && (
                            <>
                              <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/30">
                                PENDENTE
                              </Badge>
                              {purchase.failure_reason && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="h-4 w-4 text-yellow-500" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p>{purchase.failure_reason}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </>
                          )}
                          {purchase.email_status === 'failed' && (
                            <>
                              <Badge className="bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30">
                                FALHA
                              </Badge>
                              {purchase.failure_reason && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p>{purchase.failure_reason}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
};

export default WelcomeEmailsMonitor;
