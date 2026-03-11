

## Plan: Integrar Checkout Pagar.me na Página do Pack 4

### Resumo
Substituir o botão de checkout da Greenn pelo fluxo de checkout do Pagar.me, usando o produto `pack4lancamento` que concede acesso ao Pack Arcano Vol. 4, Pack de São João e todos os bônus.

### 1. Criar produto na tabela `mp_products` (migração SQL)
Inserir um novo produto com:
- `slug`: `pack4lancamento`
- `title`: `Pack Arcano 4 - Acesso Vitalício`
- `price`: `37.00`
- `type`: `pack`
- `pack_slug`: `pack-arcano-vol-4`
- `access_type`: `vitalicio`
- `is_active`: `true`

### 2. Atualizar o webhook `webhook-pagarme` (Edge Function)
Adicionar lógica especial para o slug `pack4lancamento`: além de conceder o `pack-arcano-vol-4`, também conceder automaticamente:
- `pack-de-sao-joao` (vitalício, com bônus)
- Setar `has_bonus_access = true` em ambos

Isso será feito logo após o bloco existente de processamento de pack (linha ~483), adicionando um mapeamento de packs adicionais para produtos do tipo "bundle".

### 3. Atualizar `PricingCardsSection.tsx`
- Remover o `checkoutUrl` da Greenn e a função `handlePurchase` que abre URL externa
- Importar e usar o `PreCheckoutModal` com `productSlug="pack4lancamento"`
- Implementar o mesmo fluxo de checkout do Planos2: verificar se o usuário está logado e com perfil completo → modal de método de pagamento (PIX/Cartão) → invocar `create-pagarme-checkout`; caso contrário, abrir o `PreCheckoutModal`
- Adicionar o modal de seleção de método de pagamento (PIX/Cartão) inline

### 4. Tratar revogação (reembolso) no webhook
Estender a lógica de reembolso para também revogar `pack-de-sao-joao` quando o produto for `pack4lancamento`.

### Detalhes técnicos

**Mapeamento de packs extras no webhook:**
```typescript
const BUNDLE_EXTRA_PACKS: Record<string, Array<{pack_slug: string, access_type: string}>> = {
  'pack4lancamento': [
    { pack_slug: 'pack-de-sao-joao', access_type: 'vitalicio' }
  ]
}
```
Após conceder o pack principal, iterar sobre os extras e inserir cada um.

**Componente PricingCardsSection:** Seguir o padrão exato do `Planos2.tsx` para o fluxo de checkout, incluindo:
- Hook `useAuth` para verificar login
- Consulta ao perfil para verificar completude
- Dialog de seleção PIX/Cartão
- Invocação da edge function `create-pagarme-checkout`
- Fallback para `PreCheckoutModal` quando perfil incompleto ou não logado

