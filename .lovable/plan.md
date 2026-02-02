
# Plano: Consolidar Hooks de Status Premium em Context Provider Centralizado

## Resumo Executivo

Consolidar os 4 hooks de status premium (`usePremiumStatus`, `usePremiumArtesStatus`, `usePackAccess`, `usePremiumMusicosStatus`) em um único **AuthProvider** centralizado, eliminando chamadas duplicadas ao banco que atualmente disparam múltiplas vezes por página.

## Problema Atual

### Diagnóstico
Analisando os logs, identificamos que em uma única página podem ocorrer:
- **4x chamadas** para `get_user_packs`
- **4x chamadas** para `is_premium` 
- **2x chamadas** para `get_user_expired_packs`
- **2x chamadas** para `premium_users` (query direta)

### Causa Raiz
Cada hook (`usePremiumStatus`, `usePremiumArtesStatus`, `usePackAccess`) cria sua própria:
1. Subscription de `onAuthStateChange` 
2. Chamada inicial de `getSession`
3. Queries independentes ao banco

Quando uma página usa múltiplos hooks (ex: `UpscalerArcanoVersionSelect.tsx` usa `usePremiumArtesStatus` + `usePremiumStatus`), cada um dispara suas próprias queries.

## Arquitetura Proposta

```text
                    ┌─────────────────────────────────────────┐
                    │           AuthProvider                   │
                    │  (único listener de auth + queries)     │
                    └───────────────┬─────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
              ┌─────▼─────┐  ┌──────▼──────┐  ┌─────▼─────┐
              │useAuth    │  │useArtesPacks│  │useMusicos │
              │(prompts)  │  │             │  │           │
              └───────────┘  └─────────────┘  └───────────┘
                    │               │               │
                    └───────────────┴───────────────┘
                                    │
                    Reads from Context (NO new queries)
```

## Detalhamento Técnico

### Parte 1: Criar AuthContext Unificado

**Novo arquivo:** `src/contexts/AuthContext.tsx`

O Context Provider irá:

1. **Único listener de auth** - Uma só subscription de `onAuthStateChange`
2. **Uma só chamada inicial** - Único `getSession()` no mount
3. **Queries consolidadas** - Fazer todas as verificações de status em paralelo (uma vez só):
   - `is_premium` (biblioteca de prompts)
   - `get_user_packs` (packs de artes)
   - `get_user_expired_packs` (packs expirados)
   - Query em `premium_users` (status detalhado de prompts)
   - Query em `premium_musicos_users` (status de músicos)

4. **Cache em memória** - Estado centralizado evita re-fetches
5. **Refetch manual** - Função `refetch()` para atualizar quando necessário

**Interface do Context:**
```typescript
interface AuthContextType {
  // Auth state
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  
  // Prompts premium status
  isPremium: boolean;
  planType: string | null;
  hasExpiredSubscription: boolean;
  expiredPlanType: string | null;
  expiringStatus: 'today' | 'tomorrow' | null;
  
  // Artes packs
  userPacks: PackAccess[];
  expiredPacks: PackAccess[];
  hasBonusAccess: boolean;
  hasAccessToPack: (slug: string) => boolean;
  getPackAccessInfo: (slug: string) => PackAccess | undefined;
  hasExpiredPack: (slug: string) => boolean;
  getExpiredPackInfo: (slug: string) => PackAccess | undefined;
  
  // Musicos status  
  isMusicosPremium: boolean;
  musicosPlanType: string | null;
  musicosBillingPeriod: string | null;
  musicosExpiresAt: string | null;
  
  // Actions
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}
```

### Parte 2: Hooks Legado (Thin Wrappers)

Manter os hooks existentes como **wrappers finos** que apenas leem do Context:

**Atualizar:** `src/hooks/usePremiumStatus.tsx`
```typescript
export const usePremiumStatus = () => {
  const { 
    user, session, isPremium, planType, isLoading, 
    hasExpiredSubscription, expiredPlanType, expiringStatus,
    logout 
  } = useAuth();
  
  return { 
    user, session, isPremium, planType, isLoading,
    hasExpiredSubscription, expiredPlanType, expiringStatus,
    logout
  };
};
```

**Atualizar:** `src/hooks/usePremiumArtesStatus.tsx`
```typescript
export const usePremiumArtesStatus = () => {
  const { 
    user, session, userPacks, expiredPacks, hasBonusAccess,
    hasAccessToPack, getPackAccessInfo, hasExpiredPack, 
    getExpiredPackInfo, isLoading, logout, refetch
  } = useAuth();
  
  const isPremium = userPacks.length > 0;
  const hasAccessToBonusAndUpdates = userPacks.length > 0;
  const planType = hasBonusAccess ? 'bonus_access' : (isPremium ? 'pack_only' : null);
  
  return { 
    user, session, isPremium, planType, userPacks, expiredPacks,
    hasBonusAccess, hasAccessToBonusAndUpdates, hasAccessToPack,
    getPackAccessInfo, hasExpiredPack, getExpiredPackInfo,
    isLoading, logout, refetch
  };
};
```

**Atualizar:** `src/hooks/usePackAccess.ts` 
```typescript
export const usePackAccess = () => {
  const { 
    user, userPacks, hasBonusAccess, isLoading,
    hasAccessToPack, getPackAccessInfo, logout, refetch
  } = useAuth();
  
  return {
    user, userPacks, hasBonusAccess, isLoading,
    hasAccessToPack, getPackAccessInfo, logout, refetch
  };
};
```

**Atualizar:** `src/hooks/usePremiumMusicosStatus.tsx`
```typescript
export const usePremiumMusicosStatus = () => {
  const { 
    user, session, isMusicosPremium, musicosPlanType,
    musicosBillingPeriod, musicosExpiresAt, isLoading,
    logout, refetch
  } = useAuth();
  
  return {
    user, session,
    isPremium: isMusicosPremium,
    planType: musicosPlanType,
    billingPeriod: musicosBillingPeriod,
    expiresAt: musicosExpiresAt,
    isLoading, logout, refetch
  };
};
```

### Parte 3: Integrar Provider no App

**Atualizar:** `src/App.tsx`

```tsx
import { AuthProvider } from "./contexts/AuthContext";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LocaleProvider>
      <AuthProvider>      {/* <-- Novo provider */}
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </LocaleProvider>
  </QueryClientProvider>
);
```

## Resumo de Arquivos

### Criar (1 arquivo)
| Arquivo | Descrição |
|---------|-----------|
| `src/contexts/AuthContext.tsx` | Context Provider unificado com toda lógica de auth e status premium |

### Modificar (5 arquivos)
| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/usePremiumStatus.tsx` | Converter para wrapper que lê do AuthContext |
| `src/hooks/usePremiumArtesStatus.tsx` | Converter para wrapper que lê do AuthContext |
| `src/hooks/usePackAccess.ts` | Converter para wrapper que lê do AuthContext |
| `src/hooks/usePremiumMusicosStatus.tsx` | Converter para wrapper que lê do AuthContext |
| `src/App.tsx` | Adicionar AuthProvider na árvore de componentes |

### Sem alteração (16+ arquivos)
Todos os componentes que usam os hooks continuarão funcionando **sem nenhuma modificação**, pois os hooks mantêm a mesma interface.

## Economia Esperada

| Métrica | Antes | Depois | Redução |
|---------|-------|--------|---------|
| Chamadas `get_user_packs` por página | 4x | 1x | **75%** |
| Chamadas `is_premium` por página | 4x | 1x | **75%** |
| Listeners de `onAuthStateChange` | 4x | 1x | **75%** |
| Chamadas `getSession()` no mount | 4x | 1x | **75%** |

## Benefícios

1. **Performance** - Reduz latência de carregamento das páginas
2. **Consistência** - Estado de auth único evita race conditions
3. **Manutenibilidade** - Lógica centralizada em um só lugar
4. **Retrocompatibilidade** - Hooks existentes continuam funcionando
5. **Custo** - Menos queries = menos carga no banco
