

## Plano: Modal de Escolha de Pagamento + Correções

### Problemas identificados

1. O texto do botão mostra "Gerando PIX..." quando deveria ser "Gerando pagamento..."
2. Quando o perfil está completo, o checkout vai direto sem dar opção de escolher PIX ou Cartão
3. O endereço não está sendo enviado corretamente porque `billing_type` não é passado, e a lógica do backend depende dele para montar o `billing_address`

### O que será feito

**1. Novo modal de escolha de pagamento** (em `Planos2.tsx`)
- Quando perfil completo, ao clicar "Comprar Agora", abre um modal com duas opções: PIX e Cartão de Crédito
- Cada opção terá visual premium (ícones, gradientes)
- Ao escolher, envia a requisição com `billing_type: 'PIX'` ou `billing_type: 'CREDIT_CARD'`

**2. Lógica por método:**
- **PIX**: envia `billing_type: 'PIX'` + `user_address` completo (endereço pré-preenchido no checkout)
- **Cartão**: envia `billing_type: 'CREDIT_CARD'` sem `user_address` (formulário de endereço editável no checkout para antifraude)

**3. Texto do loading:**
- Trocar "Gerando PIX..." por "Gerando pagamento..."

### Mudanças técnicas

**Arquivo: `src/pages/Planos2.tsx`**
- Adicionar estado `showPaymentMethodModal` e `pendingSlug`
- Criar modal com Dialog mostrando PIX e Cartão como opções
- Ao selecionar método, chamar `create-pagarme-checkout` com `billing_type` correto
- PIX: inclui `user_address`; Cartão: não inclui `user_address`
- Trocar texto "Gerando PIX..." por "Gerando pagamento..."

**Backend (`create-pagarme-checkout`)**: Nenhuma mudança necessária -- a lógica de `billing_type` já existe e funciona corretamente. O problema era que o frontend não estava enviando o `billing_type`.

