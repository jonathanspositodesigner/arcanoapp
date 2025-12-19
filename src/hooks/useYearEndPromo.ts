import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface YearEndPromo {
  active: boolean;
  name: string;
  discount_percent: number;
  end_date: string;
}

export const useYearEndPromo = () => {
  const [promo, setPromo] = useState<YearEndPromo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPromo = async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('id', 'year_end_promo')
        .single();

      if (!error && data?.value) {
        setPromo(data.value as unknown as YearEndPromo);
      }
      setLoading(false);
    };

    fetchPromo();
  }, []);

  const togglePromo = async () => {
    if (!promo) return;

    const newValue = { ...promo, active: !promo.active };
    
    const { error } = await supabase
      .from('app_settings')
      .update({ 
        value: newValue,
        updated_at: new Date().toISOString()
      })
      .eq('id', 'year_end_promo');

    if (!error) {
      setPromo(newValue);
      return true;
    }
    return false;
  };

  const updatePromo = async (updates: Partial<YearEndPromo>) => {
    if (!promo) return false;

    const newValue = { ...promo, ...updates };
    
    const { error } = await supabase
      .from('app_settings')
      .update({ 
        value: newValue,
        updated_at: new Date().toISOString()
      })
      .eq('id', 'year_end_promo');

    if (!error) {
      setPromo(newValue);
      return true;
    }
    return false;
  };

  return {
    isActive: promo?.active ?? false,
    promoName: promo?.name ?? '',
    discountPercent: promo?.discount_percent ?? 50,
    endDate: promo?.end_date ?? '',
    loading,
    togglePromo,
    updatePromo
  };
};
