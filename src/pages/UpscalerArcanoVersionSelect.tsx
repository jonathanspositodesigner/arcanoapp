import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock, Unlock, Sparkles } from "lucide-react";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { supabase } from "@/integrations/supabase/client";

const UpscalerArcanoVersionSelect = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('tools');
  const { user, hasAccessToPack, isLoading: premiumLoading } = usePremiumArtesStatus();
  
  const [purchaseDate, setPurchaseDate] = useState<Date | null>(null);
  const [isLoadingPurchase, setIsLoadingPurchase] = useState(true);

  const hasAccess = hasAccessToPack('upscaller-arcano');

  // Fetch purchase date for 7-day lock calculation
  useEffect(() => {
    const fetchPurchaseDate = async () => {
      if (!user) {
        setIsLoadingPurchase(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_pack_purchases')
          .select('purchased_at')
          .eq('user_id', user.id)
          .eq('pack_slug', 'upscaller-arcano')
          .eq('is_active', true)
          .order('purchased_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          setPurchaseDate(new Date(data.purchased_at));
        }
      } catch (err) {
        console.error('Error fetching purchase date:', err);
      } finally {
        setIsLoadingPurchase(false);
      }
    };

    if (!premiumLoading) {
      fetchPurchaseDate();
    }
  }, [user, premiumLoading]);

  // Redirect if no access
  useEffect(() => {
    if (!premiumLoading && !isLoadingPurchase && (!user || !hasAccess)) {
      navigate("/ferramentas-ia");
    }
  }, [premiumLoading, isLoadingPurchase, user, hasAccess, navigate]);

  const isLoading = premiumLoading || isLoadingPurchase;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  // Calculate unlock date (7 days after purchase)
  const unlockDate = purchaseDate ? new Date(purchaseDate) : null;
  if (unlockDate) {
    unlockDate.setDate(unlockDate.getDate() + 7);
  }

  const now = new Date();
  const isV1_5Unlocked = unlockDate ? now >= unlockDate : false;
  
  // Calculate days remaining
  const daysRemaining = unlockDate 
    ? Math.max(0, Math.ceil((unlockDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Format unlock date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/ferramentas-ia")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Upscaler Arcano
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Escolha a versão que deseja acessar
            </p>
          </div>
        </div>

        {/* Version Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* V1 Card - Always Accessible */}
          <Card 
            className="relative p-6 bg-gradient-to-br from-purple-900/50 to-purple-800/30 border-purple-500/30 hover:border-purple-400/50 transition-all cursor-pointer group"
            onClick={() => navigate("/ferramenta-ia-artes/upscaller-arcano-v1")}
          >
            <div className="absolute top-4 right-4">
              <div className="flex items-center gap-1.5 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-medium">
                <Unlock className="h-3 w-3" />
                Disponível
              </div>
            </div>

            <div className="pt-6">
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                Upscaler Arcano
              </h2>
              <p className="text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                v1.0
              </p>
              <p className="text-muted-foreground text-sm mb-6">
                Versão original com todas as aulas de introdução e configuração da ferramenta.
              </p>
              
              <Button 
                className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white group-hover:scale-[1.02] transition-transform"
              >
                Acessar Aulas
              </Button>
            </div>
          </Card>

          {/* V1.5 Card - Locked for 7 days */}
          <Card 
            className={`relative p-6 transition-all ${
              isV1_5Unlocked 
                ? 'bg-gradient-to-br from-yellow-900/50 to-orange-800/30 border-yellow-500/30 hover:border-yellow-400/50 cursor-pointer group'
                : 'bg-gradient-to-br from-gray-900/50 to-gray-800/30 border-gray-600/30 cursor-not-allowed opacity-80'
            }`}
            onClick={() => isV1_5Unlocked && navigate("/ferramenta-ia-artes/upscaller-arcano-v1-5")}
          >
            {/* Lock/Unlock Badge */}
            <div className="absolute top-4 right-4">
              {isV1_5Unlocked ? (
                <div className="flex items-center gap-1.5 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-medium">
                  <Unlock className="h-3 w-3" />
                  Disponível
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-medium">
                  <Lock className="h-3 w-3" />
                  BLOQUEADO
                </div>
              )}
            </div>

            {/* NEW Badge */}
            <div className="absolute top-4 left-4">
              <div className="flex items-center gap-1.5 bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs font-medium">
                <Sparkles className="h-3 w-3" />
                NOVO
              </div>
            </div>

            <div className="pt-6">
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                Upscaler Arcano
              </h2>
              <p className={`text-3xl md:text-4xl font-black bg-clip-text text-transparent mb-4 ${
                isV1_5Unlocked 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-400'
                  : 'bg-gradient-to-r from-gray-400 to-gray-500'
              }`}>
                v1.5
              </p>
              <p className="text-muted-foreground text-sm mb-4">
                Nova versão com atualizações e melhorias avançadas.
              </p>
              
              {/* Unlock Info */}
              {!isV1_5Unlocked && unlockDate && (
                <div className="bg-gray-800/50 rounded-lg p-3 mb-4 border border-gray-700/50">
                  <p className="text-sm text-gray-300">
                    <span className="font-medium text-yellow-400">Libera em:</span>{' '}
                    {formatDate(unlockDate)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Faltam <span className="font-bold text-yellow-400">{daysRemaining}</span> {daysRemaining === 1 ? 'dia' : 'dias'}
                  </p>
                </div>
              )}
              
              <Button 
                disabled={!isV1_5Unlocked}
                className={`w-full ${
                  isV1_5Unlocked 
                    ? 'bg-gradient-to-r from-yellow-600 to-orange-500 hover:from-yellow-500 hover:to-orange-400 text-white group-hover:scale-[1.02] transition-transform'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isV1_5Unlocked ? 'Acessar Aulas' : 'Bloqueado'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UpscalerArcanoVersionSelect;
