import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, CheckCircle, Settings, Users, Crown, LayoutDashboard, 
  FolderOpen, Inbox, Handshake, Palette, FileText, Tag, Package, 
  Image, ShoppingCart, ShieldCheck, Gift, ShieldBan, FileSearch 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";

const AdminFerramentas = () => {
  const navigate = useNavigate();
  const [pendingCommunityCount, setPendingCommunityCount] = useState(0);
  const [pendingPartnerCount, setPendingPartnerCount] = useState(0);
  const [pendingArtesPartnerCount, setPendingArtesPartnerCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      // Fetch pending community submissions
      const { count: pendingCount } = await supabase
        .from('community_prompts')
        .select('*', { count: 'exact', head: true })
        .eq('approved', false);
      setPendingCommunityCount(pendingCount || 0);

      // Fetch pending partner submissions (prompts)
      const { count: partnerPendingCount } = await supabase
        .from('partner_prompts')
        .select('*', { count: 'exact', head: true })
        .eq('approved', false);
      setPendingPartnerCount(partnerPendingCount || 0);

      // Fetch pending partner artes submissions
      const { count: artesPartnerPendingCount } = await supabase
        .from('partner_artes')
        .select('*', { count: 'exact', head: true })
        .eq('approved', false);
      setPendingArtesPartnerCount(artesPartnerPendingCount || 0);
    };

    fetchStats();
  }, []);

  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Ferramentas</h1>
        <p className="text-muted-foreground mb-8">Gerencie arquivos e contribuições das bibliotecas</p>

        <Tabs defaultValue="prompts" className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 mb-6 h-auto gap-2">
            <TabsTrigger 
              value="prompts" 
              className="text-sm sm:text-lg gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Biblioteca de Prompts</span>
            </TabsTrigger>
            <TabsTrigger 
              value="artes" 
              className="text-sm sm:text-lg gap-2 py-3 data-[state=active]:bg-amber-500 data-[state=active]:text-white"
            >
              <Palette className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Biblioteca de Artes Arcanas</span>
            </TabsTrigger>
          </TabsList>

          {/* Prompts Tab Content */}
          <TabsContent value="prompts" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4">
              <Card 
                className="p-6 bg-gradient-to-r from-orange-500/10 to-orange-500/5 border-orange-500/20 cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => navigate('/admin-community-review')}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-500/20 rounded-full">
                    <Inbox className="h-8 w-8 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-2">Envios para aprovar</p>
                    <div className="flex gap-6">
                      <div>
                        <p className="text-2xl font-bold text-foreground">{pendingCommunityCount}</p>
                        <p className="text-xs text-muted-foreground">Comunidade</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{pendingPartnerCount}</p>
                        <p className="text-xs text-muted-foreground">Parceiros</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <Card className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-upload')}>
                <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
                  <div className="p-2 sm:p-4 bg-gradient-primary rounded-full">
                    <Upload className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
                  </div>
                  <h2 className="text-xs sm:text-2xl font-bold text-foreground">Enviar Arquivo</h2>
                  <p className="text-muted-foreground hidden sm:block">Faça upload de novos arquivos exclusivos para a biblioteca</p>
                </div>
              </Card>

              <Card className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-community-review')}>
                <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
                  <div className="p-2 sm:p-4 bg-green-500 rounded-full">
                    <CheckCircle className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
                  </div>
                  <h2 className="text-xs sm:text-2xl font-bold text-foreground">Analisar Arquivos</h2>
                  <p className="text-muted-foreground hidden sm:block">Aprove ou rejeite contribuições enviadas</p>
                </div>
              </Card>

              <Card className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-manage-images')}>
                <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
                  <div className="p-2 sm:p-4 bg-blue-500 rounded-full">
                    <Settings className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
                  </div>
                  <h2 className="text-xs sm:text-2xl font-bold text-foreground">Gerenciar Imagens</h2>
                  <p className="text-muted-foreground hidden sm:block">Edite ou exclua arquivos já publicados</p>
                </div>
              </Card>

              <Card className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-premium-dashboard')}>
                <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
                  <div className="p-2 sm:p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                    <LayoutDashboard className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
                  </div>
                  <h2 className="text-xs sm:text-2xl font-bold text-foreground">Gerenciar Premium</h2>
                  <p className="text-muted-foreground hidden sm:block">Dashboard de assinaturas premium</p>
                </div>
              </Card>

              <Card className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-collections')}>
                <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
                  <div className="p-2 sm:p-4 bg-teal-500 rounded-full">
                    <FolderOpen className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
                  </div>
                  <h2 className="text-xs sm:text-2xl font-bold text-foreground">Coleções</h2>
                  <p className="text-muted-foreground hidden sm:block">Crie coleções com links compartilháveis</p>
                </div>
              </Card>

              <Card className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-partners')}>
                <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
                  <div className="p-2 sm:p-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full">
                    <Handshake className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
                  </div>
                  <h2 className="text-xs sm:text-2xl font-bold text-foreground">Gerenciar Parceiros</h2>
                  <p className="text-muted-foreground hidden sm:block">Cadastre e gerencie contribuidores</p>
                </div>
              </Card>

              <Card className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-categories-prompts')}>
                <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
                  <div className="p-2 sm:p-4 bg-indigo-500 rounded-full">
                    <Tag className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
                  </div>
                  <h2 className="text-xs sm:text-2xl font-bold text-foreground">Categorias</h2>
                  <p className="text-muted-foreground hidden sm:block">Gerencie as categorias de prompts</p>
                </div>
              </Card>

              <Card className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-manage-admins')}>
                <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
                  <div className="p-2 sm:p-4 bg-gradient-to-r from-red-500 to-rose-600 rounded-full">
                    <ShieldCheck className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
                  </div>
                  <h2 className="text-xs sm:text-2xl font-bold text-foreground">Administradores</h2>
                  <p className="text-muted-foreground hidden sm:block">Gerencie contas de administradores</p>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Artes Arcanas Tab Content */}
          <TabsContent value="artes" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4">
              <Card 
                className="p-6 bg-gradient-to-r from-orange-500/10 to-orange-500/5 border-orange-500/20 cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => navigate('/admin-artes-review')}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-500/20 rounded-full">
                    <Inbox className="h-8 w-8 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-2">Artes para aprovar</p>
                    <div className="flex gap-6">
                      <div>
                        <p className="text-2xl font-bold text-foreground">{pendingArtesPartnerCount}</p>
                        <p className="text-xs text-muted-foreground">Parceiros</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <Card className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-upload-artes')}>
                <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
                  <div className="p-2 sm:p-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full">
                    <Upload className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
                  </div>
                  <h2 className="text-xs sm:text-2xl font-bold text-foreground">Enviar Arte</h2>
                  <p className="text-muted-foreground hidden sm:block">Upload de novas artes para a biblioteca</p>
                </div>
              </Card>

              <Card className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-artes-review')}>
                <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
                  <div className="p-2 sm:p-4 bg-green-500 rounded-full">
                    <CheckCircle className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
                  </div>
                  <h2 className="text-xs sm:text-2xl font-bold text-foreground">Analisar Artes</h2>
                  <p className="text-muted-foreground hidden sm:block">Aprove ou rejeite contribuições de artes</p>
                </div>
              </Card>

              <Card className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-manage-artes')}>
                <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
                  <div className="p-2 sm:p-4 bg-blue-500 rounded-full">
                    <Settings className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
                  </div>
                  <h2 className="text-xs sm:text-2xl font-bold text-foreground">Gerenciar Artes</h2>
                  <p className="text-muted-foreground hidden sm:block">Edite ou exclua artes já publicadas</p>
                </div>
              </Card>

              <Card className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-parceiros-artes')}>
                <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
                  <div className="p-2 sm:p-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full">
                    <Handshake className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
                  </div>
                  <h2 className="text-xs sm:text-2xl font-bold text-foreground">Gerenciar Parceiros</h2>
                  <p className="text-muted-foreground hidden sm:block">Gerencie colaboradores de artes</p>
                </div>
              </Card>

              <Card className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-manage-packs')}>
                <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
                  <div className="p-2 sm:p-4 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full">
                    <Package className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
                  </div>
                  <h2 className="text-xs sm:text-2xl font-bold text-foreground">Gerenciar Packs</h2>
                  <p className="text-muted-foreground hidden sm:block">Cadastre e edite os packs de artes</p>
                </div>
              </Card>

              <Card className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-manage-banners')}>
                <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
                  <div className="p-2 sm:p-4 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full">
                    <Image className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
                  </div>
                  <h2 className="text-xs sm:text-2xl font-bold text-foreground">Gerenciar Banners</h2>
                  <p className="text-muted-foreground hidden sm:block">Carrossel de divulgação da biblioteca</p>
                </div>
              </Card>

              <Card className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-pack-purchases')}>
                <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
                  <div className="p-2 sm:p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full">
                    <ShoppingCart className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
                  </div>
                  <h2 className="text-xs sm:text-2xl font-bold text-foreground">Gerenciar Clientes</h2>
                  <p className="text-muted-foreground hidden sm:block">Gerenciar acessos de usuários aos packs</p>
                </div>
              </Card>

              <Card className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-manage-promotions')}>
                <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
                  <div className="p-2 sm:p-4 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full">
                    <Gift className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
                  </div>
                  <h2 className="text-xs sm:text-2xl font-bold text-foreground">Promoções</h2>
                  <p className="text-muted-foreground hidden sm:block">Gerencie combos e promoções com webhook</p>
                </div>
              </Card>

              <Card className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-categories-artes')}>
                <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
                  <div className="p-2 sm:p-4 bg-indigo-500 rounded-full">
                    <Tag className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
                  </div>
                  <h2 className="text-xs sm:text-2xl font-bold text-foreground">Categorias</h2>
                  <p className="text-muted-foreground hidden sm:block">Gerencie as categorias de artes</p>
                </div>
              </Card>

              <Card className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-webhook-logs')}>
                <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
                  <div className="p-2 sm:p-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full">
                    <FileSearch className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
                  </div>
                  <h2 className="text-xs sm:text-2xl font-bold text-foreground">Logs de Webhook</h2>
                  <p className="text-muted-foreground hidden sm:block">Monitore webhooks recebidos</p>
                </div>
              </Card>

              <Card className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-blacklist')}>
                <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
                  <div className="p-2 sm:p-4 bg-gradient-to-r from-red-500 to-rose-600 rounded-full">
                    <ShieldBan className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
                  </div>
                  <h2 className="text-xs sm:text-2xl font-bold text-foreground">Lista Negra</h2>
                  <p className="text-muted-foreground hidden sm:block">Emails bloqueados (fraudes)</p>
                </div>
              </Card>

              <Card className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/biblioteca-artes')}>
                <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
                  <div className="p-2 sm:p-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full">
                    <Palette className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
                  </div>
                  <h2 className="text-xs sm:text-2xl font-bold text-foreground">Ver Biblioteca</h2>
                  <p className="text-muted-foreground hidden sm:block">Acesse a Biblioteca de Artes Arcanas</p>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminFerramentas;
