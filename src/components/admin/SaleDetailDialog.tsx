import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Mail, KeyRound, Save, Loader2, RotateCcw } from "lucide-react";
import type { SaleRecord } from "./SalesManagementContent";

interface SaleDetailDialogProps {
  sale: SaleRecord | null;
  open: boolean;
  onClose: () => void;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid: { label: "Aprovada", variant: "default" },
  pending: { label: "Pendente", variant: "secondary" },
  refunded: { label: "Reembolsada", variant: "destructive" },
};

const SaleDetailDialog = ({ sale, open, onClose }: SaleDetailDialogProps) => {
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);

  // Reset fields when sale changes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
      return;
    }
    if (sale) {
      setEditName(sale.name || "");
      setEditEmail(sale.user_email || "");
      setEditWhatsapp(sale.whatsapp || "");
    }
  };

  // Initialize on open
  if (open && sale && editEmail !== sale.user_email && !isUpdating) {
    setEditName(sale.name || "");
    setEditEmail(sale.user_email || "");
    setEditWhatsapp(sale.whatsapp || "");
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return "—";
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const handleUpdateProfile = async () => {
    if (!sale) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase.functions.invoke("admin-manage-user", {
        body: {
          action: "update_profile",
          email: sale.user_email,
          updates: {
            name: editName || null,
            email: editEmail || null,
            whatsapp: editWhatsapp || null,
          },
        },
      });
      if (error) throw error;
      toast.success("Perfil atualizado com sucesso!");
    } catch (err: any) {
      console.error("Error updating profile:", err);
      toast.error("Erro ao atualizar perfil: " + (err.message || "Erro desconhecido"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResendWelcomeEmail = async () => {
    if (!sale) return;
    setIsResending(true);
    try {
      const { error } = await supabase.functions.invoke("admin-manage-user", {
        body: {
          action: "resend_welcome_email",
          email: sale.user_email,
        },
      });
      if (error) throw error;
      toast.success("Email de boas-vindas reenviado!");
    } catch (err: any) {
      console.error("Error resending email:", err);
      toast.error("Erro ao reenviar email: " + (err.message || "Erro desconhecido"));
    } finally {
      setIsResending(false);
    }
  };

  const handleResetPassword = async () => {
    if (!sale) return;
    setIsResettingPassword(true);
    try {
      const { error } = await supabase.functions.invoke("send-recovery-email", {
        body: { email: sale.user_email },
      });
      if (error) throw error;
      toast.success("Email de reset de senha enviado!");
    } catch (err: any) {
      console.error("Error resetting password:", err);
      toast.error("Erro ao enviar reset: " + (err.message || "Erro desconhecido"));
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleRefundPagarme = async () => {
    if (!sale) return;
    setIsRefunding(true);
    try {
      const { data, error } = await supabase.functions.invoke("refund-pagarme", {
        body: { order_id: sale.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Reembolso realizado com sucesso! O acesso foi revogado.");
      onClose();
    } catch (err: any) {
      console.error("Error refunding:", err);
      toast.error("Erro ao reembolsar: " + (err.message || "Erro desconhecido"));
    } finally {
      setIsRefunding(false);
    }
  };

  if (!sale) return null;

  const st = statusMap[sale.status] || { label: sale.status, variant: "outline" as const };
  const isPagarme = sale.source_platform?.includes("asaas") || sale.source_platform?.includes("pagarme");
  const canRefund = sale.status === "paid" && isPagarme;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Detalhes da Venda</DialogTitle>
        </DialogHeader>

        {/* Transaction Details */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Transação</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Status</span>
              <div className="mt-0.5">
                <Badge variant={st.variant}>{st.label}</Badge>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Data</span>
              <p className="text-foreground">{formatDate(sale.paid_at || sale.created_at)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Valor bruto</span>
              <p className="text-foreground font-medium">{formatCurrency(sale.amount)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Valor líquido</span>
              <p className="text-emerald-400 font-medium">{sale.net_amount ? formatCurrency(sale.net_amount) : "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Produto</span>
              <p className="text-foreground">{sale.product_title}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Plataforma</span>
              <p className="text-foreground capitalize">{sale.source_platform || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Pagamento</span>
              <p className="text-foreground capitalize">{sale.payment_method || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">ID</span>
              <p className="text-foreground text-xs font-mono truncate">{sale.id}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Client Info (Editable) */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Dados do Cliente</h4>
          <div className="space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nome do cliente"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Email do cliente"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">WhatsApp</Label>
              <Input
                value={editWhatsapp}
                onChange={(e) => setEditWhatsapp(e.target.value)}
                placeholder="WhatsApp do cliente"
                className="h-9 text-sm"
              />
            </div>
            <Button
              onClick={handleUpdateProfile}
              disabled={isUpdating}
              size="sm"
              className="w-full gap-2"
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Alterações
            </Button>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Ações</h4>
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResendWelcomeEmail}
              disabled={isResending}
              className="justify-start gap-2"
            >
              {isResending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Reenviar Email de Acesso
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetPassword}
              disabled={isResettingPassword}
              className="justify-start gap-2"
            >
              {isResettingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Enviar Reset de Senha
            </Button>

            {canRefund && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isRefunding}
                    className="justify-start gap-2"
                  >
                    {isRefunding ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    Reembolsar via Pagar.me
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Reembolso</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja reembolsar <strong>{formatCurrency(sale.amount)}</strong> para <strong>{sale.user_email}</strong>?
                      <br /><br />
                      Esta ação irá:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Estornar o pagamento na Pagar.me</li>
                        <li>Revogar o acesso do usuário ao produto</li>
                        <li>Marcar a venda como reembolsada</li>
                      </ul>
                      <br />
                      <strong>Esta ação não pode ser desfeita.</strong>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRefundPagarme}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Confirmar Reembolso
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SaleDetailDialog;
