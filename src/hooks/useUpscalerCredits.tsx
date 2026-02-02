import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CreditsBreakdown {
  total: number;
  monthly: number;
  lifetime: number;
}

export const useUpscalerCredits = (userId: string | undefined) => {
  const [balance, setBalance] = useState<number>(0);
  const [breakdown, setBreakdown] = useState<CreditsBreakdown>({ total: 0, monthly: 0, lifetime: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!userId) {
      setBalance(0);
      setBreakdown({ total: 0, monthly: 0, lifetime: 0 });
      setIsLoading(false);
      return;
    }

    try {
      // Fetch breakdown
      const { data: breakdownData, error: breakdownError } = await supabase.rpc('get_upscaler_credits_breakdown', {
        _user_id: userId
      });

      if (!breakdownError && breakdownData && breakdownData.length > 0) {
        const result = breakdownData[0];
        setBalance(result.total);
        setBreakdown({
          total: result.total,
          monthly: result.monthly,
          lifetime: result.lifetime
        });
      } else {
        // Fallback to simple balance
        const { data, error } = await supabase.rpc('get_upscaler_credits', {
          _user_id: userId
        });

        if (!error && data !== null) {
          setBalance(data);
          setBreakdown({ total: data, monthly: data, lifetime: 0 });
        }
      }
    } catch (err) {
      console.error('Error fetching upscaler credits:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Realtime subscription for credit changes
  useEffect(() => {
    if (!userId) return;

    // Cleanup previous channel if exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`credits-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'upscaler_credit_transactions',
          filter: `user_id=eq.${userId}`
        },
        () => {
          // Refetch balance when a new transaction is inserted
          fetchBalance();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, fetchBalance]);

  const consumeCredits = async (amount: number, description?: string) => {
    if (!userId) return { success: false, error: 'Não autenticado' };
    
    try {
      const { data, error } = await supabase.rpc('consume_upscaler_credits', {
        _user_id: userId,
        _amount: amount,
        _description: description || 'Upscaler usage'
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'Erro ao processar créditos' };
      }

      const result = data[0];
      
      if (!result.success) {
        return { 
          success: false, 
          error: result.error_message || 'Saldo insuficiente',
          currentBalance: result.new_balance
        };
      }

      setBalance(result.new_balance);
      // Refetch to get updated breakdown
      fetchBalance();
      return { success: true, newBalance: result.new_balance };
    } catch (err) {
      console.error('Error consuming credits:', err);
      return { success: false, error: 'Erro ao consumir créditos' };
    }
  };

  return { 
    balance, 
    breakdown,
    isLoading, 
    refetch: fetchBalance, 
    consumeCredits 
  };
};
