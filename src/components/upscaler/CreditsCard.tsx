import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Coins, History, Zap, TrendingUp, Loader2, ChevronRight, PlusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AnimatedCreditsDisplay } from "@/components/upscaler/AnimatedCreditsDisplay";

interface Transaction {
  amount: number;
  transaction_type: string;
  description: string | null;
  created_at: string;
}

interface CreditsBreakdown {
  total: number;
  monthly: number;
  lifetime: number;
}

interface CreditsCardProps {
  credits: number;
  creditsLoading: boolean;
  userId: string | undefined;
  breakdown?: CreditsBreakdown;
  isUnlimited?: boolean;
}

export const CreditsCard = ({ credits, creditsLoading, userId, breakdown, isUnlimited = false }: CreditsCardProps) => {
  const navigate = useNavigate();
  const [latestTransaction, setLatestTransaction] = useState<Transaction | null>(null);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  useEffect(() => {
    const fetchLatestTransaction = async () => {
      if (!userId) {
        setTransactionsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('upscaler_credit_transactions')
          .select('amount, transaction_type, description, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching transaction:', error);
        } else if (data) {
          setLatestTransaction(data);
        }
      } catch (err) {
        console.error('Error fetching transaction:', err);
      } finally {
        setTransactionsLoading(false);
      }
    };

    fetchLatestTransaction();
  }, [userId]);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM HH:mm", { locale: ptBR });
  };

  const hasBreakdown = breakdown && (breakdown.monthly > 0 || breakdown.lifetime > 0);

  return (
    <Card className="p-6 bg-background border-border">
      <h2 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
        <Coins className="h-5 w-5 text-yellow-400" />
        Créditos de IA
      </h2>
      
      {/* Current Balance */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-muted-foreground">Saldo total</p>
        <AnimatedCreditsDisplay 
          credits={credits} 
          isLoading={creditsLoading}
          size="lg"
          showCoin={false}
          variant="badge"
          isUnlimited={isUnlimited}
        />
      </div>

      {/* Breakdown (if has both types) */}
      {hasBreakdown && !creditsLoading && (
        <div className="flex flex-wrap gap-2 mb-4 text-xs">
          {breakdown.monthly > 0 && (
            <span className="px-2 py-1 rounded-full bg-accent0/20 text-muted-foreground border border-border">
              📅 {breakdown.monthly.toLocaleString('pt-BR')} mensais
            </span>
          )}
          {breakdown.lifetime > 0 && (
            <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
              ♾️ {breakdown.lifetime.toLocaleString('pt-BR')} vitalícios
            </span>
          )}
        </div>
      )}

      {/* Latest Transaction */}
      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-3">
          <History className="h-4 w-4" />
          Histórico de Transações
        </h3>

        {transactionsLoading ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : latestTransaction ? (
          <div className="space-y-3">
            <div 
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-accent"
            >
              <div className="flex items-center gap-3">
                {latestTransaction.amount < 0 ? (
                  <Zap className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                )}
                <div>
                  <p className="text-sm text-foreground">
                    {latestTransaction.description || (latestTransaction.transaction_type === 'consumption' ? 'Uso do Upscaler' : 'Recarga de créditos')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(latestTransaction.created_at)}
                  </p>
                </div>
              </div>
              <span className={`text-sm font-medium ${latestTransaction.amount < 0 ? 'text-muted-foreground' : 'text-green-400'}`}>
                {latestTransaction.amount > 0 ? '+' : ''}{Math.abs(latestTransaction.amount).toLocaleString('pt-BR')}
              </span>
            </div>

            <Button
              variant="ghost"
              onClick={() => navigate('/credit-history')}
              className="w-full text-muted-foreground hover:text-foreground hover:bg-accent0/20 justify-between"
            >
              Ver todas as transações
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-3">
            Nenhuma transação encontrada
          </p>
        )}
      </div>

      <div className="border-t border-border pt-4 mt-4">
        <Button
          onClick={() => navigate('/planos-creditos')}
          className="w-full bg-gradient-to-r from-purple-500 to-purple-500 hover:opacity-90 text-white font-medium"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Comprar Créditos
        </Button>
      </div>
    </Card>
  );
};