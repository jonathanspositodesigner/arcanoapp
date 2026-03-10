

## Plano: Pré-checkout Modal na página MP

### O que muda

1. **Remover campos do card de preço** (linhas 686-708): Tirar inputs de email, CPF e validações do card de preço. O botão CTA agora abre o modal.

2. **Criar modal de pré-checkout** com os seguintes campos:
   - **Nome completo** (obrigatório)
   - **Email** (obrigatório, com confirmação — digitar 2x)
   - **CPF** (obrigatório, com máscara)
   - **Forma de pagamento**: PIX ou Cartão (seleção visual com ícones)
   - Botão "Finalizar e Pagar"

3. **Lógica do modal**:
   - Ao clicar "Quero meu acesso vitalício", abre o modal
   - Validação: emails devem coincidir, CPF 11 dígitos, nome preenchido
   - Se usuário já logado, preenche email automaticamente e desabilita campo
   - Envia `user_name` junto ao `create-asaas-checkout` para criar cliente com nome real
   - Passa `billingType` baseado na escolha (PIX ou CREDIT_CARD ao invés de UNDEFINED)

4. **Edge function `create-asaas-checkout`**:
   - Aceitar novo campo `user_name` e `billing_type`
   - Usar `user_name` no lugar de `email.split('@')[0]` ao criar cliente
   - Passar `billingType` escolhido pelo usuário (PIX ou CREDIT_CARD)

5. **Busca de cliente existente**: Se o email ou CPF já existir no Asaas, usa o cliente existente — já implementado.

### Componentes

| Arquivo | Ação |
|---|---|
| `src/pages/PlanosUpscalerArcanoMP.tsx` | Remover inputs do card, criar componente modal de pré-checkout, abrir modal no CTA |
| `supabase/functions/create-asaas-checkout/index.ts` | Aceitar `user_name` e `billing_type`, usar no cliente e cobrança |

