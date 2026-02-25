import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gift, Copy, Check, Users, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const REFERRAL_BASE_URL = "https://arcanoapp.voxvisual.com.br";

interface ReferralModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

const ReferralModal = ({ open, onClose, userId }: ReferralModalProps) => {
  const [code, setCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [referralCount, setReferralCount] = useState(0);

  useEffect(() => {
    if (open && userId) {
      loadReferralCode();
      loadReferralCount();
    }
  }, [open, userId]);

  const loadReferralCode = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_or_create_referral_code', {
        p_user_id: userId,
      });
      if (error) throw error;
      setCode(data as string);
    } catch (e) {
      console.error('[Referral] Error loading code:', e);
      toast.error('Erro ao carregar código de indicação');
    } finally {
      setIsLoading(false);
    }
  };

  const loadReferralCount = async () => {
    try {
      const { count } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', userId);
      setReferralCount(count || 0);
    } catch (e) {
      console.error('[Referral] Error loading count:', e);
    }
  };

  const referralLink = code ? `${REFERRAL_BASE_URL}/?ref=${code}` : '';

  const handleCopy = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <div className="p-6 pt-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                <Gift className="h-7 w-7 text-primary" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-1">
              Indique e Ganhe
            </h2>
            <p className="text-sm text-muted-foreground">
              Convide amigos e ganhe créditos vitalícios!
            </p>
          </div>

          {/* How it works */}
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Users className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Seu amigo se cadastra</p>
                <p className="text-xs text-muted-foreground">Ele ganha <span className="font-bold text-green-500">150 créditos vitalícios</span></p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Coins className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Você ganha também!</p>
                <p className="text-xs text-muted-foreground">Receba <span className="font-bold text-green-500">150 créditos vitalícios</span> por cada indicação</p>
              </div>
            </div>
          </div>

          {/* Referral link */}
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-10 bg-muted rounded-lg" />
              <div className="h-10 bg-muted rounded-lg" />
            </div>
          ) : code ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border border-border">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="flex-1 bg-transparent text-sm text-foreground outline-none truncate"
                />
              </div>
              <Button
                onClick={handleCopy}
                className="w-full"
                variant={copied ? "outline" : "default"}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Link
                  </>
                )}
              </Button>
            </div>
          ) : null}

          {/* Stats */}
          {referralCount > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Você já indicou <span className="font-bold text-foreground">{referralCount}</span> {referralCount === 1 ? 'pessoa' : 'pessoas'} 🎉
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReferralModal;
