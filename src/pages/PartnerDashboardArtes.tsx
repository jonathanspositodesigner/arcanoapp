import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, LogOut, Upload, Pencil, Trash2, Copy, Check, X, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SecureImage } from "@/components/SecureMedia";

interface PartnerArte {
  id: string;
  title: string;
  category: string;
  description: string | null;
  image_url: string;
  download_url: string | null;
  approved: boolean | null;
  rejected: boolean | null;
  deletion_requested: boolean | null;
  created_at: string;
  bonus_clicks: number;
}

type FilterType = "all" | "approved" | "pending" | "rejected";

const CATEGORIES = [
  { value: "casamento", label: "Casamento" },
  { value: "aniversario", label: "Aniversário" },
  { value: "formatura", label: "Formatura" },
  { value: "batizado", label: "Batizado" },
  { value: "corporativo", label: "Corporativo" },
  { value: "outros", label: "Outros" },
];

const PartnerDashboardArtes = () => {
  const navigate = useNavigate();
  const [partner, setPartner] = useState<{ id: string; name: string } | null>(null);
  const [artes, setArtes] = useState<PartnerArte[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingArte, setEditingArte] = useState<PartnerArte | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    checkPartnerAndFetchData();
  }, []);

  const checkPartnerAndFetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/parceiro-login-artes");
        return;
      }

      // Check partner role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'partner')
        .maybeSingle();

      if (!roleData) {
        navigate("/parceiro-login-artes");
        return;
      }

      // Get partner info from partners_artes
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners_artes')
        .select('id, name')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (partnerError || !partnerData) {
        navigate("/parceiro-login-artes");
        return;
      }

      setPartner(partnerData);

      // Fetch partner artes
      const { data: artesData, error: artesError } = await supabase
        .from('partner_artes')
        .select('*')
        .eq('partner_id', partnerData.id)
        .order('created_at', { ascending: false });

      if (artesError) {
        console.error("Error fetching artes:", artesError);
      } else {
        setArtes(artesData || []);
      }
    } catch (error) {
      console.error("Error checking partner:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/biblioteca-artes");
  };

  const getArteStatus = (arte: PartnerArte) => {
    if (arte.rejected) return "rejected";
    if (arte.approved) return "approved";
    return "pending";
  };

  const filteredArtes = artes.filter((arte) => {
    if (activeFilter === "all") return true;
    return getArteStatus(arte) === activeFilter;
  });

  const stats = {
    approved: artes.filter((a) => a.approved && !a.rejected).length,
    pending: artes.filter((a) => !a.approved && !a.rejected).length,
    rejected: artes.filter((a) => a.rejected).length,
  };

  const formatTitle = (title: string) => {
    return title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
  };

  const openEditModal = (arte: PartnerArte) => {
    setEditingArte(arte);
    setEditTitle(arte.title);
    setEditCategory(arte.category);
    setEditDescription(arte.description || "");
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingArte) return;

    try {
      const { error } = await supabase
        .from('partner_artes')
        .update({
          title: formatTitle(editTitle),
          category: editCategory,
          description: editDescription,
          approved: false,
          rejected: false,
          approved_at: null,
          approved_by: null,
          rejected_at: null,
          rejected_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingArte.id);

      if (error) {
        toast.error("Erro ao salvar alterações");
        return;
      }

      toast.success("Alterações salvas! O arquivo voltou para análise.");
      setShowEditModal(false);
      checkPartnerAndFetchData();
    } catch (error) {
      console.error("Error saving edit:", error);
      toast.error("Erro ao salvar alterações");
    }
  };

  const handleRequestDeletion = async (arteId: string) => {
    try {
      const { error } = await supabase
        .from('partner_artes')
        .update({
          deletion_requested: true,
          deletion_requested_at: new Date().toISOString(),
        })
        .eq('id', arteId);

      if (error) {
        toast.error("Erro ao solicitar exclusão");
        return;
      }

      toast.success("Solicitação de exclusão enviada!");
      checkPartnerAndFetchData();
    } catch (error) {
      console.error("Error requesting deletion:", error);
      toast.error("Erro ao solicitar exclusão");
    }
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              className="text-white/70 hover:text-white"
              onClick={() => navigate("/biblioteca-artes")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Biblioteca
            </Button>
            <h1 className="text-xl md:text-2xl font-bold text-white">
              Olá, {partner?.name}!
            </h1>
          </div>
          <Button
            variant="ghost"
            className="text-white/70 hover:text-white"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="bg-green-500/20 border-green-500/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{stats.approved}</div>
              <div className="text-sm text-green-300">Aprovados</div>
            </CardContent>
          </Card>
          <Card className="bg-yellow-500/20 border-yellow-500/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
              <div className="text-sm text-yellow-300">Pendentes</div>
            </CardContent>
          </Card>
          <Card className="bg-red-500/20 border-red-500/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-400">{stats.rejected}</div>
              <div className="text-sm text-red-300">Recusados</div>
            </CardContent>
          </Card>
        </div>

        {/* Upload Button */}
        <Button
          className="w-full mb-6 bg-[#2d4a5e] hover:bg-[#3d5a6e] text-white"
          onClick={() => navigate("/parceiro-upload-artes")}
        >
          <Upload className="h-4 w-4 mr-2" />
          Enviar Nova Arte
        </Button>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { key: "all", label: "Todos" },
            { key: "approved", label: "Aprovados" },
            { key: "pending", label: "Pendentes" },
            { key: "rejected", label: "Recusados" },
          ].map((filter) => (
            <Button
              key={filter.key}
              variant={activeFilter === filter.key ? "default" : "outline"}
              className={activeFilter === filter.key 
                ? "bg-[#2d4a5e] text-white" 
                : "border-[#2d4a5e]/50 text-white/70"}
              onClick={() => setActiveFilter(filter.key as FilterType)}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {/* Artes Grid */}
        {filteredArtes.length === 0 ? (
          <Card className="bg-[#1a1a2e]/80 border-[#2d4a5e]/30">
            <CardContent className="p-8 text-center text-white/60">
              Nenhuma arte encontrada
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredArtes.map((arte) => {
              const status = getArteStatus(arte);
              return (
                <Card key={arte.id} className="bg-[#1a1a2e]/80 border-[#2d4a5e]/30 overflow-hidden">
                  <div className="aspect-square relative">
                    <SecureImage
                      path={arte.image_url}
                      bucket="partner-artes"
                      alt={arte.title}
                      className="w-full h-full object-cover"
                      isPremium={true}
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Badge className="text-xs flex items-center gap-1 bg-[#1a1a2e]/80">
                        <Copy className="h-3 w-3" />
                        {arte.bonus_clicks}
                      </Badge>
                    </div>
                    <Badge
                      className={`absolute top-2 left-2 ${
                        status === "approved"
                          ? "bg-green-500"
                          : status === "rejected"
                          ? "bg-red-500"
                          : "bg-yellow-500"
                      }`}
                    >
                      {status === "approved" && <Check className="h-3 w-3 mr-1" />}
                      {status === "rejected" && <X className="h-3 w-3 mr-1" />}
                      {status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                      {status === "approved" ? "Aprovado" : status === "rejected" ? "Recusado" : "Pendente"}
                    </Badge>
                    {arte.deletion_requested && (
                      <Badge className="absolute bottom-2 left-2 bg-orange-500">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Exclusão Solicitada
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="text-white font-medium truncate">{arte.title}</h3>
                    <p className="text-white/60 text-sm">{arte.category}</p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-[#2d4a5e]/50 text-white/70 hover:text-white"
                        onClick={() => openEditModal(arte)}
                        disabled={arte.approved === true}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-red-500/50 text-red-400 hover:text-red-300"
                        onClick={() => handleRequestDeletion(arte.id)}
                        disabled={arte.deletion_requested === true}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-[#1a1a2e] border-[#2d4a5e]/30 text-white">
          <DialogHeader>
            <DialogTitle>Editar Arte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-yellow-200 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Ao editar, a arte voltará para análise e será removida da biblioteca até ser aprovada novamente.
              </p>
            </div>
            <div>
              <label className="text-sm text-white/60">Título</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-white/60">Categoria</label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-[#2d4a5e]/50">
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} className="text-white">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-white/60">Descrição</label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white min-h-[100px]"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-[#2d4a5e]/50 text-white/70"
                onClick={() => setShowEditModal(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-[#2d4a5e] hover:bg-[#3d5a6e] text-white"
                onClick={handleSaveEdit}
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnerDashboardArtes;
