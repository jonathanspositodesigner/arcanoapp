import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gift, ExternalLink, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SESSION_SHOWN_KEY = "runninghub_bonus_modal_shown_session";
const SHOW_DELAY_MS = 3000;
const COUNTDOWN_SECONDS = 15;
const RUNNINGHUB_REFERRAL_URL = "https://www.runninghub.ai/?inviteCode=p93i9z36";
const BONUS_CREDITS = 250;

interface RunningHubBonusModalProps {
  userId: string;
  onCreditsAdded?: () => void;
}

type ModalState = "offer" | "countdown" | "confirm" | "processing";

const RunningHubBonusModal = ({ userId, onCreditsAdded }: RunningHubBonusModalProps) => {
  const [showModal, setShowModal] = useState(false);
  const [modalState, setModalState] = useState<ModalState>("offer");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [hasClaimed, setHasClaimed] = useState<boolean | null>(null);

  // Check if user already claimed the bonus
  const checkBonusClaimed = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("runninghub_bonus_claimed")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error checking bonus status:", error);
      return;
    }

    setHasClaimed(data?.runninghub_bonus_claimed ?? false);
  }, [userId]);

  useEffect(() => {
    checkBonusClaimed();
  }, [checkBonusClaimed]);

  // Show modal after delay if eligible
  useEffect(() => {
    if (hasClaimed === null || hasClaimed === true) return;

    // Check session storage
    const shownInSession = sessionStorage.getItem(SESSION_SHOWN_KEY);
    if (shownInSession) return;

    const timer = setTimeout(() => {
      setShowModal(true);
      sessionStorage.setItem(SESSION_SHOWN_KEY, "true");
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [hasClaimed]);

  // Countdown timer
  useEffect(() => {
    if (modalState !== "countdown") return;
    if (countdown <= 0) {
      setModalState("confirm");
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [modalState, countdown]);

  const handleOpenRunningHub = () => {
    window.open(RUNNINGHUB_REFERRAL_URL, "_blank");
    setModalState("countdown");
    setCountdown(COUNTDOWN_SECONDS);
  };

  const handleClaimBonus = async () => {
    setModalState("processing");

    try {
      // Add credits
      // Usar add_lifetime_credits para créditos vitalícios
      const { error: rpcError } = await supabase.rpc("add_lifetime_credits", {
        _user_id: userId,
        _amount: BONUS_CREDITS,
        _description: "Bônus RunningHub - Créditos vitalícios",
      });

      if (rpcError) {
        console.error("Error adding credits:", rpcError);
        toast.error("Erro ao adicionar créditos. Tente novamente.");
        setModalState("confirm");
        return;
      }

      // Mark bonus as claimed
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ runninghub_bonus_claimed: true })
        .eq("id", userId);

      if (updateError) {
        console.error("Error updating profile:", updateError);
        // Credits were added, so we should still close the modal
      }

      toast.success(`🎉 Parabéns! ${BONUS_CREDITS} créditos foram adicionados à sua conta!`);
      onCreditsAdded?.();
      setShowModal(false);
      setHasClaimed(true);
    } catch (error) {
      console.error("Error claiming bonus:", error);
      toast.error("Erro ao processar bônus. Tente novamente.");
      setModalState("confirm");
    }
  };

  const handleDismiss = () => {
    setShowModal(false);
  };

  if (!showModal || hasClaimed) return null;

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="sm:max-w-md bg-[#1A0A2E] border-purple-500/30">
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          {/* Animated Gift Icon */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-600/10 flex items-center justify-center animate-pulse">
              <Gift className="w-10 h-10 text-purple-400 animate-bounce" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white">
              +250
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white">
            Ganhe 250 créditos de IA na nossa plataforma!
          </h2>

          {/* Subtitle */}
          <p className="text-purple-300 text-sm">
            Precisamos dessa ferramenta para processar suas imagens no Upscaler Arcano.
          </p>

          {modalState === "offer" && (
            <>
              {/* Benefits */}
              <div className="w-full space-y-2 text-left px-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-sm text-purple-200">Conta gratuita no RunningHub</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-sm text-purple-200">250 créditos para usar no Upscaler</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-sm text-purple-200">Processamento de imagens em alta qualidade</span>
                </div>
              </div>

              {/* CTA Button */}
              <Button
                onClick={handleOpenRunningHub}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-6 text-lg shadow-lg shadow-purple-500/30"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                Criar conta no RunningHub
              </Button>
            </>
          )}

          {modalState === "countdown" && (
            <>
              {/* Countdown Circle */}
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="44"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-purple-900/40"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="44"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-purple-500"
                    strokeDasharray={276.46}
                    strokeDashoffset={276.46 * (1 - countdown / COUNTDOWN_SECONDS)}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
                <span className="absolute text-3xl font-bold text-purple-400">{countdown}</span>
              </div>

              <p className="text-sm text-purple-300">
                Crie sua conta no RunningHub...
              </p>

              {/* Disabled Button */}
              <Button
                disabled
                className="w-full bg-purple-900/50 text-purple-400 font-semibold py-6 text-lg cursor-not-allowed border border-purple-500/20"
              >
                Aguarde {countdown}s...
              </Button>
            </>
          )}

          {modalState === "confirm" && (
            <>
              <p className="text-sm text-purple-300">
                Criou sua conta no RunningHub?
              </p>

              {/* Confirm Button */}
              <Button
                onClick={handleClaimBonus}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-6 text-lg shadow-lg shadow-purple-500/30"
              >
                <Check className="w-5 h-5 mr-2" />
                Já criei minha conta
              </Button>
            </>
          )}

          {modalState === "processing" && (
            <>
              <div className="flex items-center gap-2 text-purple-400">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-lg">Adicionando créditos...</span>
              </div>
            </>
          )}

          {/* Dismiss Link - hidden during processing */}
          {modalState !== "processing" && (
            <button
              onClick={handleDismiss}
              className="text-sm text-purple-400 hover:text-purple-200 transition-colors underline-offset-4 hover:underline"
            >
              Agora não
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RunningHubBonusModal;
