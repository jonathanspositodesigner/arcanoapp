import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Loader2, CheckCircle, XCircle, ArrowRight, Sparkles, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

type ClaimStatus = 'idle' | 'checking' | 'success' | 'error';
type ErrorReason = 'not_found' | 'no_pack' | 'already_claimed' | 'error';

interface ClaimResponse {
  eligible: boolean;
  reason?: ErrorReason;
  credits_added?: number;
  new_monthly_balance?: number;
  message?: string;
}

const ResgatarCreditos = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<ClaimStatus>('idle');
  const [errorReason, setErrorReason] = useState<ErrorReason | null>(null);
  const [creditsAdded, setCreditsAdded] = useState(0);

  const getErrorMessage = (reason: ErrorReason): string => {
    switch (reason) {
      case 'not_found':
      case 'no_pack':
        return 'Compra não encontrada. Verifique se usou o email correto da compra.';
      case 'already_claimed':
        return 'Você já resgatou essa promoção anteriormente.';
      default:
        return 'Erro ao processar. Tente novamente.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Digite seu email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Digite um email válido');
      return;
    }

    setStatus('checking');
    setErrorReason(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claim-promo-credits`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            email: email.trim(),
            promo_code: 'UPSCALER_1500'
          })
        }
      );

      const result: ClaimResponse = await response.json();

      if (result.eligible) {
        setStatus('success');
        setCreditsAdded(result.credits_added || 1500);
        toast.success(result.message || '1.500 créditos adicionados!');
        
        // Redirect after 3 seconds
        setTimeout(() => {
          navigate('/ferramentas-ia-aplicativo');
        }, 3000);
      } else {
        setStatus('error');
        setErrorReason(result.reason || 'error');
      }
    } catch (error) {
      console.error('Error claiming credits:', error);
      setStatus('error');
      setErrorReason('error');
      toast.error('Erro de conexão. Tente novamente.');
    }
  };

  const handleViewPlans = () => {
    navigate('/planos-creditos');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a15] via-[#1a0f25] to-[#0a0510] flex flex-col items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent0/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent0/10 rounded-full blur-3xl" />
      </div>

      {/* Logo */}
      <div className="relative z-10 mb-8">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-muted-foreground" />
          ArcanoApp
        </h1>
      </div>

      {/* Main Card */}
      <Card className="relative z-10 w-full max-w-md bg-card border-2 border-slate-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)] p-6 sm:p-8">
        {status === 'idle' || status === 'checking' ? (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-500 mb-4 shadow-lg shadow-primary/10">
                <Gift className="w-8 h-8 text-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Resgate seus Créditos
              </h2>
              <p className="text-muted-foreground text-sm">
                1.500 créditos mensais para usar nas Ferramentas de IA
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Digite o email da sua compra"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === 'checking'}
                  className="pl-10 h-12 bg-background border-2 border-slate-600/50 text-foreground placeholder:text-muted-foreground focus:border-border focus:ring-2 focus:ring-slate-500/20"
                />
              </div>

              <Button
                type="submit"
                disabled={status === 'checking'}
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold text-base shadow-lg shadow-primary/10"
              >
                {status === 'checking' ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    Verificar e Resgatar
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Info */}
            <p className="text-center text-muted-foreground text-xs mt-4">
              Disponível apenas para quem comprou o Upscaler Arcano Vitalício
            </p>
          </>
        ) : status === 'success' ? (
          /* Success State */
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-4 shadow-lg shadow-green-500/30">
              <CheckCircle className="w-10 h-10 text-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Parabéns! 🎉
            </h2>
            <p className="text-green-400 text-lg font-semibold mb-2">
              {creditsAdded.toLocaleString('pt-BR')} créditos adicionados!
            </p>
            <p className="text-muted-foreground text-sm mb-6">
              Redirecionando para as Ferramentas de IA...
            </p>
            <div className="flex justify-center">
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            </div>
          </div>
        ) : (
          /* Error State */
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 mb-4">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {errorReason === 'already_claimed' ? 'Promoção já resgatada' : 'Não foi possível resgatar'}
            </h2>
            <p className="text-red-400 text-sm mb-6">
              {getErrorMessage(errorReason || 'error')}
            </p>
            
            <div className="space-y-3">
              {errorReason === 'already_claimed' ? (
                <Button
                  onClick={() => navigate('/ferramentas-ia-aplicativo')}
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold"
                >
                  Ir para a ferramenta
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleViewPlans}
                    className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold"
                  >
                    Ver Planos de Créditos
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStatus('idle');
                      setErrorReason(null);
                      setEmail('');
                    }}
                    className="w-full h-10 border-slate-500/50 bg-accent text-foreground hover:bg-slate-800/70"
                  >
                    Tentar outro email
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Footer */}
      <p className="relative z-10 text-muted-foreground text-xs mt-8">
        © {new Date().getFullYear()} ArcanoApp
      </p>
    </div>
  );
};

export default ResgatarCreditos;