import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Coins, ArrowRight, TrendingUp, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { useCredits } from "@/contexts/CreditsContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  created_at: string;
}

interface CreditsPreviewPopoverProps {
  userId: string;
  variant?: "desktop" | "mobile";
}

const CreditsPreviewPopover = ({ 
  userId,
  variant = "desktop" 
}: CreditsPreviewPopoverProps) => {
  const navigate = useNavigate();
  const { balance: credits, isLoading: creditsLoading } = useCredits();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { displayValue, isAnimating, direction } = useAnimatedNumber(credits, 600);

  useEffect(() => {
    if (open && userId) {
      fetchRecentTransactions();
    }
  }, [open, userId]);

  const fetchRecentTransactions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("upscaler_credit_transactions")
      .select("id, amount, transaction_type, description, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3);

    setTransactions(data || []);
    setLoading(false);
  };

  const isDesktop = variant === "desktop";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="focus:outline-none">
          <Badge 
            variant="outline" 
            className={`cursor-pointer hover:bg-purple-800/50 transition-all duration-300 ${
              isDesktop 
                ? "bg-purple-900/50 border-purple-500/30 text-purple-200 flex items-center gap-1.5 px-2.5 py-1"
                : "bg-purple-900/50 border-purple-500/30 text-purple-200 text-xs px-2 py-0.5 flex items-center gap-1"
            } ${
              direction === 'up' ? 'border-green-400/60 bg-green-900/30 scale-110' : 
              direction === 'down' ? 'border-red-400/60 bg-red-900/30 scale-110' : ''
            }`}
          >
            <Coins className={`${isDesktop ? "w-3.5 h-3.5" : "w-3 h-3"} transition-colors duration-300 ${
              direction === 'up' ? 'text-green-400' : direction === 'down' ? 'text-red-400' : 'text-yellow-400'
            }`} />
            <span className={`${isDesktop ? "font-medium" : ""} transition-colors duration-300 ${
              direction === 'up' ? 'text-green-400 font-bold' : direction === 'down' ? 'text-red-400 font-bold' : ''
            }`}>
              {creditsLoading ? '...' : displayValue.toLocaleString('pt-BR')}
            </span>
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-3 bg-[#1A0A2E] border-purple-500/30"
        align="end"
      >
        <div className="space-y-3">
          <p className="text-xs font-medium text-purple-300">Últimas transações</p>
          
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-2">Carregando...</p>
          ) : transactions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">Nenhuma transação</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className="flex items-center justify-between text-xs p-2 rounded bg-purple-900/30"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {tx.amount > 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-400 flex-shrink-0" />
                    ) : (
                      <Zap className="h-3 w-3 text-purple-400 flex-shrink-0" />
                    )}
                    <span className="text-purple-200 truncate">
                      {tx.description || tx.transaction_type}
                    </span>
                  </div>
                  <span className={`font-medium flex-shrink-0 ml-2 ${
                    tx.amount > 0 ? "text-green-400" : "text-purple-400"
                  }`}>
                    {tx.amount > 0 ? "+" : ""}{Math.abs(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-purple-300 hover:text-white hover:bg-purple-500/20 h-7"
            onClick={() => {
              setOpen(false);
              navigate('/credit-history');
            }}
          >
            Ver todo o histórico
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CreditsPreviewPopover;
