
Objetivo
- Voltar o backend (Edge Functions) ao estado “pré-mudança do Deno.serve”, revertendo manualmente, arquivo por arquivo, as funções que foram migradas hoje para `Deno.serve()` (e ajustando também a importação `npm:` do `supabase-js` no `webhook-greenn-artes`, se você quer “exatamente como estava antes”).

O que mudou hoje (o que dá para afirmar olhando o código atual)
- Existem 22 funções que hoje estão usando `Deno.serve(...)` (padrão nativo).
- Parte do seu ecossistema ainda está no padrão antigo `import { serve } from "https://deno.land/std@.../http/server.ts";` e `serve(async (req) => ...)`.
- Além disso, hoje o `webhook-greenn-artes` ficou diferente das outras funções: ele está importando o client via `npm:@supabase/supabase-js@2` (as demais usam `https://esm.sh/@supabase/supabase-js@2`).

Por que eu não consigo garantir “exatamente igual” só no chute
- Eu consigo reverter com precisão o “bootstrap” (trocar `Deno.serve` por `serve`), porque isso é mecânico e visível no código atual.
- Mas “voltar exatamente como estava antes” pode envolver outros detalhes além do bootstrap (imports, pequenas mudanças internas que não aparecem só olhando o estado atual).
- Ainda assim, dá para reverter as mudanças identificáveis (Deno.serve + import npm) de forma bem direta e alinhada ao padrão antigo já existente em outras funções do projeto.

Escopo da reversão (o que será feito)
A) Reverter `Deno.serve(...)` -> `serve(...)` nas 22 funções que hoje usam Deno.serve:
1. `supabase/functions/admin-add-credit-user/index.ts`
2. `supabase/functions/create-pack-client/index.ts`
3. `supabase/functions/create-partner-artes/index.ts`
4. `supabase/functions/create-partner/index.ts`
5. `supabase/functions/create-premium-user-artes/index.ts`
6. `supabase/functions/create-premium-user-musicos/index.ts`
7. `supabase/functions/create-premium-user/index.ts`
8. `supabase/functions/delete-auth-user-artes/index.ts`
9. `supabase/functions/delete-auth-user-by-email/index.ts`
10. `supabase/functions/import-pack-clients/index.ts`
11. `supabase/functions/manage-admin/index.ts`
12. `supabase/functions/reset-admin-password/index.ts`
13. `supabase/functions/runninghub-queue-manager/index.ts`
14. `supabase/functions/send-admin-2fa/index.ts`
15. `supabase/functions/update-user-password-artes/index.ts`
16. `supabase/functions/verify-admin-2fa/index.ts`
17. `supabase/functions/webhook-greenn-artes/index.ts`
18. `supabase/functions/webhook-greenn-creditos/index.ts`
19. `supabase/functions/webhook-greenn-musicos/index.ts`
20. `supabase/functions/webhook-greenn/index.ts`
21. `supabase/functions/webhook-hotmart-artes/index.ts`
22. `supabase/functions/welcome-email-tracking/index.ts`

B) (Opcional, mas alinhado ao seu “exatamente como antes”) Reverter o import do supabase-js no `webhook-greenn-artes`
- Trocar:
  - `import { createClient } from 'npm:@supabase/supabase-js@2'`
  - para `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'`
- Observação importante: isso pode reintroduzir o risco de deploy “bundle timed out” se a rede/esm.sh estiver instável. Se isso acontecer, a alternativa mais estável (sem mexer em lógica) é manter `npm:` e só reverter `Deno.serve` (mas eu só faço isso se você autorizar).

Como será a reversão (mecânica de alteração por arquivo)
Para cada uma das 22 funções acima:
1) Adicionar no topo do arquivo (se ainda não existir) o import:
   - `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";`
   - (Vou usar `0.168.0` porque é o mesmo que já está em funções estáveis do seu projeto, como `send-push-notification`. Se algum arquivo já usa outro std version e você quiser manter exatamente aquela versão, eu mantenho a versão existente no arquivo.)
2) Substituir o trecho final:
   - De: `Deno.serve(async (req) => { ... });`
   - Para: `serve(async (req) => { ... });`
3) Garantir que:
   - O handler de `OPTIONS` continua existindo (CORS preflight)
   - Todas as respostas continuam retornando os headers CORS (não vou mudar sua lógica, só o “server start”)

Ordem de execução (uma por uma, mas priorizando o que impacta vendas)
Para reduzir risco de ficar sem webhooks enquanto mexe em tudo, vou fazer em 3 “ondas” bem controladas:

Onda 1 (webhooks de venda – prioridade máxima)
- Reverter primeiro:
  - `webhook-greenn-artes`
  - `webhook-greenn`
  - `webhook-greenn-musicos`
  - `webhook-greenn-creditos`
  - `webhook-hotmart-artes`
- (E aqui entra também a decisão do item B: reverter `npm:` -> `esm.sh` no `webhook-greenn-artes` se você confirmar que quer idêntico.)

Onda 2 (admin/usuários/emails – suporte operacional)
- Reverter:
  - `create-premium-user*`, `create-partner*`, `create-pack-client`, `import-pack-clients`
  - `manage-admin`, `reset-admin-password`, `update-user-password-artes`, `delete-auth-user*`
  - `send-admin-2fa`, `verify-admin-2fa`, `admin-add-credit-user`, `welcome-email-tracking`

Onda 3 (fila RunningHub)
- Reverter:
  - `runninghub-queue-manager`
- (É uma função sensível; por isso deixo por último para não criar efeito colateral na fila enquanto os webhooks de vendas são restaurados.)

Plano de validação (para ter certeza que “voltou a funcionar”)
- Depois da Onda 1:
  - Fazer um teste de POST na função de webhook (simulando o básico: `email`, `product.id`, `currentStatus`, `event`) e confirmar que ela responde 2xx rápido.
  - Você faz o “teste de pagamento confirmado” na Greenn e a gente confirma pelo log da função que chegou.
- Se a Greenn continuar dizendo “falha ao processar webhook” mesmo com o bootstrap antigo:
  - Aí fica praticamente provado que o problema não é o `Deno.serve` em si, e sim alguma outra causa (ex: payload/evento diferente, instabilidade do provedor, ou mudança de resposta/timeout). Mas primeiro eu faço exatamente a reversão que você pediu.

Riscos e como vamos tratar
- Risco 1: Reverter para `serve` depende de baixar o std do Deno (deno.land). Se deno.land estiver instável durante o deploy, pode dar problema de bundling.
  - Mitigação: usar uma versão fixa (`0.168.0`) e não puxar libs adicionais.
- Risco 2: Reverter `npm:` -> `esm.sh` no `webhook-greenn-artes` pode reintroduzir o mesmo tipo de problema que impediu deploy anteriormente.
  - Mitigação: só fazer essa reversão se você confirmar que faz questão do “exatamente igual”. Se o deploy falhar, a alternativa mais segura é manter `npm:` e apenas reverter o `Deno.serve`.

O que eu preciso de você (decisão rápida para eu executar sem voltar atrás depois)
1) Você quer que eu reverta também o `webhook-greenn-artes` de `npm:` de volta para `esm.sh` (para ficar “exatamente como antes”), mesmo com o risco de deploy instável?
2) Confirma que é para reverter TODAS as 22 funções listadas (não só os webhooks), ou quer que eu faça só os webhooks primeiro e você valida?

Entrega
- Após aprovado, eu implemento a reversão (arquivo por arquivo conforme acima), e em seguida eu valido por chamadas de teste + logs.
- No final, eu te passo um checklist objetivo do que foi revertido e quais webhooks você precisa reenviar (as vendas perdidas) para normalizar tudo.
