

## Plano: Checkout Pagar.me para Pack 4 (3 variantes)

### Contexto atual

- A página `/planos-artes?pack=pack-arcano-vol-4` mostra 3 cards (6 meses, 1 ano, Vitalício) mas os botões redirecionam para links Greenn que **estão vazios** (fallback para voxvisual.com.br)
- Só existe 1 produto na `mp_products`: `pack4lancamento` (vitalício, R$37)
- O webhook Pagar.me hardcoda `has_bonus_access: true` e `expires_at: null` para todos os packs

### Mudanças necessárias

**1. Criar 3 produtos na `mp_products`** (via insert tool)

| slug | title | price | pack_slug | access_type |
|------|-------|-------|-----------|-------------|
| `pack4-6meses` | Pack Arcano 4 - 6 Meses | 27.00 | pack-arcano-vol-4 | 6_meses |
| `pack4-1ano` | Pack Arcano 4 - 1 Ano | 37.00 | pack-arcano-vol-4 | 1_ano |
| `pack4-vitalicio` | Pack Arcano 4 - Vitalício | 47.00 | pack-arcano-vol-4 | vitalicio |

**2. Atualizar `webhook-pagarme/index.ts`** — Lógica de `expires_at` e `has_bonus_access` dinâmica

Atualmente está hardcodado:
```typescript
has_bonus_access: true,
expires_at: null,
```

Mudar para:
```typescript
// Calcular expires_at baseado no access_type
const accessType = product.access_type || 'vitalicio';
let expiresAt = null;
if (accessType === '6_meses') {
  expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
} else if (accessType === '1_ano') {
  expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
}
const hasBonusAccess = accessType !== '6_meses'; // 1 ano e vitalício têm bônus

// Insert com valores dinâmicos
has_bonus_access: hasBonusAccess,
expires_at: expiresAt,
```

**3. Atualizar `PlanosArtes.tsx`** — Usar Pagar.me para Pack 4

Quando o pack selecionado for `pack-arcano-vol-4`, em vez de abrir links Greenn no `handleSelectOption`, usar o mesmo fluxo do Pagar.me (PreCheckoutModal + PaymentMethodModal) com o slug correto (`pack4-6meses`, `pack4-1ano` ou `pack4-vitalicio`).

Mudanças:
- Importar `useProcessingButton`, `PreCheckoutModal`, `PaymentMethodModal`
- Adicionar states para controle dos modais
- Mapear `accessType` → slug Pagar.me: `{ '6_meses': 'pack4-6meses', '1_ano': 'pack4-1ano', 'vitalicio': 'pack4-vitalicio' }`
- No `handleSelectOption`: se o pack tem slugs Pagar.me configurados, abrir fluxo Pagar.me em vez de link Greenn
- Desabilitar botão com `isSubmitting` durante processamento

**4. Deploy da edge function** `webhook-pagarme`

### Resultado

- Usuário na biblioteca clica Pack 4 → vê 3 planos com preços corretos
- Cada botão abre o checkout Pagar.me com o produto certo
- 6 meses: R$27, sem bônus, expira em 180 dias
- 1 ano: R$37, com bônus, expira em 365 dias
- Vitalício: R$47, com bônus, sem expiração

