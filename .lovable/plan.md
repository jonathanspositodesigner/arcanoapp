
Diagnóstico completo do problema (já conferido com dados reais):

1) O link que você mandou (`.../functions/v1/confirm-email?token=...`) é o endpoint de confirmação de email no backend (normal esse formato).
2) Esse token específico **já foi consumido**:
   - `created_at: 2026-02-24 23:03:08+00`
   - `used_at: 2026-02-24 23:03:16+00`
3) No código atual de `confirm-email`, quando `tokenData.used_at` já existe, ele **não redireciona**; ele retorna HTML de sucesso com status 200.  
   Resultado: o usuário fica vendo a URL do backend no navegador em vez de ser jogado para a home.
4) Isso explica exatamente o comportamento que você viu: não é “erro de token novo”, é regra atual de token já usado.

Plano de correção (direto ao ponto):

- Objetivo: garantir redirecionamento para a home também quando o token já foi usado (idempotente e sem travar usuário).
- Arquivo alvo: `supabase/functions/confirm-email/index.ts`

Mudanças planejadas:

1. Unificar política de retorno:
   - Caso `tokenData.used_at` -> responder com `302 Location: https://arcanoapp.voxvisual.com.br/`
   - Em vez de renderizar HTML de sucesso no endpoint.

2. Manter fluxo atual para primeira confirmação:
   - primeira vez: marca `used_at`, atualiza `email_verified`, executa créditos free (se aplicável), e já retorna `302` (isso já existe e será mantido).

3. Melhorar robustez de UX:
   - opcional técnico recomendado: usar `303 See Other` para navegação web (evita ambiguidades de método em alguns clients), mantendo `Location` para home.
   - manter página HTML apenas para erros reais (token inválido/expirado), ou também redirecionar com query (`/?email_confirm=invalid`) se você quiser UX 100% sem tela de backend.

4. Alinhar função irmã para consistência:
   - aplicar mesma regra no `confirm-email-free-trial` para branch de token já usado (hoje também retorna HTML 200 e fica na URL da função).
   - Assim nenhum link de confirmação “para” no domínio do backend após clique repetido.

Validação pós-implementação (fim-a-fim):

1. Criar conta nova.
2. Abrir link de confirmação pela primeira vez:
   - deve confirmar e ir para home automaticamente.
3. Clicar no mesmo link de novo:
   - deve ir para home automaticamente (sem ficar na URL da função).
4. Verificar logs:
   - deve aparecer `Token already used` + resposta com redirect (3xx), não HTML 200 para esse caso.
5. Verificar que segurança de referral continua:
   - créditos de indicação só após email confirmado (já protegido no backend via `process_referral`).

Impacto esperado:

- Corrige a experiência “fica preso na URL da função”.
- Não reabre brecha de crédito.
- Mantém idempotência: clicar link duas vezes continua seguro.
