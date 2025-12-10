import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Users, Crown, Package, Sparkles } from "lucide-react";

interface RecipientSelectorProps {
  value: string;
  onChange: (value: string) => void;
  packValue?: string;
  onPackChange?: (value: string) => void;
}

interface Counts {
  all: number;
  premiumPrompts: number;
  premiumArtes: number;
  packPurchasers: number;
}

interface Pack {
  slug: string;
  name: string;
}

const RecipientSelector = ({ 
  value, 
  onChange, 
  packValue, 
  onPackChange 
}: RecipientSelectorProps) => {
  const [counts, setCounts] = useState<Counts>({
    all: 0,
    premiumPrompts: 0,
    premiumArtes: 0,
    packPurchasers: 0,
  });
  const [packs, setPacks] = useState<Pack[]>([]);

  useEffect(() => {
    fetchCounts();
    fetchPacks();
  }, []);

  const fetchCounts = async () => {
    // All users with email
    const { count: allCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .not("email", "is", null);

    // Premium prompts
    const { count: premiumPromptsCount } = await supabase
      .from("premium_users")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    // Premium artes
    const { count: premiumArtesCount } = await supabase
      .from("premium_artes_users")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    // Pack purchasers (unique users)
    const { data: packData } = await supabase
      .from("user_pack_purchases")
      .select("user_id")
      .eq("is_active", true);
    
    const uniquePackUsers = new Set(packData?.map(p => p.user_id) || []);

    setCounts({
      all: allCount || 0,
      premiumPrompts: premiumPromptsCount || 0,
      premiumArtes: premiumArtesCount || 0,
      packPurchasers: uniquePackUsers.size,
    });
  };

  const fetchPacks = async () => {
    const { data } = await supabase
      .from("artes_packs")
      .select("slug, name")
      .eq("is_visible", true)
      .order("display_order");
    
    setPacks(data || []);
  };

  return (
    <div className="space-y-3">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione os destinatários" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Todos os usuários</span>
              <span className="text-muted-foreground">({counts.all})</span>
            </div>
          </SelectItem>
          <SelectItem value="premium_prompts">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              <span>Premium Prompts</span>
              <span className="text-muted-foreground">({counts.premiumPrompts})</span>
            </div>
          </SelectItem>
          <SelectItem value="premium_artes">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span>Premium Artes</span>
              <span className="text-muted-foreground">({counts.premiumArtes})</span>
            </div>
          </SelectItem>
          <SelectItem value="pack_purchasers">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              <span>Compradores de Packs</span>
              <span className="text-muted-foreground">({counts.packPurchasers})</span>
            </div>
          </SelectItem>
          <SelectItem value="specific_pack">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-green-500" />
              <span>Pack específico</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {value === "specific_pack" && onPackChange && (
        <Select value={packValue} onValueChange={onPackChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o pack" />
          </SelectTrigger>
          <SelectContent>
            {packs.map((pack) => (
              <SelectItem key={pack.slug} value={pack.slug}>
                {pack.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};

export default RecipientSelector;
