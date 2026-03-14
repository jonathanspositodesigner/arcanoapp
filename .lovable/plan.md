

## Diagnóstico

### Bug 1: Produto errado no checkout (confirmado no banco)
O pedido do usuário `nevesmiguel703@gmail.com` (ordem `59f2642b`) foi gerado com o slug `creditos-4200` (R$ 29,90) em vez do plano Ultimate (R$ 59,90).

**Causa raiz**: A página `/planos-2` usa uma **única variável de estado** (`selectedCreditSlug`, inicializada com `'creditos-1500'`) para DOIS fluxos diferentes — compra de créditos avulsos E assinatura de planos. Quando o usuário interage com a seção de créditos (scroll, clique acidental) e depois clica num plano, o PreCheckoutModal pode abrir com o slug errado se o perfil estiver incompleto ou o usuário não estiver logado.

### Bug 2: Erro no checkout do Pagar.me
O screenshot mostra "Algo de errado aconteceu ao processar o seu pedido" na página do Pagar.me. O endereço exibido é o fallback padrão (Av Paulista, SP) que o sistema injeta quando o usuário não tem endereço cadastrado. Isso pode causar rejeição pela validação antifraude do Pagar.me.

### Verificação de preços (DB vs UI)
Todos os produtos de planos no banco estão corretos:
- `plano-starter-mensal`: R$ 19,90 ✓
- `plano-pro-mensal`: R$ 39,90 ✓  
- `plano-ultimate-mensal`: R$ 59,90 ✓
- `plano-unlimited-mensal`: R$ 149,90 ✓
- Anuais: todos corretos ✓
- Créditos avulsos: todos corretos ✓

---

## Plano de correção

### 1. Separar estado do PreCheckoutModal (arquivo: `src/pages/Planos2.tsx`)
- Renomear `selectedCreditSlug` para `preCheckoutSlug` e usar em ambos os fluxos de forma explícita
- Garantir que o slug SEMPRE é atualizado antes de abrir o modal, sem possibilidade de valor stale
- Remover a inicialização com `'creditos-1500'` (valor default perigoso) — inicializar como `null` e só abrir o modal quando o slug estiver definido

### 2. Corrigir endereço fallback para PIX (arquivo: `supabase/functions/create-pagarme-checkout/index.ts`)
- Remover o endereço fictício (Av Paulista) usado como fallback para PIX quando o usuário não tem endereço
- Em vez disso, habilitar `billing_address_editable: true` para PIX quando não há endereço, forçando o usuário a preencher no checkout do Pagar.me (evitando rejeição antifraude)

### 3. Verificar todas as páginas de planos
- Auditar `PlanosUpscalerArcano`, `PlanosUpscalerArcano69`, `PlanosForjaSelos3D`, `PlanosArcanoCloner`, `UpgradePlano` para o mesmo padrão de estado compartilhado
- Confirmar que cada uma passa o slug correto ao PreCheckoutModal

