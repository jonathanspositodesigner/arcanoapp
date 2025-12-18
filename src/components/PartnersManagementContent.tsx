import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Users, Phone, Mail, Building, Trash2, ToggleLeft, ToggleRight, Copy, RefreshCw, Eye, EyeOff, Palette, FileImage, Music, Settings } from "lucide-react";
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

interface PartnerPlatform {
  id: string;
  partner_id: string;
  platform: string;
  is_active: boolean;
}

const PLATFORM_CONFIG = {
  prompts: {
    label: "Prompts",
    icon: FileImage,
    color: "text-purple-500",
  },
  artes_eventos: {
    label: "Artes Eventos",
    icon: Palette,
    color: "text-cyan-500",
  },
  artes_musicos: {
    label: "Músicos & Artistas",
    icon: Music,
    color: "text-pink-500",
  },
};

// Generate random password
const generateRandomPassword = (length = 12): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const PartnersManagementContent = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerPlatforms, setPartnerPlatforms] = useState<Record<string, PartnerPlatform[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
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

  const [selectedPlatforms, setSelectedPlatforms] = useState<Record<string, boolean>>({
    prompts: false,
    artes_eventos: false,
    artes_musicos: false,
  });

  useEffect(() => {
    fetchPartners();
  }, []);

  useEffect(() => {
    if (showAddModal && !newPartner.password) {
      setNewPartner(prev => ({ ...prev, password: generateRandomPassword() }));
    }
  }, [showAddModal]);

  const fetchPartners = async () => {
    try {
      // Fetch all partners
      const { data: partnersData, error: partnersError } = await supabase
        .from('partners')
        .select('*')
        .order('created_at', { ascending: false });

      if (partnersError) throw partnersError;
      setPartners(partnersData || []);

      // Fetch all partner platforms
      const { data: platformsData, error: platformsError } = await supabase
        .from('partner_platforms')
        .select('*');

      if (platformsError) throw platformsError;

      // Group platforms by partner_id
      const grouped: Record<string, PartnerPlatform[]> = {};
      (platformsData || []).forEach((p) => {
        if (!grouped[p.partner_id]) {
          grouped[p.partner_id] = [];
        }
        grouped[p.partner_id].push(p);
      });
      setPartnerPlatforms(grouped);
    } catch (error) {
      console.error("Error fetching partners:", error);
      toast.error("Erro ao carregar colaboradores");
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

    // Check if at least one platform is selected
    const hasSelectedPlatform = Object.values(selectedPlatforms).some(v => v);
    if (!hasSelectedPlatform) {
      toast.error("Selecione pelo menos uma plataforma");
      return;
    }

    setIsSubmitting(true);

    try {
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
        throw new Error(response.error.message || 'Erro ao criar colaborador');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      const partnerId = response.data.partner?.id;

      // Create platform entries
      if (partnerId) {
        const platformEntries = Object.entries(selectedPlatforms)
          .filter(([_, isSelected]) => isSelected)
          .map(([platform]) => ({
            partner_id: partnerId,
            platform,
            is_active: true,
          }));

        if (platformEntries.length > 0) {
          const { error: platformError } = await supabase
            .from('partner_platforms')
            .insert(platformEntries);

          if (platformError) {
            console.error("Error creating platform entries:", platformError);
          }
        }
      }

      setCreatedPartnerData({
        email: newPartner.email,
        password: response.data.password || newPartner.password,
      });

      setShowAddModal(false);
      setShowSuccessModal(true);
      setNewPartner({ name: "", email: "", phone: "", company: "", password: "" });
      setSelectedPlatforms({ prompts: false, artes_eventos: false, artes_musicos: false });
      fetchPartners();
    } catch (error: any) {
      console.error("Error adding partner:", error);
      toast.error(error.message || "Erro ao cadastrar colaborador");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPlatformModal = (partner: Partner) => {
    setSelectedPartner(partner);
    const platforms = partnerPlatforms[partner.id] || [];
    const platformStates: Record<string, boolean> = {
      prompts: false,
      artes_eventos: false,
      artes_musicos: false,
    };
    platforms.forEach(p => {
      platformStates[p.platform] = p.is_active;
    });
    setSelectedPlatforms(platformStates);
    setShowPlatformModal(true);
  };

  const handleSavePlatforms = async () => {
    if (!selectedPartner) return;

    setIsSubmitting(true);

    try {
      // Delete existing platforms for this partner
      await supabase
        .from('partner_platforms')
        .delete()
        .eq('partner_id', selectedPartner.id);

      // Insert new platform entries
      const platformEntries = Object.entries(selectedPlatforms)
        .filter(([_, isActive]) => isActive)
        .map(([platform]) => ({
          partner_id: selectedPartner.id,
          platform,
          is_active: true,
        }));

      if (platformEntries.length > 0) {
        const { error } = await supabase
          .from('partner_platforms')
          .insert(platformEntries);

        if (error) throw error;
      }

      toast.success("Plataformas atualizadas com sucesso!");
      setShowPlatformModal(false);
      fetchPartners();
    } catch (error) {
      console.error("Error saving platforms:", error);
      toast.error("Erro ao salvar plataformas");
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

      toast.success(currentStatus ? "Colaborador desativado" : "Colaborador ativado");
      fetchPartners();
    } catch (error) {
      console.error("Error toggling partner status:", error);
      toast.error("Erro ao alterar status do colaborador");
    }
  };

  const handleDeletePartner = async (partnerId: string) => {
    if (!confirm("Tem certeza que deseja excluir este colaborador? Esta ação não pode ser desfeita.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('partners')
        .delete()
        .eq('id', partnerId);

      if (error) throw error;

      toast.success("Colaborador excluído com sucesso");
      fetchPartners();
    } catch (error) {
      console.error("Error deleting partner:", error);
      toast.error("Erro ao excluir colaborador");
    }
  };

  const getPartnerPlatformBadges = (partnerId: string) => {
    const platforms = partnerPlatforms[partnerId] || [];
    return platforms
      .filter(p => p.is_active)
      .map(p => {
        const config = PLATFORM_CONFIG[p.platform as keyof typeof PLATFORM_CONFIG];
        if (!config) return null;
        const IconComponent = config.icon;
        return (
          <Badge key={p.platform} variant="outline" className={`${config.color} border-current`}>
            <IconComponent className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        );
      });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Gerenciar Colaboradores
          </h1>
          <p className="text-muted-foreground text-lg">
            {partners.length} colaborador(es) cadastrado(s)
          </p>
        </div>
        
        <Dialog open={showAddModal} onOpenChange={(open) => {
          setShowAddModal(open);
          if (!open) {
            setNewPartner({ name: "", email: "", phone: "", company: "", password: "" });
            setSelectedPlatforms({ prompts: false, artes_eventos: false, artes_musicos: false });
            setShowPassword(false);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-gradient-primary hover:opacity-90">
              <Plus className="h-4 w-4" />
              Adicionar Colaborador
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Colaborador</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={newPartner.name}
                  onChange={(e) => setNewPartner(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome do colaborador"
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
                      placeholder="Senha do colaborador"
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
              <div>
                <Label className="mb-3 block">Plataformas *</Label>
                <div className="space-y-3">
                  {Object.entries(PLATFORM_CONFIG).map(([key, config]) => {
                    const IconComponent = config.icon;
                    return (
                      <div key={key} className="flex items-center space-x-3">
                        <Checkbox
                          id={`platform-${key}`}
                          checked={selectedPlatforms[key]}
                          onCheckedChange={(checked) => 
                            setSelectedPlatforms(prev => ({ ...prev, [key]: !!checked }))
                          }
                        />
                        <label
                          htmlFor={`platform-${key}`}
                          className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                        >
                          <IconComponent className={`h-4 w-4 ${config.color}`} />
                          {config.label}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleAddPartner}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? "Cadastrando..." : "Cadastrar Colaborador"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-green-500 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Colaborador Cadastrado!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-muted-foreground">
              O colaborador foi cadastrado com sucesso. Envie as credenciais abaixo para o novo colaborador:
            </p>
            {createdPartnerData && (
              <Card className="p-4 bg-muted/50">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{createdPartnerData.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono bg-background px-2 py-1 rounded">
                      {createdPartnerData.password}
                    </span>
                  </div>
                </div>
              </Card>
            )}
            <Button onClick={handleCopyCredentials} className="w-full gap-2">
              <Copy className="h-4 w-4" />
              Copiar Credenciais
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Platform Management Modal */}
      <Dialog open={showPlatformModal} onOpenChange={setShowPlatformModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Gerenciar Plataformas
            </DialogTitle>
          </DialogHeader>
          {selectedPartner && (
            <div className="space-y-4 mt-4">
              <p className="text-muted-foreground">
                Selecione as plataformas que <span className="font-medium text-foreground">{selectedPartner.name}</span> pode acessar:
              </p>
              <div className="space-y-3">
                {Object.entries(PLATFORM_CONFIG).map(([key, config]) => {
                  const IconComponent = config.icon;
                  return (
                    <div key={key} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={`edit-platform-${key}`}
                        checked={selectedPlatforms[key]}
                        onCheckedChange={(checked) => 
                          setSelectedPlatforms(prev => ({ ...prev, [key]: !!checked }))
                        }
                      />
                      <label
                        htmlFor={`edit-platform-${key}`}
                        className="flex items-center gap-2 text-sm font-medium cursor-pointer flex-1"
                      >
                        <IconComponent className={`h-5 w-5 ${config.color}`} />
                        {config.label}
                      </label>
                    </div>
                  );
                })}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPlatformModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSavePlatforms} disabled={isSubmitting}>
                  {isSubmitting ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Partners List */}
      {partners.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">Nenhum colaborador cadastrado</h3>
          <p className="text-muted-foreground">Clique no botão acima para adicionar o primeiro colaborador.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {partners.map((partner) => (
            <Card key={partner.id} className={`p-6 ${!partner.is_active ? 'opacity-60' : ''}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-foreground">{partner.name}</h3>
                    {!partner.is_active && (
                      <Badge variant="secondary" className="text-xs">Inativo</Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {partner.email}
                    </span>
                    {partner.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {partner.phone}
                      </span>
                    )}
                    {partner.company && (
                      <span className="flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        {partner.company}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {getPartnerPlatformBadges(partner.id)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPlatformModal(partner)}
                    className="gap-1"
                  >
                    <Settings className="h-4 w-4" />
                    Plataformas
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleToggleActive(partner.id, partner.is_active)}
                    title={partner.is_active ? "Desativar" : "Ativar"}
                  >
                    {partner.is_active ? (
                      <ToggleRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDeletePartner(partner.id)}
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PartnersManagementContent;
