
# Plano: Modal de Escolha Upscaler Arcano para Compradores Vitalícios

## Resumo

Implementar um modal de escolha que aparece quando usuários que compraram o Upscaler Arcano Vitalício clicam em "Acessar Ferramenta". O modal oferece duas opções: a versão ilimitada original (sem créditos) e a nova versão App (com créditos).

---

## Fluxo de Decisão

```text
Usuário clica no card Upscaler Arcano
         │
         ▼
┌─────────────────────────────┐
│ Tem pack 'upscaller-arcano'?│
└─────────────────────────────┘
         │
    Sim  │  Não
         │    └──► Fluxo normal (ir para /upscaler-selection)
         ▼
┌─────────────────────────────┐
│   Abre Modal de Escolha     │
│  ┌─────────┐  ┌───────────┐ │
│  │Ilimitada│  │ Versão App│ │
│  │Vitalícia│  │           │ │
│  └─────────┘  └───────────┘ │
└─────────────────────────────┘
         │
   Escolha │
         ├──────────────────────────────────────┐
         ▼                                      ▼
┌─────────────────────┐              ┌─────────────────────┐
│ Versão Ilimitada    │              │ Versão App          │
│                     │              │                     │
│ Vai para:           │              │ Já resgatou 1500?   │
│ /ferramenta-ia-artes│              │                     │
│ /upscaller-arcano   │              └─────────────────────┘
└─────────────────────┘                        │
                                     Sim       │      Não
                                       ┌───────┴───────┐
                                       ▼               ▼
                              ┌────────────┐   ┌────────────────┐
                              │"Acessar    │   │"Resgatar 1.500 │
                              │Ferramenta" │   │créditos e      │
                              │            │   │testar"         │
                              │Vai para:   │   │                │
                              │/upscaler-  │   │Chama API →     │
                              │selection   │   │Vai para:       │
                              └────────────┘   │/upscaler-      │
                                               │selection       │
                                               └────────────────┘
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/ferramentas/UpscalerChoiceModal.tsx` | CRIAR | Componente do modal de escolha |
| `src/pages/FerramentasIAAplicativo.tsx` | MODIFICAR | Integrar modal no card Upscaler Arcano |
| `src/hooks/usePromoClaimStatus.ts` | CRIAR | Hook para verificar status de resgate |

---

## Componente: UpscalerChoiceModal.tsx

```tsx
interface UpscalerChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasClaimedPromo: boolean;
  isCheckingClaim: boolean;
  onClaimAndAccess: () => Promise<void>;
}
```

### Design do Modal

```text
┌────────────────────────────────────────────────────┐
│                 Escolha sua versão                 │
│                                                    │
│  ┌──────────────────────┐  ┌──────────────────────┐│
│  │   ♾️ ILIMITADA       │  │   ⚡ VERSÃO APP      ││
│  │   E VITALÍCIA        │  │                      ││
│  │                      │  │                      ││
│  │ Esta é a versão que  │  │ Nova versão mais     ││
│  │ você adquiriu. Sem   │  │ rápida e fácil de    ││
│  │ limite de uso e sem  │  │ usar. Consome        ││
│  │ consumo de créditos. │  │ créditos por uso.    ││
│  │                      │  │                      ││
│  │ [Acessar Versão     ]│  │ [Resgatar 1.500     ]││
│  │  Ilimitada           │  │  créditos e testar  ]││
│  └──────────────────────┘  └──────────────────────┘│
└────────────────────────────────────────────────────┘
```

---

## Hook: usePromoClaimStatus.ts

```tsx
export const usePromoClaimStatus = (userId: string | undefined) => {
  // Verifica na tabela promo_claims se o código UPSCALER_1500 foi resgatado
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['promo-claim-status', userId, 'UPSCALER_1500'],
    queryFn: async () => {
      const { data } = await supabase
        .from('promo_claims')
        .select('id')
        .eq('user_id', userId)
        .eq('promo_code', 'UPSCALER_1500')
        .maybeSingle();
      
      return { hasClaimed: !!data };
    },
    enabled: !!userId,
  });
  
  return {
    hasClaimed: data?.hasClaimed ?? false,
    isLoading,
    refetch,
  };
};
```

---

## Modificação: FerramentasIAAplicativo.tsx

### Lógica do Card Upscaler Arcano

```tsx
// Estados
const [showUpscalerModal, setShowUpscalerModal] = useState(false);
const hasUpscalerPack = hasAccessToPack('upscaller-arcano');

// Verificar status de resgate
const { hasClaimed, isLoading: isCheckingClaim, refetch } = usePromoClaimStatus(user?.id);

// Handler do clique no card
const handleUpscalerClick = () => {
  if (hasUpscalerPack) {
    // Comprador vitalício → abre modal de escolha
    setShowUpscalerModal(true);
  } else {
    // Usuário normal → fluxo padrão
    navigate('/upscaler-selection');
  }
};

// Handler para resgatar e acessar
const handleClaimAndAccess = async () => {
  // Chama a Edge Function de resgate (mesma usada em /resgatar-creditos)
  await supabase.functions.invoke('claim-upscaler-promo', {
    body: { email: user?.email }
  });
  
  await refetch();
  navigate('/upscaler-selection');
};
```

---

## Detalhes Técnicos

### Verificação de Pack

Usa o hook existente `usePremiumArtesStatus`:
```tsx
const { hasAccessToPack, user } = usePremiumArtesStatus();
const hasUpscalerPack = hasAccessToPack('upscaller-arcano');
```

### Tabela promo_claims

Já existe e é usada pela página `/resgatar-creditos`. Campos relevantes:
- `user_id`: UUID do usuário
- `promo_code`: String do código (ex: 'UPSCALER_1500')
- `claimed_at`: Timestamp do resgate

### Edge Function de Resgate

A Edge Function `claim-upscaler-promo` já existe e faz:
1. Verifica elegibilidade (tem pack vitalício)
2. Verifica se já resgatou
3. Adiciona 1500 créditos vitalícios
4. Registra na tabela `promo_claims`

---

## Rotas de Navegação

| Ação | Destino |
|------|---------|
| Versão Ilimitada e Vitalícia | `/ferramenta-ia-artes/upscaller-arcano` |
| Versão App (já resgatou) | `/upscaler-selection` |
| Versão App (não resgatou) | Resgata créditos → `/upscaler-selection` |
| Usuário sem pack | `/upscaler-selection` (fluxo normal) |

---

## Texto dos Cards

### Card Versão Ilimitada e Vitalícia
- **Título:** Versão Ilimitada e Vitalícia
- **Ícone:** ♾️ (infinito)
- **Descrição:** "Esta é a versão que você adquiriu. Sem limite de uso e sem consumo de créditos."
- **Botão:** "Acessar Versão Ilimitada"

### Card Versão App
- **Título:** Versão App
- **Ícone:** ⚡ (raio)
- **Descrição:** "Nova versão mais rápida e fácil de usar. Consome créditos por uso."
- **Botão (não resgatou):** "Resgatar 1.500 créditos e testar"
- **Botão (já resgatou):** "Acessar Ferramenta"

---

## Garantias de Segurança

1. **Não quebra fluxo existente:** Usuários sem o pack continuam com o comportamento atual
2. **Validação dupla:** O resgate é validado tanto no frontend quanto na Edge Function
3. **Componente isolado:** O modal é um componente separado, fácil de testar
4. **Usa hooks existentes:** Reutiliza `usePremiumArtesStatus` e padrões já estabelecidos
5. **Tabela existente:** Usa a mesma tabela `promo_claims` já em uso

---

## Resumo de Implementação

1. **Criar** `src/hooks/usePromoClaimStatus.ts` - hook para verificar resgate
2. **Criar** `src/components/ferramentas/UpscalerChoiceModal.tsx` - modal de escolha
3. **Modificar** `src/pages/FerramentasIAAplicativo.tsx`:
   - Adicionar estado do modal
   - Verificar se usuário tem pack
   - Renderizar modal condicionalmente
   - Ajustar handler do card Upscaler Arcano
