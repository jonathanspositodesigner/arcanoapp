import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface ExpiredSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  planType: string | null;
}

const planInfo: Record<string, { name: string; checkoutUrl: string }> = {
  arcano_basico: {
    name: "Starter",
    checkoutUrl: "https://payfast.greenn.com.br/148926/offer/bBw6Ql"
  },
  arcano_pro: {
    name: "Pro",
    checkoutUrl: "https://payfast.greenn.com.br/148936/offer/kbgwmH"
  },
  arcano_unlimited: {
    name: "IA Unlimited",
    checkoutUrl: "https://payfast.greenn.com.br/148937/offer/CiCenB"
  }
};

const ExpiredSubscriptionModal = ({ isOpen, onClose, planType }: ExpiredSubscriptionModalProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation('prompts');

  const plan = planType ? planInfo[planType] : null;
  const planName = plan?.name || "Premium";
  const checkoutUrl = plan?.checkoutUrl;

  const handleRenew = () => {
    if (checkoutUrl) {
      window.open(checkoutUrl, '_blank');
    } else {
      navigate('/planos-2');
    }
    onClose();
  };

  const handleViewPlans = () => {
    navigate('/planos-2');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center">
            {t('expiredModal.title', { defaultValue: 'Assinatura Expirada' })}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground mt-2">
            {t('expiredModal.description', { 
              planName, 
              defaultValue: `Sua assinatura do plano ${planName} expirou. Renove agora para continuar tendo acesso a todos os prompts premium.` 
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button 
            onClick={handleRenew}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white font-semibold"
          >
            <Star className="h-4 w-4 mr-2" fill="currentColor" />
            {t('expiredModal.renewButton', { 
              planName, 
              defaultValue: `Renovar Plano ${planName}` 
            })}
          </Button>
          
          <Button 
            onClick={handleViewPlans}
            variant="outline"
            className="w-full"
          >
            {t('expiredModal.viewOtherPlans', { defaultValue: 'Ver outros planos' })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExpiredSubscriptionModal;
