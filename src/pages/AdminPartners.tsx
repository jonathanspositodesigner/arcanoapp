import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Users, Phone, Mail, Building, Trash2, ToggleLeft, ToggleRight, Copy, RefreshCw, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Partner {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  is_active: boolean;
  created_at: string;
}

// Generate random password
const generateRandomPassword = (length = 12): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const AdminPartners = () => {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createdPartnerData, setCreatedPartnerData] = useState<{ email: string; password: string } | null>(null);
  
  const [newPartner, setNewPartner] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    password: "",
  });

  useEffect(() => {
    checkAdminAndFetchPartners();
  }, []);

  // Initialize password when modal opens
  useEffect(() => {
    if (showAddModal && !newPartner.password) {
      setNewPartner(prev => ({ ...prev, password: generateRandomPassword() }));
    }
  }, [showAddModal]);

  const checkAdminAndFetchPartners = async () => {
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

    fetchPartners();
  };

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('partners')
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

  const handleGenerateNewPassword = () => {
    setNewPartner(prev => ({ ...prev, password: generateRandomPassword() }));
  };

  const handleCopyPassword = async (password: string) => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success("Senha copiada!");
    } catch {
      toast.error("Erro ao copiar senha");
    }
  };

  const handleCopyCredentials = async () => {
    if (!createdPartnerData) return;
    try {
      const text = `Email: ${createdPartnerData.email}\nSenha: ${createdPartnerData.password}`;
      await navigator.clipboard.writeText(text);
      toast.success("Credenciais copiadas!");
    } catch {
      toast.error("Erro ao copiar credenciais");
    }
  };

  const handleAddPartner = async () => {
    if (!newPartner.name || !newPartner.email) {
      toast.error("Nome e email são obrigatórios");
      return;
    }

    if (!newPartner.password) {
      toast.error("Senha é obrigatória");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        navigate('/admin-login');
        return;
      }

      const response = await supabase.functions.invoke('create-partner', {
        body: {
          name: newPartner.name,
          email: newPartner.email,
          phone: newPartner.phone || null,
          company: newPartner.company || null,
          password: newPartner.password,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao criar parceiro');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      // Store credentials for success modal
      setCreatedPartnerData({
        email: newPartner.email,
        password: response.data.password || newPartner.password,
      });

      setShowAddModal(false);
      setShowSuccessModal(true);
      setNewPartner({ name: "", email: "", phone: "", company: "", password: "" });
      fetchPartners();
    } catch (error: any) {
      console.error("Error adding partner:", error);
      toast.error(error.message || "Erro ao cadastrar parceiro");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (partnerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('partners')
        .update({ is_active: !currentStatus })
        .eq('id', partnerId);

      if (error) throw error;

      toast.success(currentStatus ? "Parceiro desativado" : "Parceiro ativado");
      fetchPartners();
    } catch (error) {
      console.error("Error toggling partner status:", error);
      toast.error("Erro ao alterar status do parceiro");
    }
  };

  const handleDeletePartner = async (partnerId: string, userId: string) => {
    if (!confirm("Tem certeza que deseja excluir este parceiro? Esta ação não pode ser desfeita.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('partners')
        .delete()
        .eq('id', partnerId);

      if (error) throw error;

      toast.success("Parceiro excluído com sucesso");
      fetchPartners();
    } catch (error) {
      console.error("Error deleting partner:", error);
      toast.error("Erro ao excluir parceiro");
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
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin-prompts/ferramentas")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Painel
        </Button>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Gerenciar Parceiros
            </h1>
            <p className="text-muted-foreground text-lg">
              {partners.length} parceiro(s) cadastrado(s)
            </p>
          </div>
          
          <Dialog open={showAddModal} onOpenChange={(open) => {
            setShowAddModal(open);
            if (!open) {
              setNewPartner({ name: "", email: "", phone: "", company: "", password: "" });
              setShowPassword(false);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-primary hover:opacity-90">
                <Plus className="h-4 w-4" />
                Adicionar Parceiro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Parceiro</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={newPartner.name}
                    onChange={(e) => setNewPartner(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome do parceiro"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newPartner.email}
                    onChange={(e) => setNewPartner(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Senha *</Label>
                  <div className="flex gap-2 mt-1">
                    <div className="relative flex-1">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={newPartner.password}
                        onChange={(e) => setNewPartner(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Senha do parceiro"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleGenerateNewPassword}
                      title="Gerar nova senha"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopyPassword(newPartner.password)}
                      title="Copiar senha"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Copie a senha antes de cadastrar para enviar ao parceiro
                  </p>
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={newPartner.phone}
                    onChange={(e) => setNewPartner(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="company">Empresa</Label>
                  <Input
                    id="company"
                    value={newPartner.company}
                    onChange={(e) => setNewPartner(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Nome da empresa (opcional)"
                    className="mt-1"
                  />
                </div>
                <Button 
                  onClick={handleAddPartner} 
                  className="w-full bg-gradient-primary hover:opacity-90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Cadastrando..." : "Cadastrar Parceiro"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Success Modal with Credentials */}
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-center text-green-600">
                ✓ Parceiro cadastrado com sucesso!
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <p className="text-center text-muted-foreground">
                Copie as credenciais abaixo para enviar ao parceiro:
              </p>
              {createdPartnerData && (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <span className="font-mono font-medium">{createdPartnerData.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Senha:</span>
                    <span className="font-mono font-medium">{createdPartnerData.password}</span>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={handleCopyCredentials}
                  className="flex-1 gap-2"
                  variant="outline"
                >
                  <Copy className="h-4 w-4" />
                  Copiar Credenciais
                </Button>
                <Button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setCreatedPartnerData(null);
                  }}
                  className="flex-1 bg-gradient-primary hover:opacity-90"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {partners.map((partner) => (
            <Card key={partner.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{partner.name}</h3>
                    <Badge variant={partner.is_active ? "default" : "secondary"}>
                      {partner.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{partner.email}</span>
                </div>
                {partner.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{partner.phone}</span>
                  </div>
                )}
                {partner.company && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building className="h-4 w-4" />
                    <span>{partner.company}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(partner.id, partner.is_active)}
                  className="flex-1"
                >
                  {partner.is_active ? (
                    <>
                      <ToggleRight className="h-4 w-4 mr-1" />
                      Desativar
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-4 w-4 mr-1" />
                      Ativar
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeletePartner(partner.id, partner.user_id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {partners.length === 0 && (
          <div className="text-center py-16">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Nenhum parceiro cadastrado
            </h3>
            <p className="text-muted-foreground mb-6">
              Clique no botão acima para adicionar seu primeiro parceiro
            </p>
            <Button 
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-primary hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Parceiro
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPartners;
