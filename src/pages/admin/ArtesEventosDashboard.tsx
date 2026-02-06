import { useState } from "react";
import AdminLayoutPlatform from "@/components/AdminLayoutPlatform";
import AdminSimpleMetrics from "@/components/AdminSimpleMetrics";
import ArtesEventosFerramentasContent from "@/components/admin/ArtesEventosFerramentasContent";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { TreePine, Gift, Loader2, Sparkles } from "lucide-react";
import { useYearEndPromo } from "@/hooks/useYearEndPromo";
import { toast } from "sonner";

const ArtesEventosDashboard = () => {
  const { isActive, promoName, discountPercent, endDate, loading, togglePromo } = useYearEndPromo();
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    const success = await togglePromo();
    if (success) {
      toast.success(isActive ? "Promoção desativada!" : "Promoção ativada!");
    } else {
      toast.error("Erro ao alterar promoção");
    }
    setToggling(false);
  };

  const formatEndDate = (date: string) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AdminLayoutPlatform platform="artes-eventos">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Artes Eventos - Admin</h1>
          <p className="text-muted-foreground">Painel administrativo da plataforma</p>
        </div>
        
        {/* Year-End Promo Control Card */}
        {!loading && (
          <Card className={`overflow-hidden ${
            isActive 
              ? 'bg-gradient-to-r from-red-600 via-green-600 to-red-600 text-white border-0' 
              : 'bg-muted/50 border-dashed border-2'
          }`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${isActive ? 'bg-white/20' : 'bg-primary/10'}`}>
                    <TreePine className={`h-8 w-8 ${isActive ? 'text-white' : 'text-primary'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className={`text-xl font-bold ${isActive ? 'text-white' : 'text-foreground'}`}>
                        {promoName || "Promoção de Fim de Ano"}
                      </h2>
                      {isActive && (
                        <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" />
                      )}
                    </div>
                    <p className={`${isActive ? 'text-white/80' : 'text-muted-foreground'}`}>
                      {isActive ? (
                        <>
                          <span className="font-semibold">ATIVA!</span> Todos os visitantes veem {discountPercent}% OFF
                          {endDate && <span className="ml-2">• Termina em {formatEndDate(endDate)}</span>}
                        </>
                      ) : (
                        "Clique para ativar a promoção de fim de ano em todos os packs"
                      )}
                    </p>
                    {isActive && (
                      <div className="flex gap-2 mt-2">
                        <Badge className="bg-white/20 text-white border-0">
                          <Gift className="h-3 w-3 mr-1" />
                          {discountPercent}% OFF
                        </Badge>
                        <Badge className="bg-white/20 text-white border-0">
                          Página: /promos-natal
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {toggling && <Loader2 className="h-5 w-5 animate-spin text-white" />}
                  <Switch 
                    checked={isActive}
                    onCheckedChange={handleToggle}
                    disabled={toggling}
                    className="scale-150 data-[state=checked]:bg-white data-[state=unchecked]:bg-muted"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Ferramentas primeiro */}
        <ArtesEventosFerramentasContent />
        
        {/* Dashboard embaixo */}
        <div className="pt-6 border-t border-border">
          <AdminSimpleMetrics />
        </div>
      </div>
    </AdminLayoutPlatform>
  );
};

export default ArtesEventosDashboard;
