
# Plano atualizado: corrigir PIX inativo no checkout da página `/planos-upscaler-arcano-69`

## Diagnóstico (já confirmado)
- A geração do checkout está funcionando (a função retorna `checkout_url` com sucesso).
- O problema acontece **depois do redirecionamento**, na tela do Mercado Pago (botão de PIX inativo).
- Hoje a página coleta só e-mail; para BR, o fluxo de PIX fica muito mais estável quando o `payer` vai completo com **nome + e-mail + CPF real**.
- Houve histórico de slug errado (Arcano Cloner) em tentativas antigas; vamos blindar isso no código da página 69.

## O que vou implementar
1. **Coleta mínima obrigatória real antes do redirecionamento (sem dados fictícios)**
   - Na página 69, trocar o modal atual para coletar:
     - Nome completo
     - E-mail
     - CPF (com máscara + validação)
   - Reusar o modal já existente de customer (ou equivaler) com validação forte.
   - Corrigir acessibilidade do dialog (`DialogDescription`) para remover warning.

2. **Enviar esses dados reais para a função de checkout**
   - Atualizar `src/lib/mpCheckout.ts` para enviar:
     - `user_name`
     - `user_email`
     - `user_document` (CPF sem máscara)
   - Manter timeout, tratamento de erro e redirecionamento direto.

3. **Ajustar payload do Mercado Pago com payer completo**
   - Em `supabase/functions/create-mp-checkout/index.ts`:
     - Validar `product_slug`, `user_name`, `user_email`, `user_document`.
     - Montar `payer` com:
       - `name`
       - `email`
       - `identification: { type: "CPF", number: "<cpf>" }`
     - Melhorar retorno de erro (propagar mensagem real da API quando existir) para facilitar diagnóstico.

4. **Blindar slugs corretos na página 69 (sem resíduo de outro produto)**
   - Em `src/pages/PlanosUpscalerArcano69v2.tsx`:
     - Garantir slugs fixos dos planos desta página:
       - `upscaler-arcano-starter`
       - `upscaler-arcano-pro`
       - `upscaler-arcano-ultimate`
       - `upscaller-arcano-vitalicio`
     - Remover fallback legado que abre checkout externo para o vitalício nesta página 69 (ficará tudo no mesmo fluxo de Mercado Pago).

5. **Validação fim a fim focada em PIX**
   - Testar os 4 botões de compra da página 69.
   - Confirmar no checkout do Mercado Pago:
     - dados do pagador chegando corretamente
     - opção PIX habilitada e botão de gerar PIX ativo
   - Se ainda ficar inativo, devolver mensagem explícita de bloqueio de conta/meio de pagamento para ação operacional (ex.: chave PIX/conta de recebimento no Mercado Pago), em vez de erro genérico.

## Arquivos que serão alterados
- `src/pages/PlanosUpscalerArcano69v2.tsx`
- `src/lib/mpCheckout.ts`
- `supabase/functions/create-mp-checkout/index.ts`
- `src/components/checkout/MPEmailModal.tsx` (ou substituição por `CheckoutCustomerModal` apenas nesta página)

## Detalhes técnicos (objetivo)
- Zero dados fictícios.
- `payer` completo e validado no backend.
- Slugs travados corretamente para a página 69.
- Erro detalhado e rastreável quando o gateway bloquear PIX por regra de conta/configuração.
