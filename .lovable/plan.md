

# Plano: Roteamento de Ferramentas IA por Tipo de Compra

## Lógica de Negócio Atualizada

| Tipo de Compra | Pack Slug | Destino |
|----------------|-----------|---------|
| **Upscaler Arcano (vitalício)** | `upscaller-arcano` | `/ferramentas-ia` (página atual) |
| **Créditos PUROS** | Produtos 156946, 156948, 156952 | `/ferramentas-ia-aplicativo` (nova) |
| **Créditos + Ferramentas** | Produtos 156954, 156957, 156960 | `/ferramentas-ia-aplicativo` (nova) |

**Regra Principal:**
- Se o usuário **TEM** acesso ao pack `upscaller-arcano` → página antiga
- Se o usuário **NÃO TEM** acesso ao pack `upscaller-arcano` → página nova

## Mapeamento de Produtos de Créditos

| Product ID | Tipo | Créditos Vitalícios |
|------------|------|---------------------|
| 156946 | Créditos Puros | +1.500 |
| 156948 | Créditos Puros | +4.200 |
| 156952 | Créditos Puros | +10.800 |
| 156954 | Créditos + Ferramentas | +1.500 |
| 156957 | Créditos + Ferramentas | +4.200 |
| 156960 | Créditos + Ferramentas | +10.800 |

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────┐
│                    USUÁRIO ACESSA /ferramentas-ia               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Tem pack 'upscaller-arcano'?  │
              │ (via hasAccessToPack)         │
              └───────────────┬───────────────┘
                              │
               ┌──────────────┴──────────────┐
               │                             │
              SIM                           NÃO
               │                             │
               ▼                             ▼
  ┌─────────────────────────┐   ┌──────────────────────────────┐
  │  /ferramentas-ia        │   │  /ferramentas-ia-aplicativo  │
  │  (página atual)         │   │  (página nova - em branco)   │
  │                         │   │                              │
  │  • Upscaler Arcano      │   │  Página em construção...     │
  │  • Forja 3D             │   │                              │
  │  • IA Muda Pose         │   │                              │
  │  • IA Muda Roupa        │   │                              │
  └─────────────────────────┘   └──────────────────────────────┘
```

## Mudanças Necessárias

### 1. Criar nova página `FerramentasIAAplicativo.tsx`

Página em branco inicial na rota `/ferramentas-ia-aplicativo`:

```typescript
const FerramentasIAAplicativo = () => {
  return (
    <div className="min-h-screen bg-[#0D0221] flex items-center justify-center">
      <div className="text-center">
        <Sparkles className="w-16 h-16 text-purple-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white">
          Ferramentas IA Aplicativo
        </h1>
        <p className="text-purple-300 mt-2">
          Página em construção...
        </p>
      </div>
    </div>
  );
};
```

### 2. Registrar rota no `App.tsx`

Adicionar lazy import e rota:

```typescript
// Lazy import (próximo à linha 101)
const FerramentasIAAplicativo = lazy(() => import("./pages/FerramentasIAAplicativo"));

// Rota (próximo à linha 250)
<Route path="/ferramentas-ia-aplicativo" element={<FerramentasIAAplicativo />} />
```

### 3. Modificar `FerramentasIA.tsx`

Adicionar lógica de redirecionamento no início do componente:

```typescript
const { user, hasAccessToPack, isPremium, isLoading: isPremiumLoading } = usePremiumArtesStatus();

// Verificar se tem acesso ao Upscaler Arcano
const hasUpscalerArcano = hasAccessToPack('upscaller-arcano');

useEffect(() => {
  // Só redireciona se:
  // 1. Não está carregando
  // 2. Usuário está logado
  // 3. NÃO tem acesso ao Upscaler Arcano
  if (!isPremiumLoading && user && !hasUpscalerArcano) {
    navigate('/ferramentas-ia-aplicativo', { replace: true });
  }
}, [isPremiumLoading, user, hasUpscalerArcano, navigate]);
```

### 4. Adicionar novos produtos ao webhook

Modificar `webhook-greenn-artes/index.ts` para incluir os 3 novos Product IDs no mapeamento de créditos:

```typescript
// Mapeamento de produtos de CRÉDITOS (todos vão para página nova)
const CREDITS_PRODUCT_MAPPING: Record<number, { amount: number; name: string }> = {
  // Créditos PUROS
  156946: { amount: 1500, name: 'Pacote +1.500 Créditos' },
  156948: { amount: 4200, name: 'Pacote +4.200 Créditos' },
  156952: { amount: 10800, name: 'Pacote +10.800 Créditos' },
  // Créditos + Ferramentas (App)
  156954: { amount: 1500, name: 'Pacote Créditos App +1.500' },
  156957: { amount: 4200, name: 'Pacote Créditos App +4.200' },
  156960: { amount: 10800, name: 'Pacote Créditos App +10.800' }
}
```

## Fluxo Completo

1. **Usuário NOVO compra Upscaler Arcano (vitalício)**
   - Webhook registra pack `upscaller-arcano` em `user_pack_purchases`
   - Usuário acessa `/ferramentas-ia` → vê página antiga ✓

2. **Usuário NOVO compra créditos (qualquer dos 6 produtos)**
   - Webhook atribui créditos via `add_lifetime_credits()`
   - Cria perfil (não tem pack `upscaller-arcano`)
   - Usuário acessa `/ferramentas-ia` → redirecionado para `/ferramentas-ia-aplicativo` ✓

3. **Usuário EXISTENTE que JÁ TEM Upscaler Arcano compra créditos**
   - Webhook adiciona créditos
   - Usuário acessa `/ferramentas-ia` → vê página antiga (porque TEM o pack) ✓

## Arquivos a Modificar/Criar

| Arquivo | Ação |
|---------|------|
| `src/pages/FerramentasIAAplicativo.tsx` | **CRIAR** - Página em branco |
| `src/App.tsx` | Adicionar lazy import + rota `/ferramentas-ia-aplicativo` |
| `src/pages/FerramentasIA.tsx` | Adicionar lógica de redirecionamento |
| `supabase/functions/webhook-greenn-artes/index.ts` | Adicionar 3 novos Product IDs ao mapeamento |

## Vantagens desta Abordagem

1. **Simples**: Usa a infraestrutura existente de packs
2. **Nenhuma migração**: Não precisa adicionar colunas no banco
3. **Retrocompatível**: Usuários existentes do Upscaler Arcano não são afetados
4. **Fácil de testar**: Basta verificar se tem ou não o pack

