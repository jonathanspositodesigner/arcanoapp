
Objetivo
- Corrigir o bug de créditos zerando para assinantes (todos os planos).
- Restaurar os créditos perdidos do usuário juniorpardyn@gmail.com.
- Blindar para não voltar a acontecer.

Diagnóstico confirmado (já validado no banco)
- O usuário juniorpardyn@gmail.com está com plano starter ativo (1800/mês), contrato ativo, expiração correta.
- O saldo zerou por causa da função `expire_landing_trial_credits`:
  - ela removeu **-1620** créditos mensais em 2026-03-13 16:21 UTC.
  - depois disso, restou 60 vitalício e foi consumido, ficando 0.
- Causa raiz:
  1) `expire_landing_trial_credits` zera `monthly_balance` inteiro quando `landing_trial_expires_at` está vencido.
  2) ela não limpa `landing_trial_expires_at`, então roda de novo e gera spam de transações (muitas com amount=0).
  3) `reset_upscaler_credits` (usado na ativação de assinatura) não limpa o flag de trial; assim, assinante pago continua “marcado” como trial expirado e perde mensal depois.
- Impacto confirmado:
  - 26 usuários tiveram débito negativo por esse bug.
  - 2 usuários pagos ativos impactados agora: junior (-1620) e outro legacy (-800).

Plano de implementação
1) Hotfix de dados (imediato)
- Repor créditos do junior: **+1620 mensais** (valor exato removido pelo bug).
- Limpar `landing_trial_expires_at` dele para impedir nova remoção.
- Aplicar mesma correção automática para qualquer usuário pago ativo afetado pelo mesmo evento (inclui o caso legacy de -800).

2) Correção definitiva no backend (migração SQL)
- Atualizar `expire_landing_trial_credits` para ficar segura e idempotente:
  - se não há trial: não faz nada.
  - se trial não expirou: não faz nada.
  - se usuário tem assinatura paga ativa (planos2 pago ou premium legado ativo): **não debita nada**, apenas limpa `landing_trial_expires_at`.
  - se for trial real expirado: debita apenas o componente de trial (não zera mensal inteiro de forma cega).
  - limpar `landing_trial_expires_at` após processamento.
  - não inserir transação quando valor debitado for 0.
- Atualizar `reset_upscaler_credits`:
  - ao resetar mensal de assinatura, setar `landing_trial_expires_at = NULL`.
- Atualizar `add_upscaler_credits` (mensal manual/admin):
  - também limpar `landing_trial_expires_at` para evitar dedução indevida posterior.

3) Blindagem operacional
- Adicionar query de auditoria para detectar automaticamente:
  - transações “Créditos de teste expirados (24h)” com `amount < 0` em usuários pagos ativos.
- Expor esse alerta no fluxo admin (ou rotina interna) para ação proativa.

Arquivos/áreas a alterar
- Nova migration em `supabase/migrations/*` para:
  - `CREATE OR REPLACE FUNCTION public.expire_landing_trial_credits`
  - `CREATE OR REPLACE FUNCTION public.reset_upscaler_credits`
  - `CREATE OR REPLACE FUNCTION public.add_upscaler_credits`
  - bloco de backfill/reparo dos usuários afetados.
- Sem alterar páginas de venda; é correção de regra de crédito no backend.

Critérios de aceite
- juniorpardyn@gmail.com volta a ter saldo correto (1620 mensal, conforme consumo já realizado).
- Assinantes pagos com trial antigo não perdem mensal ao abrir o app.
- Não há novos registros de expiração com amount=0 em loop.
- Fluxo de ativação de qualquer plano (starter/pro/ultimate/unlimited e legado) não sofre perda por trial expirado antigo.
