import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Eye, Copy, Trash2, Loader2, CheckCircle, XCircle, Clock, Send, 
  FileText, AlertTriangle, Mail, MousePointer, Ban, MailOpen, CalendarOff
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Campaign {
  id: string;
  title: string;
  subject: string;
  status: string;
  recipients_count: number;
  sent_count: number;
  failed_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  complained_count: number;
  sent_at: string | null;
  created_at: string;
  is_scheduled: boolean;
  schedule_type: string;
  next_send_at: string | null;
}

interface EmailLog {
  id: string;
  email: string;
  status: string;
  resend_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  complained_at: string | null;
  open_count: number;
  click_count: number;
}

interface CampaignHistoryProps {
  onEdit: (campaign: Campaign) => void;
  onDuplicate: (campaign: Campaign) => void;
  refreshTrigger?: number;
}

const CampaignHistory = ({ onEdit, onDuplicate, refreshTrigger }: CampaignHistoryProps) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reportCampaign, setReportCampaign] = useState<Campaign | null>(null);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, [refreshTrigger]);

  const fetchCampaigns = async () => {
    const { data, error } = await supabase
      .from("email_campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar campanhas");
      return;
    }

    setCampaigns(data || []);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from("email_campaigns")
      .delete()
      .eq("id", deleteId);

    if (error) {
      toast.error("Erro ao excluir campanha");
      return;
    }

    toast.success("Campanha excluída");
    setDeleteId(null);
    fetchCampaigns();
  };

  const openReport = async (campaign: Campaign) => {
    setReportCampaign(campaign);
    setLoadingLogs(true);

    const { data, error } = await supabase
      .from("email_campaign_logs")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("sent_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar relatório");
      setLoadingLogs(false);
      return;
    }

    setEmailLogs(data || []);
    setLoadingLogs(false);
  };

  const getStatusBadge = (status: string, campaign?: Campaign) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Rascunho
          </Badge>
        );
      case "scheduled":
        return (
          <Badge className="gap-1 bg-orange-500 text-white">
            <Clock className="h-3 w-3" />
            Agendada
          </Badge>
        );
      case "sending":
        return (
          <Badge className="gap-1 bg-blue-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            Enviando
          </Badge>
        );
      case "sent":
        return (
          <Badge className="gap-1 bg-green-500">
            <CheckCircle className="h-3 w-3" />
            Enviado
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Falhou
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCancelSchedule = async (campaignId: string) => {
    const { error } = await supabase
      .from("email_campaigns")
      .update({
        status: "draft",
        is_scheduled: false,
        next_send_at: null,
      })
      .eq("id", campaignId);

    if (error) {
      toast.error("Erro ao cancelar agendamento");
      return;
    }

    toast.success("Agendamento cancelado");
    fetchCampaigns();
  };

  const getScheduleTypeLabel = (type: string) => {
    switch (type) {
      case "once": return "Único";
      case "daily": return "Diário";
      case "weekly": return "Semanal";
      case "monthly": return "Mensal";
      default: return type;
    }
  };

  const getLogStatusBadge = (log: EmailLog) => {
    // Show most relevant status based on tracking data
    if (log.complained_at) {
      return (
        <Badge className="gap-1 bg-red-700 text-white">
          <Ban className="h-3 w-3" />
          Spam
        </Badge>
      );
    }
    if (log.bounced_at) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Bounce
        </Badge>
      );
    }
    if (log.clicked_at) {
      return (
        <Badge className="gap-1 bg-purple-500 text-white">
          <MousePointer className="h-3 w-3" />
          Clicou ({log.click_count || 1})
        </Badge>
      );
    }
    if (log.opened_at) {
      return (
        <Badge className="gap-1 bg-blue-500 text-white">
          <MailOpen className="h-3 w-3" />
          Abriu ({log.open_count || 1})
        </Badge>
      );
    }
    if (log.delivered_at || log.status === "delivered") {
      return (
        <Badge className="gap-1 bg-green-500 text-white">
          <CheckCircle className="h-3 w-3" />
          Entregue
        </Badge>
      );
    }
    if (log.status === "sent") {
      return (
        <Badge className="gap-1 bg-green-400 text-white">
          <Mail className="h-3 w-3" />
          Enviado
        </Badge>
      );
    }
    if (log.status === "failed") {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Falhou
        </Badge>
      );
    }
    if (log.status === "rate_limited") {
      return (
        <Badge className="gap-1 bg-orange-500 text-white">
          <AlertTriangle className="h-3 w-3" />
          Rate Limit
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" />
        Pendente
      </Badge>
    );
  };

  const getReportSummary = () => {
    const sent = emailLogs.filter(l => l.status === "sent" || l.status === "delivered" || l.delivered_at).length;
    const delivered = emailLogs.filter(l => l.delivered_at || l.status === "delivered").length;
    const opened = emailLogs.filter(l => l.opened_at).length;
    const clicked = emailLogs.filter(l => l.clicked_at).length;
    const bounced = emailLogs.filter(l => l.bounced_at || l.status === "bounced").length;
    const complained = emailLogs.filter(l => l.complained_at || l.status === "complained").length;
    const failed = emailLogs.filter(l => l.status === "failed").length;
    const rateLimited = emailLogs.filter(l => l.status === "rate_limited").length;
    
    return { 
      sent, 
      delivered, 
      opened, 
      clicked, 
      bounced, 
      complained,
      failed, 
      rateLimited, 
      total: emailLogs.length 
    };
  };

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhuma campanha criada ainda</p>
        </div>
      </Card>
    );
  }

  const summary = getReportSummary();

  return (
    <>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Assunto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Enviados</TableHead>
              <TableHead className="text-center">Abertos</TableHead>
              <TableHead className="text-center">Cliques</TableHead>
              <TableHead>Data / Próximo Envio</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((campaign) => (
              <TableRow key={campaign.id}>
                <TableCell className="font-medium">
                  {campaign.title}
                  {campaign.is_scheduled && campaign.schedule_type !== "once" && (
                    <span className="text-xs text-orange-500 ml-2">
                      ({getScheduleTypeLabel(campaign.schedule_type)})
                    </span>
                  )}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {campaign.subject}
                </TableCell>
                <TableCell>{getStatusBadge(campaign.status, campaign)}</TableCell>
                <TableCell className="text-center">
                  {campaign.status === "sent" || campaign.status === "sending" ? (
                    <span>
                      {campaign.sent_count}/{campaign.recipients_count}
                      {campaign.failed_count > 0 && (
                        <span className="text-destructive ml-1">
                          ({campaign.failed_count} falhas)
                        </span>
                      )}
                    </span>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {campaign.status === "sent" && campaign.sent_count > 0 ? (
                    <span className="text-blue-500 font-medium">
                      {campaign.opened_count || 0}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({((campaign.opened_count || 0) / campaign.sent_count * 100).toFixed(0)}%)
                      </span>
                    </span>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {campaign.status === "sent" && campaign.sent_count > 0 ? (
                    <span className="text-purple-500 font-medium">
                      {campaign.clicked_count || 0}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({((campaign.clicked_count || 0) / campaign.sent_count * 100).toFixed(0)}%)
                      </span>
                    </span>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {campaign.status === "scheduled" && campaign.next_send_at ? (
                    <span className="text-orange-500">
                      {format(new Date(campaign.next_send_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  ) : campaign.sent_at ? (
                    format(new Date(campaign.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                  ) : (
                    format(new Date(campaign.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {campaign.status === "scheduled" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelSchedule(campaign.id)}
                        title="Cancelar Agendamento"
                        className="text-orange-500 hover:text-orange-600"
                      >
                        <CalendarOff className="h-4 w-4" />
                      </Button>
                    )}
                    {(campaign.status === "sent" || campaign.status === "sending") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openReport(campaign)}
                        title="Ver Relatório"
                        className="text-blue-500 hover:text-blue-600"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(campaign)}
                      title="Ver/Editar"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDuplicate(campaign)}
                      title="Duplicar"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(campaign.id)}
                      title="Excluir"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A campanha será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Email Report Dialog */}
      <Dialog open={!!reportCampaign} onOpenChange={() => setReportCampaign(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Relatório de Envio: {reportCampaign?.title}</DialogTitle>
          </DialogHeader>

          {loadingLogs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Cards - Primary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="p-3 text-center bg-green-50 dark:bg-green-950">
                  <div className="text-2xl font-bold text-green-600">{summary.sent}</div>
                  <div className="text-xs text-muted-foreground">Enviados</div>
                </Card>
                <Card className="p-3 text-center bg-blue-50 dark:bg-blue-950">
                  <div className="text-2xl font-bold text-blue-600">{summary.opened}</div>
                  <div className="text-xs text-muted-foreground">
                    Abriram
                    {summary.sent > 0 && (
                      <span className="ml-1">({((summary.opened / summary.sent) * 100).toFixed(0)}%)</span>
                    )}
                  </div>
                </Card>
                <Card className="p-3 text-center bg-purple-50 dark:bg-purple-950">
                  <div className="text-2xl font-bold text-purple-600">{summary.clicked}</div>
                  <div className="text-xs text-muted-foreground">
                    Clicaram
                    {summary.sent > 0 && (
                      <span className="ml-1">({((summary.clicked / summary.sent) * 100).toFixed(0)}%)</span>
                    )}
                  </div>
                </Card>
                <Card className="p-3 text-center bg-gray-50 dark:bg-gray-900">
                  <div className="text-2xl font-bold">{summary.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </Card>
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-4 gap-2">
                <Card className="p-2 text-center">
                  <div className="text-lg font-semibold text-green-500">{summary.delivered}</div>
                  <div className="text-xs text-muted-foreground">Entregues</div>
                </Card>
                <Card className="p-2 text-center">
                  <div className="text-lg font-semibold text-red-500">{summary.failed}</div>
                  <div className="text-xs text-muted-foreground">Falharam</div>
                </Card>
                <Card className="p-2 text-center">
                  <div className="text-lg font-semibold text-orange-500">{summary.bounced}</div>
                  <div className="text-xs text-muted-foreground">Bounces</div>
                </Card>
                <Card className="p-2 text-center">
                  <div className="text-lg font-semibold text-red-700">{summary.complained}</div>
                  <div className="text-xs text-muted-foreground">Spam</div>
                </Card>
              </div>

              {/* Email List */}
              <ScrollArea className="h-[350px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Aberturas</TableHead>
                      <TableHead className="text-center">Cliques</TableHead>
                      <TableHead>Último Evento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">{log.email}</TableCell>
                        <TableCell>{getLogStatusBadge(log)}</TableCell>
                        <TableCell className="text-center">
                          {log.opened_at ? (
                            <span className="text-blue-500 font-medium">{log.open_count || 1}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {log.clicked_at ? (
                            <span className="text-purple-500 font-medium">{log.click_count || 1}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.clicked_at
                            ? format(new Date(log.clicked_at), "dd/MM HH:mm", { locale: ptBR })
                            : log.opened_at
                            ? format(new Date(log.opened_at), "dd/MM HH:mm", { locale: ptBR })
                            : log.delivered_at
                            ? format(new Date(log.delivered_at), "dd/MM HH:mm", { locale: ptBR })
                            : log.sent_at
                            ? format(new Date(log.sent_at), "dd/MM HH:mm", { locale: ptBR })
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Webhook Info */}
              <div className="text-xs text-muted-foreground text-center p-2 bg-muted/50 rounded">
                Os dados de abertura e cliques são atualizados em tempo real via webhooks da Resend
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CampaignHistory;