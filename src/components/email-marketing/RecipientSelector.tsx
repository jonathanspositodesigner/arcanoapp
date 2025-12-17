import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Users, Crown, Package, AlertTriangle, Palette, Mail, KeyRound } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RecipientSelectorProps {
  value: string;
  onChange: (value: string) => void;
  packValue?: string;
  onPackChange?: (value: string) => void;
  customEmail?: string;
  onCustomEmailChange?: (value: string) => void;
  platform?: string | null; // 'prompts' | 'artes-eventos' | 'artes-musicos' | null (general)
}

interface Counts {
  all: number;
  premiumPrompts: number;
  artesEventosClients: number;
  artesMusicosClients: number;
  artesExpired: number;
  pendingFirstAccess: number;
}

interface Pack {
  slug: string;
  name: string;
  platform: string;
}

interface PendingUser {
  id: string;
  email: string;
  name: string | null;
}

const RecipientSelector = ({ 
  value, 
  onChange, 
  packValue, 
  onPackChange,
  customEmail,
  onCustomEmailChange,
  platform
}: RecipientSelectorProps) => {
  const [counts, setCounts] = useState<Counts>({
    all: 0,
    premiumPrompts: 0,
    artesEventosClients: 0,
    artesMusicosClients: 0,
    artesExpired: 0,
    pendingFirstAccess: 0,
  });
  const [packs, setPacks] = useState<Pack[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loadingPendingUsers, setLoadingPendingUsers] = useState(false);

  useEffect(() => {
    fetchCounts();
    fetchPacks();
  }, [platform]);

  useEffect(() => {
    if (value === "pending_first_access") {
      fetchPendingUsers();
    }
  }, [value]);

  const fetchPendingUsers = async () => {
    setLoadingPendingUsers(true);
    const allUsers: PendingUser[] = [];
    const batchSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, name")
        .not("email", "is", null)
        .or("password_changed.is.null,password_changed.eq.false")
        .range(offset, offset + batchSize - 1);

      if (data && data.length > 0) {
        allUsers.push(...data.map(u => ({ id: u.id, email: u.email || '', name: u.name })));
        offset += batchSize;
        hasMore = data.length === batchSize;
      } else {
        hasMore = false;
      }
    }

    setPendingUsers(allUsers);
    setLoadingPendingUsers(false);
  };

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

    // Pending first access (password_changed = false or null)
    const { count: pendingFirstAccessCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .not("email", "is", null)
      .or("password_changed.is.null,password_changed.eq.false");

    // Fetch all artes purchases with platform
    let allArtesEventosUserIds: string[] = [];
    let allArtesMusicosUserIds: string[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: artesData } = await supabase
        .from("user_pack_purchases")
        .select("user_id, platform, access_type, expires_at")
        .eq("is_active", true)
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (artesData && artesData.length > 0) {
        artesData.forEach((p: any) => {
          if (p.platform === 'musicos') {
            allArtesMusicosUserIds.push(p.user_id);
          } else {
            // Default to eventos
            allArtesEventosUserIds.push(p.user_id);
          }
        });
        hasMore = artesData.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }

    const uniqueArtesEventosUsers = new Set(allArtesEventosUserIds);
    const uniqueArtesMusicosUsers = new Set(allArtesMusicosUserIds);

    // Calculate expired count (for eventos by default)
    let allPurchases: any[] = [];
    page = 0;
    hasMore = true;

    while (hasMore) {
      const { data } = await supabase
        .from("user_pack_purchases")
        .select("user_id, access_type, expires_at, platform")
        .eq("is_active", true)
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (data && data.length > 0) {
        allPurchases.push(...data);
        hasMore = data.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }

    // Group by user and check if ALL packs are expired (filter by platform if specified)
    const purchasesToCheck = platform === 'artes-musicos' 
      ? allPurchases.filter((p: any) => p.platform === 'musicos')
      : platform === 'artes-eventos'
      ? allPurchases.filter((p: any) => p.platform !== 'musicos')
      : allPurchases;

    const userPacks: Record<string, { hasActive: boolean }> = {};
    const now = new Date();
    
    purchasesToCheck.forEach((purchase: any) => {
      if (!userPacks[purchase.user_id]) {
        userPacks[purchase.user_id] = { hasActive: false };
      }
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
      artesEventosClients: uniqueArtesEventosUsers.size,
      artesMusicosClients: uniqueArtesMusicosUsers.size,
      artesExpired: expiredCount,
      pendingFirstAccess: pendingFirstAccessCount || 0,
    });
  };

  const fetchPacks = async () => {
    let query = supabase
      .from("artes_packs")
      .select("slug, name, platform")
      .eq("is_visible", true)
      .order("display_order");
    
    const { data } = await query;
    
    // Filter packs by platform if specified
    let filteredPacks = data || [];
    if (platform === 'artes-eventos') {
      filteredPacks = filteredPacks.filter((p: any) => p.platform !== 'musicos');
    } else if (platform === 'artes-musicos') {
      filteredPacks = filteredPacks.filter((p: any) => p.platform === 'musicos');
    }
    
    setPacks(filteredPacks);
  };

  // Determine which options to show based on platform
  const showAllUsers = !platform; // Only in general hub
  const showPremiumPrompts = !platform || platform === 'prompts';
  const showArtesEventosClients = !platform || platform === 'artes-eventos';
  const showArtesMusicosClients = !platform || platform === 'artes-musicos';
  const showArtesExpired = !platform || platform === 'artes-eventos' || platform === 'artes-musicos';
  const showSpecificPack = !platform || platform === 'artes-eventos' || platform === 'artes-musicos';
  const showPendingFirstAccess = !platform; // Only in general hub

  return (
    <div className="space-y-3">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione os destinatários" />
        </SelectTrigger>
        <SelectContent>
          {showAllUsers && (
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Todos os usuários</span>
                <span className="text-muted-foreground">({counts.all})</span>
              </div>
            </SelectItem>
          )}
          {showPendingFirstAccess && (
            <SelectItem value="pending_first_access">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-orange-500" />
                <span>Pendentes 1º acesso (senha não redefinida)</span>
                <span className="text-muted-foreground">({counts.pendingFirstAccess})</span>
              </div>
            </SelectItem>
          )}
          {showArtesEventosClients && (
            <SelectItem value="artes_eventos_clients">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-amber-500" />
                <span>Clientes Artes Eventos</span>
                <span className="text-muted-foreground">({counts.artesEventosClients})</span>
              </div>
            </SelectItem>
          )}
          {showArtesMusicosClients && (
            <SelectItem value="artes_musicos_clients">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-violet-500" />
                <span>Clientes Artes Músicos</span>
                <span className="text-muted-foreground">({counts.artesMusicosClients})</span>
              </div>
            </SelectItem>
          )}
          {showArtesExpired && (
            <SelectItem value="artes_expired">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span>Clientes com packs vencidos</span>
                <span className="text-muted-foreground">({counts.artesExpired})</span>
              </div>
            </SelectItem>
          )}
          {showPremiumPrompts && (
            <SelectItem value="premium_prompts">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-500" />
                <span>Premium Prompts</span>
                <span className="text-muted-foreground">({counts.premiumPrompts})</span>
              </div>
            </SelectItem>
          )}
          {showSpecificPack && (
            <SelectItem value="specific_pack">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-green-500" />
                <span>Pack específico</span>
              </div>
            </SelectItem>
          )}
          <SelectItem value="custom_email">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-500" />
              <span>Email específico</span>
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

      {value === "custom_email" && onCustomEmailChange && (
        <Input
          type="email"
          placeholder="Digite o email do destinatário"
          value={customEmail || ""}
          onChange={(e) => onCustomEmailChange(e.target.value)}
        />
      )}

      {value === "pending_first_access" && (
        <div className="border rounded-lg">
          <div className="p-3 bg-orange-500/10 border-b flex items-center justify-between">
            <span className="text-sm font-medium text-orange-500">
              Lista de pendentes ({pendingUsers.length})
            </span>
            {loadingPendingUsers && (
              <span className="text-xs text-muted-foreground">Carregando...</span>
            )}
          </div>
          <ScrollArea className="h-[200px]">
            <div className="p-2 space-y-1">
              {pendingUsers.length === 0 && !loadingPendingUsers ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum usuário pendente
                </p>
              ) : (
                pendingUsers.map((user, index) => (
                  <div 
                    key={user.id} 
                    className="flex items-center gap-2 p-2 bg-secondary/50 rounded text-sm"
                  >
                    <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.name || 'Sem nome'}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default RecipientSelector;