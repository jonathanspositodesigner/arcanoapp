import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, History, TrendingDown, TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Transaction {
  amount: number;
  transaction_type: string;
  description: string | null;
  created_at: string;
}

interface CreditsCardProps {
  credits: number;
  creditsLoading: boolean;
  userId: string | undefined;
}

export const CreditsCard = ({ credits, creditsLoading, userId }: CreditsCardProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
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
          .limit(10);

        if (error) {
          console.error('Error fetching transactions:', error);
        } else if (data) {
          setTransactions(data);
        }
      } catch (err) {
        console.error('Error fetching transactions:', err);
      } finally {
        setTransactionsLoading(false);
      }
    };

    fetchTransactions();
  }, [userId]);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM HH:mm", { locale: ptBR });
  };

  return (
    <Card className="p-6 bg-[#1A0A2E] border-purple-500/20">
      <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
        <Coins className="h-5 w-5 text-yellow-400" />
        Créditos Upscaler
      </h2>
      
      {/* Current Balance */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-purple-300">Saldo atual</p>
        <Badge className="bg-purple-600 text-white text-lg px-4 py-1">
          {creditsLoading ? '...' : credits.toLocaleString('pt-BR')}
        </Badge>
      </div>

      {/* Transaction History */}
      <div className="border-t border-purple-500/20 pt-4">
        <h3 className="text-sm font-medium text-purple-300 flex items-center gap-2 mb-3">
          <History className="h-4 w-4" />
          Histórico de Transações
        </h3>

        {transactionsLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-purple-400 text-center py-4">
            Nenhuma transação encontrada
          </p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {transactions.map((tx, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-purple-900/20 hover:bg-purple-900/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {tx.amount < 0 ? (
                    <TrendingDown className="h-4 w-4 text-red-400" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-green-400" />
                  )}
                  <div>
                    <p className="text-sm text-white">
                      {tx.description || (tx.transaction_type === 'consumption' ? 'Uso do Upscaler' : 'Recarga de créditos')}
                    </p>
                    <p className="text-xs text-purple-400">
                      {formatDate(tx.created_at)}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${tx.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
