import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSmartBackNavigation } from "@/hooks/useSmartBackNavigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, History, Zap, TrendingUp, Loader2, Coins, PlusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useCredits } from "@/contexts/CreditsContext";
import { Badge } from "@/components/ui/badge";
import { AnimatedCreditsDisplay } from "@/components/upscaler/AnimatedCreditsDisplay";
import AppLayout from "@/components/layout/AppLayout";

interface Transaction {
  amount: number;
  transaction_type: string;
  description: string | null;
  created_at: string;
}

const CreditHistory = () => {
  const navigate = useNavigate();
  const { goBack } = useSmartBackNavigation({ fallback: '/profile-settings' });
  const { user, isLoading: userLoading } = usePremiumStatus();
  const { balance: credits, isLoading: creditsLoading, isUnlimited } = useCredits();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userLoading && !user) {
      navigate('/login');
    }
  }, [user, userLoading, navigate]);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('upscaler_credit_transactions')
          .select('amount, transaction_type, description, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching transactions:', error);
        } else if (data) {
          setTransactions(data);
        }
      } catch (err) {
        console.error('Error fetching transactions:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchTransactions();
    }
  }, [user?.id]);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={goBack}
          className="mb-4 text-muted-foreground hover:text-white hover:bg-accent0/20"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <History className="h-6 w-6 text-muted-foreground" />
          Histórico de Créditos
        </h1>

        {/* Current Balance */}
        <Card className="p-4 bg-background border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-400" />
              <span className="text-muted-foreground">Saldo atual</span>
            </div>
            <div className="flex items-center gap-2">
              <AnimatedCreditsDisplay 
                credits={credits} 
                isLoading={creditsLoading}
                size="lg"
                showCoin={false}
                variant="badge"
                isUnlimited={isUnlimited}
              />
              <button
                onClick={() => navigate('/planos-creditos')}
                className="h-8 w-8 flex items-center justify-center rounded hover:bg-accent0/10"
                title="Comprar créditos"
              >
                <PlusCircle className="w-5 h-5 text-muted-foreground" style={{ filter: 'drop-shadow(0 0 4px rgba(148, 163, 184, 0.5))' }} />
              </button>
            </div>
          </div>
        </Card>

        {/* Transaction List */}
        <Card className="p-6 bg-background border-border">
          <h2 className="text-lg font-semibold text-white mb-4">Todas as Transações</h2>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma transação encontrada
            </p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between py-3 px-4 rounded-lg bg-accent hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {tx.amount < 0 ? (
                      <Zap className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <TrendingUp className="h-5 w-5 text-green-400" />
                    )}
                    <div>
                      <p className="text-sm text-white">
                        {(tx.description?.includes('Pagar.me') || tx.description?.includes('Pagarme'))
                          ? tx.description.replace(/Compra\s+Pagar\.?me/i, 'Compra de créditos avulsos').replace(/Pagarme/i, 'créditos avulsos')
                          : tx.description || (tx.transaction_type === 'consumption' ? 'Uso do Upscaler' : 'Recarga de créditos')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(tx.created_at)}
                      </p>
                    </div>
                  </div>
                  <span className={`text-base font-medium ${tx.amount < 0 ? 'text-muted-foreground' : 'text-green-400'}`}>
                    {tx.amount > 0 ? '+' : ''}{Math.abs(tx.amount).toLocaleString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      </div>
    </AppLayout>
  );
};

export default CreditHistory;
