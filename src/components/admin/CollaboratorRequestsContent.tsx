import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, XCircle, ExternalLink, Eye, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Solicitacao {
  id: string;
  nome: string;
  instagram: string;
  email: string;
  whatsapp: string;
  portfolio: string;
  aceite_termo: boolean;
  status: string;
  created_at: string;
  senha?: string;
}

const CollaboratorRequestsContent = () => {
  const [requests, setRequests] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Solicitacao | null>(null);
  const [filter, setFilter] = useState<"pendente" | "aprovado" | "rejeitado" | "all">("pendente");

  const fetchRequests = async () => {
    setLoading(true);
    let query = supabase.from("solicitacoes_colaboradores").select("*").order("created_at", { ascending: false });
    if (filter !== "all") {
      query = query.eq("status", filter);
    }
    const { data, error } = await query;
    if (error) {
      console.error("Error fetching requests:", error);
      toast.error("Erro ao carregar solicitações");
    } else {
      setRequests((data as Solicitacao[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const handleApprove = async (req: Solicitacao) => {
    if (!confirm(`Aprovar o colaborador ${req.nome}? Isso criará uma conta para ele na plataforma.`)) return;
    setActionLoading(req.id);
    try {
      const { data, error } = await supabase.functions.invoke("approve-collaborator", {
        body: { solicitacao_id: req.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Colaborador ${req.nome} aprovado com sucesso!`);
      fetchRequests();
    } catch (err: any) {
      console.error("Approve error:", err);
      toast.error(err.message || "Erro ao aprovar colaborador");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (req: Solicitacao) => {
    if (!confirm(`Rejeitar o colaborador ${req.nome}?`)) return;
    setActionLoading(req.id);
    try {
      const { error } = await supabase.from("solicitacoes_colaboradores")
        .update({ status: "rejeitado" })
        .eq("id", req.id);
      if (error) throw error;
      toast.success(`Solicitação de ${req.nome} rejeitada.`);
      fetchRequests();
    } catch (err: any) {
      console.error("Reject error:", err);
      toast.error("Erro ao rejeitar solicitação");
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pendente": return <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">Pendente</Badge>;
      case "aprovado": return <Badge className="bg-green-600 text-white">Aprovado</Badge>;
      case "rejeitado": return <Badge variant="destructive">Rejeitado</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Solicitações de Colaboradores</h2>
          <p className="text-sm text-muted-foreground">Gerencie as solicitações de cadastro de colaboradores</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["pendente", "aprovado", "rejeitado", "all"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "pendente" && requests.length > 0 && filter === "pendente" && (
                <span className="ml-1 bg-primary-foreground text-primary rounded-full px-1.5 text-xs">{requests.length}</span>
              )}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma solicitação {filter !== "all" ? filter : ""} encontrada.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((req) => (
            <Card key={req.id} className="border-border/50">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground text-lg">{req.nome}</h3>
                      {statusBadge(req.status)}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      <p className="text-muted-foreground"><span className="text-foreground font-medium">Email:</span> {req.email}</p>
                      <p className="text-muted-foreground"><span className="text-foreground font-medium">Instagram:</span> {req.instagram}</p>
                      <p className="text-muted-foreground"><span className="text-foreground font-medium">WhatsApp:</span> {req.whatsapp}</p>
                      <p className="text-muted-foreground truncate">
                        <span className="text-foreground font-medium">Portfólio:</span>{" "}
                        <a href={req.portfolio} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                          {req.portfolio.replace(/^https?:\/\//, "").substring(0, 30)}...
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enviado em: {new Date(req.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => setSelectedRequest(req)}>
                      <Eye className="h-4 w-4 mr-1" /> Ver
                    </Button>
                    {req.status === "pendente" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(req)}
                          disabled={actionLoading === req.id}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {actionLoading === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                          Aprovar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleReject(req)}
                          disabled={actionLoading === req.id}
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{selectedRequest.nome}</span>
                {statusBadge(selectedRequest.status)}
              </div>
              <div className="space-y-2 bg-muted/30 rounded-lg p-4">
                <p><span className="font-medium text-foreground">E-mail:</span> {selectedRequest.email}</p>
                <p><span className="font-medium text-foreground">Instagram:</span> {selectedRequest.instagram}</p>
                <p><span className="font-medium text-foreground">WhatsApp:</span> {selectedRequest.whatsapp}</p>
                <p>
                  <span className="font-medium text-foreground">Portfólio:</span>{" "}
                  <a href={selectedRequest.portfolio} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {selectedRequest.portfolio}
                  </a>
                </p>
                <p><span className="font-medium text-foreground">Aceite do Termo:</span> {selectedRequest.aceite_termo ? "Sim ✅" : "Não ❌"}</p>
                <p><span className="font-medium text-foreground">Data:</span> {new Date(selectedRequest.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
              </div>
              {selectedRequest.status === "pendente" && (
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => { handleApprove(selectedRequest); setSelectedRequest(null); }}
                    disabled={actionLoading === selectedRequest.id}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => { handleReject(selectedRequest); setSelectedRequest(null); }}
                    disabled={actionLoading === selectedRequest.id}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollaboratorRequestsContent;