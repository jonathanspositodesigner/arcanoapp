
Objetivo: corrigir definitivamente a inconsistência do primeiro acesso para compras (sem link por e-mail), garantindo que `password_changed` só vire `true` quando a pessoa realmente cadastrar nova senha.

## Diagnóstico (baseado na varredura do código)
1. Há escrita indevida de `password_changed=true` fora da troca real de senha:
- `src/hooks/useUnifiedAuth.ts` (auto-fix de legado no login)
- `src/pages/UserLogin.tsx` (auto-fix de legado no mount)

2. Fluxo de sucesso está inconsistente entre páginas:
- `src/pages/SucessoCompra.tsx` decide com `exists + password_changed`, mas não usa `has_logged_in`.
- `src/pages/SucessoUpscalerArcano.tsx` está pior: redireciona só com `exists` (ignora `password_changed`).

3. Após cadastro de senha direto na página de sucesso, o flag não é marcado:
- `SucessoCompra.tsx` e `SucessoUpscalerArcano.tsx` fazem login, mas não atualizam `profiles.password_changed = true`.

## Plano de implementação
1) Remover qualquer “auto-marcação” de `password_changed=true` fora de troca real de senha
- Em `useUnifiedAuth.ts`: remover update legado que grava `true`.
- Em `UserLogin.tsx`: remover update legado que grava `true`.
- Manter legado apenas como regra de navegação (sem gravar no banco).

2) Padronizar decisão de primeiro acesso nas páginas de sucesso
- Em `SucessoCompra.tsx`: usar retorno completo de `check_profile_exists` (`exists_in_db`, `password_changed`, `has_logged_in`).
- Em `SucessoUpscalerArcano.tsx`: mesma lógica (igual à de `SucessoCompra`).
- Regra final:
  - Só redireciona Home se: `exists && password_changed && has_logged_in`.
  - Caso contrário, vai para etapa “criar senha”.

3) Marcar `password_changed=true` apenas após sucesso real da nova senha
- Em `SucessoCompra.tsx` e `SucessoUpscalerArcano.tsx`:
  - depois de `complete-purchase-onboarding` + `signInWithPassword` bem-sucedidos, atualizar `profiles.password_changed = true`.
- Em `ChangePassword.tsx`: manter como está (já marca `true` no ponto correto).

4) Blindagem opcional no backend (consistência extra)
- Em `supabase/functions/complete-purchase-onboarding/index.ts`:
  - preservar comportamento atual de criação com `password_changed=false` para novos perfis.
  - não forçar `true` em nenhum ponto dessa função.

5) Correção de dados do(s) usuário(s) afetado(s) pelo ajuste manual anterior
- Aplicar update pontual para voltar `password_changed=false` no usuário de teste impactado antes do novo teste.
- Sem migration (operação de dados, não de schema).

## Validação (obrigatória)
1. Compra nova (usuário novo):
- entra com e-mail de compra → cai em “criar senha” (sem enviar link),
- define senha → login automático,
- `password_changed` vira `true` somente aqui.

2. Usuário existente que já trocou senha:
- entra com e-mail → vai para senha/login normal (não volta para onboarding).

3. Usuário com flag inconsistente:
- não deve ser jogado para Home automaticamente;
- deve cair em criação/troca de senha.

4. Verificação técnica:
- nenhuma chamada automática para `send-recovery-email` no primeiro acesso pós-compra.
- sem regressão em reset de senha tradicional (`/forgot-password` e `/reset-password`).

## Arquivos a alterar
- `src/hooks/useUnifiedAuth.ts`
- `src/pages/UserLogin.tsx`
- `src/pages/SucessoCompra.tsx`
- `src/pages/SucessoUpscalerArcano.tsx`
- `supabase/functions/complete-purchase-onboarding/index.ts` (blindagem/consistência)
