import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Upload, CheckCircle, Settings, LayoutDashboard, 
  FolderOpen, Inbox, Tag, ShieldCheck,
  GripVertical, LayoutGrid, RotateCcw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardCardOrder } from "@/hooks/useDashboardCardOrder";
import { cn } from "@/lib/utils";

const PromptsFerramentasContent = () => {
  const navigate = useNavigate();
  const [pendingCommunityCount, setPendingCommunityCount] = useState(0);
  const [pendingPartnerCount, setPendingPartnerCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      const { count: pendingCount } = await supabase
        .from('community_prompts')
        .select('*', { count: 'exact', head: true })
        .eq('approved', false);
      setPendingCommunityCount(pendingCount || 0);

      const { count: partnerPendingCount } = await supabase
        .from('partner_prompts')
        .select('*', { count: 'exact', head: true })
        .eq('approved', false);
      setPendingPartnerCount(partnerPendingCount || 0);
    };

    fetchStats();
  }, []);

  const { isReordering, setIsReordering, resetOrder, getDragProps } = useDashboardCardOrder("ferramentas_prompts_v2");

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Ferramentas</h2>
          <p className="text-muted-foreground text-sm">Gerencie arquivos e contribuições</p>
        </div>
      </div>

      {/* Reorder Controls */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant={isReordering ? "default" : "outline"}
          size="sm"
          onClick={() => setIsReordering(!isReordering)}
          className="gap-2"
        >
          <LayoutGrid className="h-4 w-4" />
          {isReordering ? "Concluir" : "Reorganizar"}
        </Button>
        {isReordering && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetOrder}
            className="gap-2 text-muted-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            Resetar
          </Button>
        )}
      </div>

      {isReordering && (
        <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-center mb-4">
          <p className="text-sm text-primary font-medium">
            🔄 Arraste os cards para reordenar
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 mb-6">
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
      <div className={cn(
        "grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6",
        isReordering && "[&>*]:ring-2 [&>*]:ring-primary/20 [&>*]:hover:ring-primary/40"
      )}>
        <Card 
          className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105 relative"
          onClick={() => !isReordering && navigate('/admin-upload')}
          {...getDragProps("enviar-arquivo")}
        >
          {isReordering && (
            <div className="absolute top-2 right-2 z-10 p-1 bg-primary/20 rounded-md">
              <GripVertical className="h-4 w-4 text-primary" />
            </div>
          )}
          <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
            <div className="p-2 sm:p-4 bg-gradient-primary rounded-full">
              <Upload className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
            </div>
            <h2 className="text-xs sm:text-2xl font-bold text-foreground">Enviar Arquivo</h2>
            <p className="text-muted-foreground hidden sm:block">Faça upload de novos arquivos</p>
          </div>
        </Card>

        <Card 
          className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105 relative"
          onClick={() => !isReordering && navigate('/admin-community-review')}
          {...getDragProps("analisar-arquivos")}
        >
          {isReordering && (
            <div className="absolute top-2 right-2 z-10 p-1 bg-primary/20 rounded-md">
              <GripVertical className="h-4 w-4 text-primary" />
            </div>
          )}
          <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
            <div className="p-2 sm:p-4 bg-green-500 rounded-full">
              <CheckCircle className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
            </div>
            <h2 className="text-xs sm:text-2xl font-bold text-foreground">Analisar Arquivos</h2>
            <p className="text-muted-foreground hidden sm:block">Aprove ou rejeite contribuições</p>
          </div>
        </Card>

        <Card 
          className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105 relative"
          onClick={() => !isReordering && navigate('/admin-manage-images')}
          {...getDragProps("gerenciar-imagens")}
        >
          {isReordering && (
            <div className="absolute top-2 right-2 z-10 p-1 bg-primary/20 rounded-md">
              <GripVertical className="h-4 w-4 text-primary" />
            </div>
          )}
          <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
            <div className="p-2 sm:p-4 bg-blue-500 rounded-full">
              <Settings className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
            </div>
            <h2 className="text-xs sm:text-2xl font-bold text-foreground">Gerenciar Imagens</h2>
            <p className="text-muted-foreground hidden sm:block">Edite ou exclua arquivos publicados</p>
          </div>
        </Card>

        <Card 
          className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105 relative"
          onClick={() => !isReordering && navigate('/admin-premium-dashboard')}
          {...getDragProps("gerenciar-premium")}
        >
          {isReordering && (
            <div className="absolute top-2 right-2 z-10 p-1 bg-primary/20 rounded-md">
              <GripVertical className="h-4 w-4 text-primary" />
            </div>
          )}
          <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
            <div className="p-2 sm:p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
              <LayoutDashboard className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
            </div>
            <h2 className="text-xs sm:text-2xl font-bold text-foreground">Gerenciar Premium</h2>
            <p className="text-muted-foreground hidden sm:block">Dashboard de assinaturas</p>
          </div>
        </Card>

        <Card 
          className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105 relative"
          onClick={() => !isReordering && navigate('/admin-collections')}
          {...getDragProps("colecoes")}
        >
          {isReordering && (
            <div className="absolute top-2 right-2 z-10 p-1 bg-primary/20 rounded-md">
              <GripVertical className="h-4 w-4 text-primary" />
            </div>
          )}
          <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
            <div className="p-2 sm:p-4 bg-teal-500 rounded-full">
              <FolderOpen className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
            </div>
            <h2 className="text-xs sm:text-2xl font-bold text-foreground">Coleções</h2>
            <p className="text-muted-foreground hidden sm:block">Crie coleções compartilháveis</p>
          </div>
        </Card>

        <Card 
          className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105 relative"
          onClick={() => !isReordering && navigate('/admin-categories-prompts')}
          {...getDragProps("categorias")}
        >
          {isReordering && (
            <div className="absolute top-2 right-2 z-10 p-1 bg-primary/20 rounded-md">
              <GripVertical className="h-4 w-4 text-primary" />
            </div>
          )}
          <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
            <div className="p-2 sm:p-4 bg-indigo-500 rounded-full">
              <Tag className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
            </div>
            <h2 className="text-xs sm:text-2xl font-bold text-foreground">Categorias</h2>
            <p className="text-muted-foreground hidden sm:block">Gerencie as categorias</p>
          </div>
        </Card>

        <Card 
          className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105 relative"
          onClick={() => !isReordering && navigate('/admin-manage-admins')}
          {...getDragProps("administradores")}
        >
          {isReordering && (
            <div className="absolute top-2 right-2 z-10 p-1 bg-primary/20 rounded-md">
              <GripVertical className="h-4 w-4 text-primary" />
            </div>
          )}
          <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
            <div className="p-2 sm:p-4 bg-gradient-to-r from-red-500 to-rose-600 rounded-full">
              <ShieldCheck className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
            </div>
            <h2 className="text-xs sm:text-2xl font-bold text-foreground">Administradores</h2>
            <p className="text-muted-foreground hidden sm:block">Gerencie contas de admin</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PromptsFerramentasContent;
