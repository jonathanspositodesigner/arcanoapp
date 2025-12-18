import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Power, Copy, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PartnerArtes {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  is_active: boolean;
  created_at: string;
}

const AdminPartnersArtes = () => {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<PartnerArtes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerArtes | null>(null);
  const [newPartner, setNewPartner] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
  });
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [createdPartnerEmail, setCreatedPartnerEmail] = useState("");

  useEffect(() => {
    checkAdminAndFetchPartners();
  }, []);

  const checkAdminAndFetchPartners = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/admin-login");
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        navigate("/admin-login");
        return;
      }

      await fetchPartners();
    } catch (error) {
      console.error("Error checking admin:", error);
      navigate("/admin-login");
    }
  };

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('partners_artes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPartners(data || []);
    } catch (error) {
      console.error("Error fetching partners:", error);
      toast.error("Erro ao carregar parceiros");
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleAddPartner = async () => {
    if (!newPartner.name || !newPartner.email) {
      toast.error("Nome e email são obrigatórios");
      return;
    }

    try {
      const password = generateRandomPassword();
      setGeneratedPassword(password);

      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada");
        return;
      }

      // Call edge function to create partner
      const response = await supabase.functions.invoke('create-partner-artes', {
        body: {
          email: newPartner.email,
          password: password,
          name: newPartner.name,
          phone: newPartner.phone || null,
          company: newPartner.company || null,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        toast.error(response.data.error);
        return;
      }

      setCreatedPartnerEmail(newPartner.email);
      setShowAddModal(false);
      setShowSuccessModal(true);
      setNewPartner({ name: "", email: "", phone: "", company: "" });
      fetchPartners();
    } catch (error: any) {
      console.error("Error adding partner:", error);
      toast.error(error.message || "Erro ao adicionar parceiro");
    }
  };

  const handleToggleActive = async (partner: PartnerArtes) => {
    try {
      const { error } = await supabase
        .from('partners_artes')
        .update({ is_active: !partner.is_active })
        .eq('id', partner.id);

      if (error) throw error;

      toast.success(partner.is_active ? "Parceiro desativado" : "Parceiro ativado");
      fetchPartners();
    } catch (error) {
      console.error("Error toggling partner:", error);
      toast.error("Erro ao alterar status");
    }
  };

  const handleDeletePartner = async (partnerId: string) => {
    if (!confirm("Tem certeza que deseja excluir este parceiro?")) return;

    try {
      const { error } = await supabase
        .from('partners_artes')
        .delete()
        .eq('id', partnerId);

      if (error) throw error;

      toast.success("Parceiro excluído");
      fetchPartners();
    } catch (error) {
      console.error("Error deleting partner:", error);
      toast.error("Erro ao excluir parceiro");
    }
  };

  const handleUpdatePartner = async () => {
    if (!editingPartner) return;

    try {
      const { error } = await supabase
        .from('partners_artes')
        .update({
          name: editingPartner.name,
          phone: editingPartner.phone,
          company: editingPartner.company,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingPartner.id);

      if (error) throw error;

      toast.success("Parceiro atualizado");
      setShowEditModal(false);
      fetchPartners();
    } catch (error) {
      console.error("Error updating partner:", error);
      toast.error("Erro ao atualizar parceiro");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            className="text-white/70 hover:text-white"
            onClick={() => navigate("/admin-artes-eventos/ferramentas")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-xl md:text-2xl font-bold text-white">
            Gerenciar Colaboradores de Artes
          </h1>
        </div>

        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button className="w-full mb-6 bg-[#2d4a5e] hover:bg-[#3d5a6e] text-white">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Colaborador
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1a2e] border-[#2d4a5e]/30 text-white">
            <DialogHeader>
              <DialogTitle>Novo Colaborador de Artes</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-white/60">Nome *</label>
                <Input
                  value={newPartner.name}
                  onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                  className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-white/60">Email *</label>
                <Input
                  type="email"
                  value={newPartner.email}
                  onChange={(e) => setNewPartner({ ...newPartner, email: e.target.value })}
                  className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-white/60">Telefone</label>
                <Input
                  value={newPartner.phone}
                  onChange={(e) => setNewPartner({ ...newPartner, phone: e.target.value })}
                  className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-white/60">Empresa</label>
                <Input
                  value={newPartner.company}
                  onChange={(e) => setNewPartner({ ...newPartner, company: e.target.value })}
                  className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white"
                />
              </div>
              <Button
                className="w-full bg-[#2d4a5e] hover:bg-[#3d5a6e] text-white"
                onClick={handleAddPartner}
              >
                Criar Colaborador
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Partners List */}
        <div className="space-y-4">
          {partners.length === 0 ? (
            <Card className="bg-[#1a1a2e]/80 border-[#2d4a5e]/30">
              <CardContent className="p-8 text-center text-white/60">
                Nenhum colaborador cadastrado
              </CardContent>
            </Card>
          ) : (
            partners.map((partner) => (
              <Card key={partner.id} className="bg-[#1a1a2e]/80 border-[#2d4a5e]/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-medium">{partner.name}</h3>
                        <Badge className={partner.is_active ? "bg-green-500" : "bg-red-500"}>
                          {partner.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <p className="text-white/60 text-sm">{partner.email}</p>
                      {partner.company && (
                        <p className="text-white/40 text-xs">{partner.company}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#2d4a5e]/50 text-white/70"
                        onClick={() => {
                          setEditingPartner(partner);
                          setShowEditModal(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`border-[#2d4a5e]/50 ${partner.is_active ? "text-yellow-400" : "text-green-400"}`}
                        onClick={() => handleToggleActive(partner)}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/50 text-red-400"
                        onClick={() => handleDeletePartner(partner.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-[#1a1a2e] border-[#2d4a5e]/30 text-white">
          <DialogHeader>
            <DialogTitle>Editar Colaborador</DialogTitle>
          </DialogHeader>
          {editingPartner && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-white/60">Nome</label>
                <Input
                  value={editingPartner.name}
                  onChange={(e) => setEditingPartner({ ...editingPartner, name: e.target.value })}
                  className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-white/60">Email (não editável)</label>
                <Input
                  value={editingPartner.email}
                  disabled
                  className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white/50"
                />
              </div>
              <div>
                <label className="text-sm text-white/60">Telefone</label>
                <Input
                  value={editingPartner.phone || ""}
                  onChange={(e) => setEditingPartner({ ...editingPartner, phone: e.target.value })}
                  className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-white/60">Empresa</label>
                <Input
                  value={editingPartner.company || ""}
                  onChange={(e) => setEditingPartner({ ...editingPartner, company: e.target.value })}
                  className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white"
                />
              </div>
              <Button
                className="w-full bg-[#2d4a5e] hover:bg-[#3d5a6e] text-white"
                onClick={handleUpdatePartner}
              >
                Salvar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="bg-[#1a1a2e] border-[#2d4a5e]/30 text-white">
          <DialogHeader>
            <DialogTitle>Colaborador Criado!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-white/60">Compartilhe as credenciais com o colaborador:</p>
            <div className="bg-[#0f0f1a] p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Email:</span>
                <div className="flex items-center gap-2">
                  <span className="text-white">{createdPartnerEmail}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(createdPartnerEmail)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Senha:</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono">{generatedPassword}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(generatedPassword)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <Button
              className="w-full bg-[#2d4a5e] hover:bg-[#3d5a6e] text-white"
              onClick={() => setShowSuccessModal(false)}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPartnersArtes;
