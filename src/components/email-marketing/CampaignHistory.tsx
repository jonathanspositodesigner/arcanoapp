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
import { Eye, Copy, Trash2, Loader2, CheckCircle, XCircle, Clock, Send, FileText, AlertTriangle } from "lucide-react";
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
  sent_at: string | null;
  created_at: string;
}

interface EmailLog {
  id: string;
  email: string;
  status: string;
  resend_id: string | null;
  error_message: string | null;
  sent_at: string | null;
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Rascunho
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

  const getLogStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <Badge className="gap-1 bg-green-500 text-white">
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
      case "rate_limited":
        return (
          <Badge className="gap-1 bg-orange-500 text-white">
            <AlertTriangle className="h-3 w-3" />
            Rate Limit
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Pendente
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReportSummary = () => {
    const sent = emailLogs.filter(l => l.status === "sent").length;
    const failed = emailLogs.filter(l => l.status === "failed").length;
    const rateLimited = emailLogs.filter(l => l.status === "rate_limited").length;
    const pending = emailLogs.filter(l => l.status === "pending").length;
    
    return { sent, failed, rateLimited, pending, total: emailLogs.length };
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
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((campaign) => (
              <TableRow key={campaign.id}>
                <TableCell className="font-medium">{campaign.title}</TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {campaign.subject}
                </TableCell>
                <TableCell>{getStatusBadge(campaign.status)}</TableCell>
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
                <TableCell>
                  {campaign.sent_at
                    ? format(new Date(campaign.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : format(new Date(campaign.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
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
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Relatório de Envio: {reportCampaign?.title}</DialogTitle>
          </DialogHeader>

          {loadingLogs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="p-3 text-center bg-green-50 dark:bg-green-950">
                  <div className="text-2xl font-bold text-green-600">{summary.sent}</div>
                  <div className="text-xs text-muted-foreground">Enviados</div>
                </Card>
                <Card className="p-3 text-center bg-red-50 dark:bg-red-950">
                  <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
                  <div className="text-xs text-muted-foreground">Falharam</div>
                </Card>
                <Card className="p-3 text-center bg-orange-50 dark:bg-orange-950">
                  <div className="text-2xl font-bold text-orange-600">{summary.rateLimited}</div>
                  <div className="text-xs text-muted-foreground">Rate Limit</div>
                </Card>
                <Card className="p-3 text-center bg-gray-50 dark:bg-gray-900">
                  <div className="text-2xl font-bold">{summary.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </Card>
              </div>

              {/* Success Rate */}
              {summary.total > 0 && (
                <div className="text-center text-sm text-muted-foreground">
                  Taxa de sucesso: <span className="font-bold text-foreground">{((summary.sent / summary.total) * 100).toFixed(1)}%</span>
                </div>
              )}

              {/* Email List */}
              <ScrollArea className="h-[400px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>ID Resend</TableHead>
                      <TableHead>Erro</TableHead>
                      <TableHead>Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">{log.email}</TableCell>
                        <TableCell>{getLogStatusBadge(log.status)}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {log.resend_id || "-"}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-xs text-destructive" title={log.error_message || ""}>
                          {log.error_message || "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.sent_at
                            ? format(new Date(log.sent_at), "HH:mm:ss", { locale: ptBR })
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CampaignHistory;
