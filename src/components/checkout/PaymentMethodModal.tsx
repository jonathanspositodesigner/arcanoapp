import { Loader2, CreditCard, QrCode, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface PaymentMethodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (method: 'PIX' | 'CREDIT_CARD') => void;
  isProcessing: boolean;
  colorScheme?: 'purple' | 'orange';
}

const PaymentMethodModal = ({
  open,
  onOpenChange,
  onSelect,
  isProcessing,
  colorScheme = 'purple',
}: PaymentMethodModalProps) => {
  const isOrange = colorScheme === 'orange';
  const modalBg = isOrange ? 'bg-[#1a0a0a]' : 'bg-[#1A0A2E]';
  const borderAccent = isOrange ? 'border-[#EF672C]/30' : 'border-purple-500/30';
  const descColor = isOrange ? 'text-orange-300/70' : 'text-purple-300';
  const btnBorder = isOrange ? 'border-[#EF672C]/30' : 'border-purple-500/30';
  const btnBg = isOrange ? 'bg-[#EF672C]/10' : 'bg-purple-900/20';
  const btnHoverCard = isOrange
    ? 'hover:border-[#EF672C]/60 hover:bg-[#EF672C]/20'
    : 'hover:border-purple-400/60 hover:bg-purple-800/30';
  const cardGradient = isOrange
    ? 'from-[#EF672C] to-[#f65928]'
    : 'from-purple-500 to-fuchsia-600';
  const subTextColor = isOrange ? 'text-orange-300/50' : 'text-purple-400';
  const spinnerColor = isOrange ? 'text-[#EF672C]' : 'text-purple-400';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-md max-h-[90dvh] overflow-y-auto ${modalBg} ${borderAccent}`}>
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="relative">
              <div className={`w-16 h-16 rounded-full border-4 border-white/10 ${spinnerColor} border-t-current animate-spin`} />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-lg">Gerando checkout...</p>
              <p className="text-white/50 text-sm mt-1">Aguarde, você será redirecionado</p>
            </div>
            <div className="flex items-center gap-2 mt-2 text-white/30 text-xs">
              <Shield className="h-3 w-3" />
              <span>Pagamento 100% seguro</span>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader className="text-center">
              <DialogTitle className="text-xl font-bold text-center text-white">
                Escolha a forma de pagamento
              </DialogTitle>
              <DialogDescription className={`text-center ${descColor}`}>
                Selecione como deseja pagar
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <button
                onClick={() => onSelect('PIX')}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 ${btnBorder} ${btnBg} hover:border-green-400/60 hover:bg-green-900/20 transition-all duration-200 group`}
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <QrCode className="w-7 h-7 text-white" />
                </div>
                <span className="text-white font-semibold text-sm">PIX</span>
                <span className={`${subTextColor} text-[10px]`}>Aprovação instantânea</span>
              </button>
              <button
                onClick={() => onSelect('CREDIT_CARD')}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 ${btnBorder} ${btnBg} ${btnHoverCard} transition-all duration-200 group`}
              >
                <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${cardGradient} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <CreditCard className="w-7 h-7 text-white" />
                </div>
                <span className="text-white font-semibold text-sm">Cartão de Crédito</span>
                <span className={`${subTextColor} text-[10px]`}>Aprovação instantânea</span>
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentMethodModal;
