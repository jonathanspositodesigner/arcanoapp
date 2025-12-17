import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Upload, CheckCircle, Settings, Users, 
  Handshake, Tag, Package, Image, Gift, FileSearch, UserPlus,
  GripVertical, LayoutGrid, RotateCcw, ReceiptText, Inbox
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayoutPlatform from "@/components/AdminLayoutPlatform";
import { useDashboardCardOrder } from "@/hooks/useDashboardCardOrder";
import { cn } from "@/lib/utils";

const ArtesMusicosFerramentas = () => {
  const navigate = useNavigate();
  const [pendingArtesPartnerCount, setPendingArtesPartnerCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      const { count: artesPartnerPendingCount } = await supabase
        .from('partner_artes')
        .select('*', { count: 'exact', head: true })
        .eq('approved', false);
      setPendingArtesPartnerCount(artesPartnerPendingCount || 0);
    };

    fetchStats();
  }, []);

  const { isReordering, setIsReordering, resetOrder, getDragProps } = useDashboardCardOrder("ferramentas_artes_musicos");

  return (
    <AdminLayoutPlatform platform="artes-musicos">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Ferramentas - Artes Músicos</h1>
            <p className="text-muted-foreground">Gerencie arquivos e contribuições da biblioteca de artes para músicos</p>
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
          <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg text-center mb-4">
            <p className="text-sm text-violet-600 font-medium">
              🔄 Arraste os cards para reordenar
            </p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          <Card
            className="p-6 bg-gradient-to-r from-violet-500/10 to-violet-500/5 border-violet-500/20 cursor-pointer hover:shadow-md transition-shadow" 
            onClick={() => navigate('/admin-artes-review')}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-violet-500/20 rounded-full">
                <Inbox className="h-8 w-8 text-violet-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">Envios para aprovar</p>
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
        <div className={cn(
          "grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6",
          isReordering && "[&>*]:ring-2 [&>*]:ring-violet-500/20 [&>*]:hover:ring-violet-500/40"
        )}>
          <Card 
            className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105 relative"
            onClick={() => !isReordering && navigate('/admin-upload-artes')}
            {...getDragProps("enviar-arte")}
          >
            {isReordering && (
              <div className="absolute top-2 right-2 z-10 p-1 bg-violet-500/20 rounded-md">
                <GripVertical className="h-4 w-4 text-violet-500" />
              </div>
            )}
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="p-2 sm:p-4 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full">
                <Upload className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
              </div>
              <h2 className="text-xs sm:text-2xl font-bold text-foreground">Enviar Arte</h2>
              <p className="text-muted-foreground hidden sm:block">Faça upload de novas artes</p>
            </div>
          </Card>

          <Card 
            className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105 relative"
            onClick={() => !isReordering && navigate('/admin-artes-review')}
            {...getDragProps("analisar-artes")}
          >
            {isReordering && (
              <div className="absolute top-2 right-2 z-10 p-1 bg-violet-500/20 rounded-md">
                <GripVertical className="h-4 w-4 text-violet-500" />
              </div>
            )}
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="p-2 sm:p-4 bg-green-500 rounded-full">
                <CheckCircle className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
              </div>
              <h2 className="text-xs sm:text-2xl font-bold text-foreground">Analisar Artes</h2>
              <p className="text-muted-foreground hidden sm:block">Aprove ou rejeite contribuições</p>
            </div>
          </Card>

          <Card 
            className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105 relative"
            onClick={() => !isReordering && navigate('/admin-manage-artes')}
            {...getDragProps("gerenciar-artes")}
          >
            {isReordering && (
              <div className="absolute top-2 right-2 z-10 p-1 bg-violet-500/20 rounded-md">
                <GripVertical className="h-4 w-4 text-violet-500" />
              </div>
            )}
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="p-2 sm:p-4 bg-blue-500 rounded-full">
                <Settings className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
              </div>
              <h2 className="text-xs sm:text-2xl font-bold text-foreground">Gerenciar Artes</h2>
              <p className="text-muted-foreground hidden sm:block">Edite ou exclua artes publicadas</p>
            </div>
          </Card>

          <Card 
            className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105 relative"
            onClick={() => !isReordering && navigate('/admin-manage-packs')}
            {...getDragProps("gerenciar-packs")}
          >
            {isReordering && (
              <div className="absolute top-2 right-2 z-10 p-1 bg-violet-500/20 rounded-md">
                <GripVertical className="h-4 w-4 text-violet-500" />
              </div>
            )}
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="p-2 sm:p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                <Package className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
              </div>
              <h2 className="text-xs sm:text-2xl font-bold text-foreground">Gerenciar Packs</h2>
              <p className="text-muted-foreground hidden sm:block">Configure packs e preços</p>
            </div>
          </Card>

          <Card 
            className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105 relative"
            onClick={() => !isReordering && navigate('/admin-pack-purchases')}
            {...getDragProps("clientes")}
          >
            {isReordering && (
              <div className="absolute top-2 right-2 z-10 p-1 bg-violet-500/20 rounded-md">
                <GripVertical className="h-4 w-4 text-violet-500" />
              </div>
            )}
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="p-2 sm:p-4 bg-teal-500 rounded-full">
                <Users className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
              </div>
              <h2 className="text-xs sm:text-2xl font-bold text-foreground">Clientes</h2>
              <p className="text-muted-foreground hidden sm:block">Gerencie clientes e acessos</p>
            </div>
          </Card>

          <Card 
            className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105 relative"
            onClick={() => !isReordering && navigate('/admin-parceiros-artes')}
            {...getDragProps("parceiros")}
          >
            {isReordering && (
              <div className="absolute top-2 right-2 z-10 p-1 bg-violet-500/20 rounded-md">
                <GripVertical className="h-4 w-4 text-violet-500" />
              </div>
            )}
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="p-2 sm:p-4 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full">
                <Handshake className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
              </div>
              <h2 className="text-xs sm:text-2xl font-bold text-foreground">Parceiros</h2>
              <p className="text-muted-foreground hidden sm:block">Cadastre e gerencie parceiros</p>
            </div>
          </Card>

          <Card 
            className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105 relative"
            onClick={() => !isReordering && navigate('/admin-categories-artes')}
            {...getDragProps("categorias")}
          >
            {isReordering && (
              <div className="absolute top-2 right-2 z-10 p-1 bg-violet-500/20 rounded-md">
                <GripVertical className="h-4 w-4 text-violet-500" />
              </div>
            )}
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="p-2 sm:p-4 bg-indigo-500 rounded-full">
                <Tag className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
              </div>
              <h2 className="text-xs sm:text-2xl font-bold text-foreground">Categorias</h2>
              <p className="text-muted-foreground hidden sm:block">Gerencie categorias de artes</p>
            </div>
          </Card>

          <Card 
            className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105 relative"
            onClick={() => !isReordering && navigate('/admin-manage-banners')}
            {...getDragProps("banners")}
          >
            {isReordering && (
              <div className="absolute top-2 right-2 z-10 p-1 bg-violet-500/20 rounded-md">
                <GripVertical className="h-4 w-4 text-violet-500" />
              </div>
            )}
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="p-2 sm:p-4 bg-rose-500 rounded-full">
                <Image className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
              </div>
              <h2 className="text-xs sm:text-2xl font-bold text-foreground">Banners</h2>
              <p className="text-muted-foreground hidden sm:block">Gerencie banners promocionais</p>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayoutPlatform>
  );
};

export default ArtesMusicosFerramentas;
