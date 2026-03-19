

## Problema Identificado

O usuário `djcristianorangel@gmail.com` tem `password_changed: false` no perfil desde a criação da conta (Dez 2025). O fluxo de login em `useUnifiedAuth.ts` (linha 301) verifica esse campo e, se for `false`, redireciona para a página de "Primeiro Acesso" (troca de senha), impedindo o login normal.

Esse é o **mesmo problema sistêmico** que pode afetar outros usuários antigos que nunca passaram pelo fluxo de troca de senha.

## Causa Raiz

O usuário provavelmente sempre fez login via link de recuperação ou o sistema não exigia essa verificação quando ele criou a conta. Agora que o check `password_changed` está ativo no fluxo de login, ele fica preso num loop: tenta logar → é redirecionado para trocar senha → recebe email de recovery → mas o fluxo de recovery não funciona corretamente para desbloquear.

## Correção Imediata

1. **Atualizar o perfil do usuário** via migração SQL:
   - Setar `password_changed = true` para `djcristianorangel@gmail.com`

## Correção Sistêmica (prevenir reincidência)

2. **Atualizar todos os perfis antigos** que têm `password_changed = false` mas já logaram com senha antes (contas com mais de 30 dias):
   - Migração SQL para setar `password_changed = true` em perfis criados antes de 2026-02-01 que ainda têm `password_changed = false`
   - Isso evita que outros usuários antigos caiam no mesmo problema

## Detalhes Técnicos

- **Tabela afetada**: `profiles`
- **Campo**: `password_changed` (boolean, atualmente `false` para este usuário)
- **Arquivo de lógica**: `src/hooks/useUnifiedAuth.ts` linha 301 — `if (!profile || !profile.password_changed)` redireciona para change-password
- A migração será um `UPDATE` simples, sem alteração de schema

