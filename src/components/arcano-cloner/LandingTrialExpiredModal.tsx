import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface LandingTrialExpiredModalProps {
  userId: string | undefined;
  balance: number;
}

export const LandingTrialExpiredModal = ({ userId, balance }: LandingTrialExpiredModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const prevBalanceRef = useRef<number | null>(null);
  const checkingRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId || balance > 0) {
      prevBalanceRef.current = balance;
      return;
    }

    // balance === 0: check on initial mount (prevBalance null) or transition from >0
    const shouldCheck = prevBalanceRef.current === null || prevBalanceRef.current > 0;
    prevBalanceRef.current = balance;

    if (!shouldCheck || checkingRef.current) return;

    const checkTrialStatus = async () => {
      checkingRef.current = true;
      try {
        const { data, error } = await supabase.rpc("check_landing_trial_status", {
          _user_id: userId,
        });

        if (!error && data && data.length > 0) {
          const result = data[0];
          if (result.is_landing_trial && result.credits_expired) {
            setIsOpen(true);
          }
        }
      } catch (err) {
        console.error("Error checking landing trial status:", err);
      } finally {
        checkingRef.current = false;
      }
    };

    checkTrialStatus();
  }, [userId, balance]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="bg-background border-border text-white max-w-md">
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-muted-foreground" />
          </div>
          <DialogTitle className="text-xl font-bold text-white mb-3">
            Seu teste grátis foi concluído!
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm leading-relaxed mb-6">
            Gostou dos resultados? Adquira créditos para continuar usando todas as ferramentas de IA do Arcano App com qualidade profissional.
          </DialogDescription>
          <Button
            onClick={() => {
              setIsOpen(false);
              navigate("/planos-upscaler-creditos");
            }}
            className="w-full bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-500 hover:to-slate-400 text-foreground font-bold py-5 rounded-xl"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Comprar Créditos
          </Button>
          <button
            onClick={() => setIsOpen(false)}
            className="mt-3 text-white/40 text-xs hover:text-muted-foreground transition-colors"
          >
            Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LandingTrialExpiredModal;
