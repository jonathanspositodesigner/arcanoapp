
Diagnóstico objetivo (por que está dando “nenhuma compra encontrada”):
- O erro está na função `check-purchase-exists`: ela monta este filtro quando recebe `order_id`:
  - `.or("asaas_payment_id.eq.${order_id},id.eq.${order_id}")`
- Quando o `order_id` vem no formato do gateway (`or_...`), o Postgres tenta comparar isso com `id` (UUID) e explode com `22P02 invalid input syntax for type uuid`.
- A função captura esse erro e devolve `exists: false`, então a tela cai em “Nenhuma compra encontrada”.
- Isso já aparece nos logs da função (`invalid input syntax for type uuid: "or_..."`), e o banco mostra compras existentes para `jonathandesigner1993@gmail.com`.

Plano de correção (implementação):
1) Corrigir a validação de `order_id` em `check-purchase-exists`
- Arquivo: `supabase/functions/check-purchase-exists/index.ts`
- Só usar filtro `id.eq(...)` quando `order_id` for UUID válido.
- Para `order_id` textual (`or_...`, `ch_...`), filtrar apenas por `asaas_payment_id`.
- Nunca retornar “false” por erro de cast; tratar o input antes de montar a query.

2) Blindar a função de onboarding com a mesma correção
- Arquivo: `supabase/functions/complete-purchase-onboarding/index.ts`
- Aplicar a mesma validação de tipo para evitar o mesmo `22P02`.
- Garantir que a checagem de pedido não quebre para `order_id` não-UUID.

3) Evitar falso negativo quando o gateway muda identificador após pagamento
- Ainda em `check-purchase-exists`, se não achar por `order_id` textual, aplicar fallback controlado por email + pedido recente/confirmado para não reprovar compra real recém-processada.
- Manter fallback restrito para não abrir brecha de acesso indevido.

4) Preservar o fluxo atual da UI (sem voltar para login)
- `src/pages/SucessoCompra.tsx` e `src/pages/SucessoUpscalerArcano.tsx` continuam:
  - compra encontrada + perfil existe → home
  - compra encontrada + sem perfil → criar senha inline
  - compra não encontrada → mensagem + suporte WhatsApp

Validação após ajuste:
- Caso real: `jonathandesigner1993@gmail.com` com URL `?order_id=or_...` deve sair de “Nenhuma compra encontrada”.
- Email sem compra real continua em “Nenhuma compra encontrada”.
- Fluxo de criação de senha não quebra por erro de UUID.
- Teste end-to-end dos dois caminhos (`/sucesso-compra` e `/sucesso-upscaler-arcano`) com `order_id` UUID e `order_id` textual.
