import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Search, ShieldBan, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BlacklistedEmail {
  id: string;
  email: string;
  reason: string | null;
  notes: string | null;
  blocked_at: string;
  auto_blocked: boolean;
}

const AdminManageBlacklist = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [blacklist, setBlacklist] = useState<BlacklistedEmail[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    reason: "manual",
    notes: ""
  });

  useEffect(() => {
    checkAdmin();
    fetchBlacklist();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/admin-login');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      toast.error("Acesso negado");
      navigate('/');
      return;
    }
    setIsLoading(false);
  };

  const fetchBlacklist = async () => {
    const { data, error } = await supabase
      .from('blacklisted_emails')
      .select('*')
      .order('blocked_at', { ascending: false });

    if (error) {
      toast.error("Erro ao carregar lista negra");
      return;
    }

    setBlacklist(data || []);
  };

  const handleAdd = async () => {
    if (!formData.email.trim()) {
      toast.error("Email é obrigatório");
      return;
    }

    const { error } = await supabase
      .from('blacklisted_emails')
      .insert({
        email: formData.email.toLowerCase().trim(),
        reason: formData.reason,
        notes: formData.notes || null,
        auto_blocked: false
      });

    if (error) {
      if (error.code === '23505') {
        toast.error("Email já está na lista negra");
      } else {
        toast.error("Erro ao adicionar email");
      }
      return;
    }

    toast.success("Email adicionado à lista negra");
    setIsAddOpen(false);
    setFormData({ email: "", reason: "manual", notes: "" });
    fetchBlacklist();
  };

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Remover ${email} da lista negra?`)) return;

    const { error } = await supabase
      .from('blacklisted_emails')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Erro ao remover email");
      return;
    }

    toast.success("Email removido da lista negra");
    fetchBlacklist();
  };

  const filteredBlacklist = blacklist.filter(item =>
    item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.reason?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getReasonBadge = (reason: string | null, autoBlocked: boolean) => {
    if (autoBlocked) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Automático</Badge>;
    }
    switch (reason) {
      case 'chargeback':
        return <Badge variant="destructive">Chargeback</Badge>;
      case 'fraud':
        return <Badge variant="destructive">Fraude</Badge>;
      case 'abuse':
        return <Badge className="bg-orange-500">Abuso</Badge>;
      default:
        return <Badge variant="secondary">Manual</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => navigate('/admin-artes-eventos/ferramentas')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <ShieldBan className="h-8 w-8 text-destructive" />
              Lista Negra
            </h1>
            <p className="text-muted-foreground">
              Emails bloqueados de realizar compras
            </p>
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 bg-destructive/10 border-destructive/20">
            <p className="text-sm text-muted-foreground">Total Bloqueados</p>
            <p className="text-2xl font-bold text-foreground">{blacklist.length}</p>
          </Card>
          <Card className="p-4 bg-orange-500/10 border-orange-500/20">
            <p className="text-sm text-muted-foreground">Chargebacks</p>
            <p className="text-2xl font-bold text-foreground">
              {blacklist.filter(b => b.reason === 'chargeback').length}
            </p>
          </Card>
          <Card className="p-4 bg-muted/50">
            <p className="text-sm text-muted-foreground">Bloqueios Automáticos</p>
            <p className="text-2xl font-bold text-foreground">
              {blacklist.filter(b => b.auto_blocked).length}
            </p>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por email ou motivo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* List */}
        <div className="space-y-3">
          {filteredBlacklist.length === 0 ? (
            <Card className="p-8 text-center">
              <ShieldBan className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "Nenhum resultado encontrado" : "Lista negra vazia"}
              </p>
            </Card>
          ) : (
            filteredBlacklist.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground truncate">{item.email}</p>
                      {getReasonBadge(item.reason, item.auto_blocked)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Bloqueado em {format(new Date(item.blocked_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Notas: {item.notes}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(item.id, item.email)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Add Dialog */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar à Lista Negra</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Motivo</Label>
                <select
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full p-2 border rounded-md bg-background"
                >
                  <option value="manual">Manual</option>
                  <option value="chargeback">Chargeback</option>
                  <option value="fraud">Fraude</option>
                  <option value="abuse">Abuso</option>
                </select>
              </div>
              <div>
                <Label>Notas (opcional)</Label>
                <Textarea
                  placeholder="Observações sobre o bloqueio..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAdd} className="bg-destructive hover:bg-destructive/90">
                  Bloquear Email
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminManageBlacklist;
