import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ExpiringSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  expiringStatus: 'today' | 'tomorrow' | null;
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

const ExpiringSubscriptionModal = ({ isOpen, onClose, expiringStatus, planType }: ExpiringSubscriptionModalProps) => {
  const { t } = useTranslation('prompts');

  if (!expiringStatus) return null;

  const plan = planType ? planInfo[planType] : null;
  const planName = plan?.name || "Premium";
  const checkoutUrl = plan?.checkoutUrl || "/planos-2";

  const handleRenew = () => {
    window.open(checkoutUrl, "_blank");
    onClose();
  };

  const isToday = expiringStatus === 'today';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
            {isToday ? (
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            ) : (
              <Clock className="h-6 w-6 text-orange-600" />
            )}
          </div>
          <DialogTitle className="text-center text-xl">
            {isToday 
              ? t('expiring.titleToday', 'Sua assinatura vence hoje') 
              : t('expiring.titleTomorrow', 'Sua assinatura vence amanhã')
            }
          </DialogTitle>
          <DialogDescription className="text-center">
            {isToday 
              ? t('expiring.descriptionToday', `Sua assinatura do plano ${planName} vence hoje. Renove agora para continuar tendo acesso aos prompts premium.`)
                .replace('${planName}', planName)
              : t('expiring.descriptionTomorrow', `Sua assinatura do plano ${planName} vence amanhã. Não perca acesso aos prompts premium!`)
                .replace('${planName}', planName)
            }
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {isToday ? (
            <>
              <Button
                onClick={handleRenew}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white"
              >
                {t('expiring.renewNow', 'Renovar Agora')}
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="w-full"
              >
                OK
              </Button>
            </>
          ) : (
            <Button
              onClick={onClose}
              className="w-full"
            >
              OK
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExpiringSubscriptionModal;
