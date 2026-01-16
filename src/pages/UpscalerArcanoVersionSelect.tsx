import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock, Unlock, Sparkles, Zap, Target } from "lucide-react";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { supabase } from "@/integrations/supabase/client";
import upscalerV1Image from "@/assets/upscaler-v1-card.png";
import upscalerV2Image from "@/assets/upscaler-v1-5-card.png";

const UpscalerArcanoVersionSelect = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('tools');
  const { user, hasAccessToPack, isLoading: premiumLoading } = usePremiumArtesStatus();
  const { planType, isLoading: promptsLoading } = usePremiumStatus();
  
  const [purchaseDate, setPurchaseDate] = useState<Date | null>(null);
  const [isLoadingPurchase, setIsLoadingPurchase] = useState(true);

  const hasUnlimitedAccess = planType === "arcano_unlimited";
  const hasUpscalerPack = hasAccessToPack('upscaller-arcano');
  const hasAccess = hasUnlimitedAccess || hasUpscalerPack;
  const isArcanoUnlimitedOnly = hasUnlimitedAccess && !hasUpscalerPack;

  // Fetch purchase date for 7-day lock calculation
  useEffect(() => {
    const fetchPurchaseDate = async () => {
      if (!user) {
        setIsLoadingPurchase(false);
        return;
      }

      try {
        // 1) Prefer user_pack_purchases
        const { data, error } = await supabase
          .from('user_pack_purchases')
          .select('purchased_at')
          .eq('user_id', user.id)
          .in('pack_slug', ['upscaller-arcano', 'upscaler-arcano'])
          .eq('is_active', true)
          .order('purchased_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!error && data?.purchased_at) {
          setPurchaseDate(new Date(data.purchased_at));
          return;
        }

        // 2) Fallback: subscription-based access (if applicable)
        const { data: premiumData, error: premiumError } = await supabase
          .from('premium_artes_users')
          .select('subscribed_at, created_at')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!premiumError && premiumData) {
          const dt = premiumData.subscribed_at || premiumData.created_at;
          if (dt) setPurchaseDate(new Date(dt));
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

  const isLoading = premiumLoading || promptsLoading || isLoadingPurchase;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Não redireciona silenciosamente (isso parecia que “não saiu da página”)
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-2xl text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Upscaler Arcano</h1>
          <p className="text-muted-foreground">Faça login para acessar as versões.</p>
          <Button onClick={() => navigate("/login-artes")}>
            Fazer login
          </Button>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-2xl text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Upscaler Arcano</h1>
          <p className="text-muted-foreground">Você ainda não tem acesso a esta ferramenta.</p>
          <Button onClick={() => navigate("/planos-upscaler-arcano")}>
            Ver planos
          </Button>
        </div>
      </div>
    );
  }

  // Calculate unlock date (7 days after purchase)
  const unlockDate = purchaseDate ? new Date(purchaseDate) : null;
  if (unlockDate) {
    unlockDate.setDate(unlockDate.getDate() + 7);
  }

  const now = new Date();
  const isV2Unlocked = unlockDate ? now >= unlockDate : false;
  
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
            className="relative overflow-hidden bg-gradient-to-br from-purple-900/50 to-purple-800/30 border-purple-500/30 hover:border-purple-400/50 transition-all cursor-pointer group"
            onClick={() => navigate("/ferramenta-ia-artes/upscaller-arcano-v1")}
          >
            {/* Image */}
            <div className="aspect-[3/4] overflow-hidden">
              <img 
                src={upscalerV1Image} 
                alt="Upscaler Arcano v1" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Badge */}
            <div className="absolute top-4 right-4">
              <div className="flex items-center gap-1.5 bg-green-500/20 backdrop-blur-sm text-green-400 px-3 py-1 rounded-full text-xs font-medium">
                <Unlock className="h-3 w-3" />
                Disponível
              </div>
            </div>

            {/* Version Badge */}
            <div className="absolute top-4 left-4">
              <div className="bg-white text-purple-900 px-4 py-1.5 rounded-full text-sm font-black shadow-lg">
                v1.0
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h2 className="text-lg md:text-xl font-bold text-foreground mb-3">
                Upscaler Arcano
              </h2>
              
              <Button 
                className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white group-hover:scale-[1.02] transition-transform"
              >
                Acessar Aulas
              </Button>
            </div>
          </Card>

          {/* V2.0 Card */}
          <Card 
            className={`relative overflow-hidden transition-all ${
              isArcanoUnlimitedOnly
                ? 'bg-gradient-to-br from-orange-900/50 to-red-800/30 border-orange-500/30 hover:border-orange-400/50 cursor-pointer group'
                : isV2Unlocked 
                  ? 'bg-gradient-to-br from-yellow-900/50 to-orange-800/30 border-yellow-500/30 hover:border-yellow-400/50 cursor-pointer group'
                  : 'bg-gradient-to-br from-gray-900/50 to-gray-800/30 border-gray-600/30 cursor-not-allowed'
            }`}
            onClick={() => {
              if (isArcanoUnlimitedOnly) return; // Prevent card click, use button instead
              if (isV2Unlocked) navigate("/ferramenta-ia-artes/upscaller-arcano-v2");
            }}
          >
            {/* Image with overlay if locked */}
            <div className="aspect-[3/4] overflow-hidden relative">
              <img 
                src={upscalerV2Image} 
                alt="Upscaler Arcano v2.0" 
                className={`w-full h-full object-cover transition-transform duration-300 ${
                  isV2Unlocked || isArcanoUnlimitedOnly ? 'group-hover:scale-105' : 'grayscale'
                }`}
              />
              {!isV2Unlocked && !isArcanoUnlimitedOnly && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Lock className="h-16 w-16 text-gray-400" />
                </div>
              )}
              
              {/* Tags at bottom of image - NOVO, MAIS RÁPIDO, MAIOR FIDELIDADE */}
              <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-wrap gap-1.5 bg-gradient-to-t from-black/70 to-transparent">
                <div className="flex items-center gap-1 bg-yellow-500/30 backdrop-blur-sm text-yellow-300 px-2 py-0.5 rounded-full text-[10px] font-medium">
                  <Sparkles className="h-2.5 w-2.5" /> NOVO
                </div>
                <div className="flex items-center gap-1 bg-blue-500/30 backdrop-blur-sm text-blue-300 px-2 py-0.5 rounded-full text-[10px] font-medium">
                  <Zap className="h-2.5 w-2.5" /> MAIS RÁPIDO
                </div>
                <div className="flex items-center gap-1 bg-purple-500/30 backdrop-blur-sm text-purple-300 px-2 py-0.5 rounded-full text-[10px] font-medium">
                  <Target className="h-2.5 w-2.5" /> MAIOR FIDELIDADE
                </div>
              </div>
            </div>

            {/* Status Badge - top right */}
            <div className="absolute top-4 right-4">
              {isArcanoUnlimitedOnly ? (
                <div className="flex items-center gap-1.5 bg-orange-500/20 backdrop-blur-sm text-orange-400 px-3 py-1 rounded-full text-xs font-medium">
                  <Sparkles className="h-3 w-3" />
                  UPGRADE
                </div>
              ) : isV2Unlocked ? (
                <div className="flex items-center gap-1.5 bg-green-500/20 backdrop-blur-sm text-green-400 px-3 py-1 rounded-full text-xs font-medium">
                  <Unlock className="h-3 w-3" />
                  Disponível
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-red-500/20 backdrop-blur-sm text-red-400 px-3 py-1 rounded-full text-xs font-medium">
                  <Lock className="h-3 w-3" />
                  BLOQUEADO
                </div>
              )}
            </div>

            {/* Version Badge - top left */}
            <div className="absolute top-4 left-4">
              <div className={`px-4 py-1.5 rounded-full text-sm font-black shadow-lg ${
                isV2Unlocked || isArcanoUnlimitedOnly
                  ? 'bg-white text-orange-600'
                  : 'bg-white/80 text-gray-700'
              }`}>
                v2.0
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h2 className="text-lg md:text-xl font-bold text-foreground mb-3">
                Upscaler Arcano
              </h2>
              
              {/* Unlock Info - only for pack owners waiting 7 days */}
              {!isV2Unlocked && !isArcanoUnlimitedOnly && unlockDate && (
                <div className="bg-gray-800/50 rounded-lg p-3 mb-3 border border-gray-700/50">
                  <p className="text-sm text-gray-300">
                    <span className="font-medium text-yellow-400">Liberado a partir de:</span>{' '}
                    {formatDate(unlockDate)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Faltam <span className="font-bold text-yellow-400">{daysRemaining}</span> {daysRemaining === 1 ? 'dia' : 'dias'}
                  </p>
                </div>
              )}
              
              {/* Button logic based on access type */}
              {isArcanoUnlimitedOnly ? (
                <Button 
                  className="w-full bg-gradient-to-r from-orange-600 to-red-500 hover:from-orange-500 hover:to-red-400 text-white group-hover:scale-[1.02] transition-transform"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/planos-upscaler-arcano");
                  }}
                >
                  Adquirir Versão Atualizada
                </Button>
              ) : isV2Unlocked ? (
                <Button 
                  className="w-full bg-gradient-to-r from-yellow-600 to-orange-500 hover:from-yellow-500 hover:to-orange-400 text-white group-hover:scale-[1.02] transition-transform"
                >
                  Acessar Aulas
                </Button>
              ) : (
                <Button 
                  disabled
                  className="w-full bg-gray-700 text-gray-400 cursor-not-allowed"
                >
                  Bloqueado
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UpscalerArcanoVersionSelect;
