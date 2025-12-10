import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Users, Crown, Package, AlertTriangle, Palette } from "lucide-react";

interface RecipientSelectorProps {
  value: string;
  onChange: (value: string) => void;
  packValue?: string;
  onPackChange?: (value: string) => void;
}

interface Counts {
  all: number;
  premiumPrompts: number;
  artesClients: number;
  artesExpired: number;
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
    artesClients: 0,
    artesExpired: 0,
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

    // Premium prompts users
    const { count: premiumPromptsCount } = await supabase
      .from("premium_users")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    // For artes clients, we need to fetch ALL records to count unique users
    // Use pagination to get all data
    let allArtesUserIds: string[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: artesData } = await supabase
        .from("user_pack_purchases")
        .select("user_id, access_type, expires_at")
        .eq("is_active", true)
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (artesData && artesData.length > 0) {
        allArtesUserIds = [...allArtesUserIds, ...artesData.map(p => p.user_id)];
        hasMore = artesData.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }

    const uniqueArtesUsers = new Set(allArtesUserIds);

    // Fetch all purchases again to calculate expired
    let allPurchases: any[] = [];
    page = 0;
    hasMore = true;

    while (hasMore) {
      const { data } = await supabase
        .from("user_pack_purchases")
        .select("user_id, access_type, expires_at")
        .eq("is_active", true)
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (data && data.length > 0) {
        allPurchases = [...allPurchases, ...data];
        hasMore = data.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }

    // Group by user and check if ALL packs are expired
    const userPacks: Record<string, { hasActive: boolean }> = {};
    const now = new Date();
    
    allPurchases.forEach(purchase => {
      if (!userPacks[purchase.user_id]) {
        userPacks[purchase.user_id] = { hasActive: false };
      }
      // Check if this pack is still active
      if (purchase.access_type === 'vitalicio' || 
          !purchase.expires_at || 
          new Date(purchase.expires_at) > now) {
        userPacks[purchase.user_id].hasActive = true;
      }
    });

    const expiredCount = Object.values(userPacks).filter(u => !u.hasActive).length;

    setCounts({
      all: allCount || 0,
      premiumPrompts: premiumPromptsCount || 0,
      artesClients: uniqueArtesUsers.size,
      artesExpired: expiredCount,
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
          <SelectItem value="artes_clients">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-amber-500" />
              <span>Clientes Artes (qualquer pack)</span>
              <span className="text-muted-foreground">({counts.artesClients})</span>
            </div>
          </SelectItem>
          <SelectItem value="artes_expired">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span>Clientes com packs vencidos</span>
              <span className="text-muted-foreground">({counts.artesExpired})</span>
            </div>
          </SelectItem>
          <SelectItem value="premium_prompts">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              <span>Premium Prompts</span>
              <span className="text-muted-foreground">({counts.premiumPrompts})</span>
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
