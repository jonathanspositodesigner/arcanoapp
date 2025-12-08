import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, CheckCircle, Settings, LogOut, Bell, Users, Home, Crown, LayoutDashboard, FolderOpen, Inbox, Handshake, Palette, FileText, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AdminAnalyticsDashboard from "@/components/AdminAnalyticsDashboard";
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [pendingCommunityCount, setPendingCommunityCount] = useState(0);
  const [pendingPartnerCount, setPendingPartnerCount] = useState(0);
  const [pendingArtesPartnerCount, setPendingArtesPartnerCount] = useState(0);
  useEffect(() => {
    const checkAdminStatus = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        navigate('/admin-login');
        return;
      }
      const {
        data: roleData
      } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
      if (!roleData) {
        toast.error("Acesso negado");
        navigate('/');
        return;
      }
      setIsAdmin(true);
      setIsLoading(false);

      // Fetch subscriber count
      const {
        count: subCount
      } = await supabase.from('push_subscriptions').select('*', {
        count: 'exact',
        head: true
      });
      setSubscriberCount(subCount || 0);

      // Fetch pending community submissions
      const {
        count: pendingCount
      } = await supabase.from('community_prompts').select('*', {
        count: 'exact',
        head: true
      }).eq('approved', false);
      setPendingCommunityCount(pendingCount || 0);

      // Fetch pending partner submissions (prompts)
      const {
        count: partnerPendingCount
      } = await supabase.from('partner_prompts').select('*', {
        count: 'exact',
        head: true
      }).eq('approved', false);
      setPendingPartnerCount(partnerPendingCount || 0);

      // Fetch pending partner artes submissions
      const {
        count: artesPartnerPendingCount
      } = await supabase.from('partner_artes').select('*', {
        count: 'exact',
        head: true
      }).eq('approved', false);
      setPendingArtesPartnerCount(artesPartnerPendingCount || 0);
    };
    checkAdminStatus();
  }, [navigate]);
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso");
    navigate('/');
  };
  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Carregando...</p>
      </div>;
  }
  if (!isAdmin) {
    return null;
  }
  return <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Painel Administrativo
            </h1>
            <p className="text-muted-foreground text-lg">
              Gerencie arquivos e contribuições da comunidade
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
              <Home className="h-4 w-4" />
              Home
            </Button>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        {/* Tabs for Prompts and Artes */}
        <Tabs defaultValue="prompts" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 h-14">
            <TabsTrigger value="prompts" className="text-lg gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="h-5 w-5" />
              Biblioteca de Prompts
            </TabsTrigger>
            <TabsTrigger value="artes" className="text-lg gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Palette className="h-5 w-5" />
              Biblioteca de Artes Arcanas
            </TabsTrigger>
          </TabsList>

          {/* Prompts Tab Content */}
          <TabsContent value="prompts" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/20 rounded-full">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Notificações ativas</p>
                    <p className="text-3xl font-bold text-foreground">{subscriberCount}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-r from-orange-500/10 to-orange-500/5 border-orange-500/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin-community-review')}>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-upload')}>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-4 bg-gradient-primary rounded-full">
                    <Upload className="h-12 w-12 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Enviar Arquivo
                  </h2>
                  <p className="text-muted-foreground">
                    Faça upload de novos arquivos exclusivos para a biblioteca
                  </p>
                </div>
              </Card>

              <Card className="p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-community-review')}>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-4 bg-green-500 rounded-full">
                    <CheckCircle className="h-12 w-12 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Analisar Arquivos
                  </h2>
                  <p className="text-muted-foreground">
                    Aprove ou rejeite contribuições enviadas
                  </p>
                </div>
              </Card>

              <Card className="p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-manage-images')}>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-4 bg-blue-500 rounded-full">
                    <Settings className="h-12 w-12 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Gerenciar Imagens
                  </h2>
                  <p className="text-muted-foreground">
                    Edite ou exclua arquivos já publicados
                  </p>
                </div>
              </Card>

              <Card className="p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-push-notifications')}>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-4 bg-orange-500 rounded-full">
                    <Bell className="h-12 w-12 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Notificações Push
                  </h2>
                  <p className="text-muted-foreground">
                    Envie notificações para usuários inscritos
                  </p>
                </div>
              </Card>

              <Card className="p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-premium-dashboard')}>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                    <LayoutDashboard className="h-12 w-12 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Gerenciar Premium
                  </h2>
                  <p className="text-muted-foreground">
                    Dashboard de assinaturas premium
                  </p>
                </div>
              </Card>

              <Card className="p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-collections')}>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-4 bg-teal-500 rounded-full">
                    <FolderOpen className="h-12 w-12 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Coleções
                  </h2>
                  <p className="text-muted-foreground">
                    Crie coleções com links compartilháveis
                  </p>
                </div>
              </Card>

              <Card className="p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-partners')}>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full">
                    <Handshake className="h-12 w-12 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Gerenciar Parceiros
                  </h2>
                  <p className="text-muted-foreground">
                    Cadastre e gerencie contribuidores
                  </p>
                </div>
              </Card>

              <Card className="p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-categories-prompts')}>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-4 bg-indigo-500 rounded-full">
                    <Tag className="h-12 w-12 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Categorias
                  </h2>
                  <p className="text-muted-foreground">
                    Gerencie as categorias de prompts
                  </p>
                </div>
              </Card>

              <Card className="p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/biblioteca-prompts')}>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-4 bg-primary rounded-full">
                    <FileText className="h-12 w-12 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Ver Biblioteca
                  </h2>
                  <p className="text-muted-foreground">
                    Acesse a Biblioteca de Prompts
                  </p>
                </div>
              </Card>
            </div>

            {/* Analytics Dashboard */}
            <AdminAnalyticsDashboard />
          </TabsContent>

          {/* Artes Arcanas Tab Content */}
          <TabsContent value="artes" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/5 border-amber-500/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-500/20 rounded-full">
                    <Users className="h-8 w-8 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Notificações ativas</p>
                    <p className="text-3xl font-bold text-foreground">{subscriberCount}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-r from-orange-500/10 to-orange-500/5 border-orange-500/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin-artes-review')}>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-upload-artes')}>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full">
                    <Upload className="h-12 w-12 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Enviar Arte
                  </h2>
                  <p className="text-muted-foreground">
                    Upload de novas artes para a biblioteca
                  </p>
                </div>
              </Card>

              <Card className="p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-artes-review')}>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-4 bg-green-500 rounded-full">
                    <CheckCircle className="h-12 w-12 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Analisar Artes
                  </h2>
                  <p className="text-muted-foreground">
                    Aprove ou rejeite contribuições de artes
                  </p>
                </div>
              </Card>

              <Card className="p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-manage-artes')}>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-4 bg-blue-500 rounded-full">
                    <Settings className="h-12 w-12 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Gerenciar Artes
                  </h2>
                  <p className="text-muted-foreground">
                    Edite ou exclua artes já publicadas
                  </p>
                </div>
              </Card>

              <Card className="p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-parceiros-artes')}>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full">
                    <Handshake className="h-12 w-12 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Gerenciar Parceiros 
                  </h2>
                  <p className="text-muted-foreground">
                    Gerencie colaboradores de artes
                  </p>
                </div>
              </Card>

              <Card className="p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-manage-premium')}>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                    <Crown className="h-12 w-12 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    ​Gerenciar Clientes
      
                  </h2>
                  <p className="text-muted-foreground">
                    Gerenciar usuários premium de Artes
                  </p>
                </div>
              </Card>

              <Card className="p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/admin-categories-artes')}>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-4 bg-indigo-500 rounded-full">
                    <Tag className="h-12 w-12 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Categorias
                  </h2>
                  <p className="text-muted-foreground">
                    Gerencie as categorias de artes
                  </p>
                </div>
              </Card>

              <Card className="p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" onClick={() => navigate('/biblioteca-artes')}>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full">
                    <Palette className="h-12 w-12 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Ver Biblioteca
                  </h2>
                  <p className="text-muted-foreground">
                    Acesse a Biblioteca de Artes Arcanas
                  </p>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>;
};
export default AdminDashboard;