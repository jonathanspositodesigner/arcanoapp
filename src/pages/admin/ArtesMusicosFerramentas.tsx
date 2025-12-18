import { useNavigate } from "react-router-dom";
import AdminLayoutPlatform from "@/components/AdminLayoutPlatform";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, CheckCircle, Settings, Users, 
  Handshake, Tag, Package, Image, Inbox, Clock
} from "lucide-react";

const ArtesMusicosFerramentas = () => {
  const navigate = useNavigate();

  return (
    <AdminLayoutPlatform platform="artes-musicos">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Ferramentas - Artes Músicos</h1>
            <p className="text-muted-foreground">Gerencie arquivos e contribuições da biblioteca de artes para músicos</p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-lg mb-6">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-violet-500" />
            <p className="text-sm text-violet-600 font-medium">
              As demais ferramentas estão em desenvolvimento. Em breve você poderá configurar tudo por aqui!
            </p>
          </div>
        </div>

        {/* Stats Cards - Disabled */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          <Card className="p-6 bg-gradient-to-r from-violet-500/10 to-violet-500/5 border-violet-500/20 opacity-60 cursor-not-allowed relative">
            <Badge className="absolute top-2 right-2 bg-violet-500/20 text-violet-600 border-violet-500/30">
              Em breve
            </Badge>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-violet-500/20 rounded-full">
                <Inbox className="h-8 w-8 text-violet-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">Envios para aprovar</p>
                <div className="flex gap-6">
                  <div>
                    <p className="text-2xl font-bold text-foreground">0</p>
                    <p className="text-xs text-muted-foreground">Parceiros</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {/* Upload - ENABLED */}
          <Card 
            className="p-3 sm:p-8 cursor-pointer hover:shadow-lg transition-all hover:border-violet-500/50"
            onClick={() => navigate("/admin-upload-artes-musicos")}
          >
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="p-2 sm:p-4 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full">
                <Upload className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
              </div>
              <h2 className="text-xs sm:text-2xl font-bold text-foreground">Enviar Arte</h2>
              <p className="text-muted-foreground hidden sm:block">Faça upload de novas artes</p>
            </div>
          </Card>

          <Card className="p-3 sm:p-8 opacity-60 cursor-not-allowed relative">
            <Badge className="absolute top-2 right-2 bg-violet-500/20 text-violet-600 border-violet-500/30 text-[10px] sm:text-xs">
              Em breve
            </Badge>
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="p-2 sm:p-4 bg-green-500 rounded-full">
                <CheckCircle className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
              </div>
              <h2 className="text-xs sm:text-2xl font-bold text-foreground">Analisar Artes</h2>
              <p className="text-muted-foreground hidden sm:block">Aprove ou rejeite contribuições</p>
            </div>
          </Card>

          <Card 
            className="p-3 sm:p-8 cursor-pointer hover:shadow-lg transition-all hover:border-violet-500/50"
            onClick={() => navigate("/admin-manage-artes-musicos")}
          >
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="p-2 sm:p-4 bg-blue-500 rounded-full">
                <Settings className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
              </div>
              <h2 className="text-xs sm:text-2xl font-bold text-foreground">Gerenciar Artes</h2>
              <p className="text-muted-foreground hidden sm:block">Edite ou exclua artes publicadas</p>
            </div>
          </Card>

          <Card className="p-3 sm:p-8 opacity-60 cursor-not-allowed relative">
            <Badge className="absolute top-2 right-2 bg-violet-500/20 text-violet-600 border-violet-500/30 text-[10px] sm:text-xs">
              Em breve
            </Badge>
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="p-2 sm:p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                <Package className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
              </div>
              <h2 className="text-xs sm:text-2xl font-bold text-foreground">Gerenciar Packs</h2>
              <p className="text-muted-foreground hidden sm:block">Configure packs e preços</p>
            </div>
          </Card>

          <Card className="p-3 sm:p-8 opacity-60 cursor-not-allowed relative">
            <Badge className="absolute top-2 right-2 bg-violet-500/20 text-violet-600 border-violet-500/30 text-[10px] sm:text-xs">
              Em breve
            </Badge>
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="p-2 sm:p-4 bg-teal-500 rounded-full">
                <Users className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
              </div>
              <h2 className="text-xs sm:text-2xl font-bold text-foreground">Clientes</h2>
              <p className="text-muted-foreground hidden sm:block">Gerencie clientes e acessos</p>
            </div>
          </Card>

          <Card className="p-3 sm:p-8 opacity-60 cursor-not-allowed relative">
            <Badge className="absolute top-2 right-2 bg-violet-500/20 text-violet-600 border-violet-500/30 text-[10px] sm:text-xs">
              Em breve
            </Badge>
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="p-2 sm:p-4 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full">
                <Handshake className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
              </div>
              <h2 className="text-xs sm:text-2xl font-bold text-foreground">Parceiros</h2>
              <p className="text-muted-foreground hidden sm:block">Cadastre e gerencie parceiros</p>
            </div>
          </Card>

          <Card 
            className="p-3 sm:p-8 cursor-pointer hover:shadow-lg transition-all hover:border-violet-500/50"
            onClick={() => navigate("/admin-categories-musicos")}
          >
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="p-2 sm:p-4 bg-indigo-500 rounded-full">
                <Tag className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
              </div>
              <h2 className="text-xs sm:text-2xl font-bold text-foreground">Categorias</h2>
              <p className="text-muted-foreground hidden sm:block">Gerencie categorias de artes</p>
            </div>
          </Card>

          <Card className="p-3 sm:p-8 opacity-60 cursor-not-allowed relative">
            <Badge className="absolute top-2 right-2 bg-violet-500/20 text-violet-600 border-violet-500/30 text-[10px] sm:text-xs">
              Em breve
            </Badge>
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
