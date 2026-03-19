

## Problema

Ainda existem **430 usuários legados** (criados antes de março 2026) com `password_changed = false`, sendo que 22 deles já fizeram login com senha depois da criação. O fix anterior só cobriu contas antes de 2026-02-01 — sobrou o período fevereiro-março.

A lógica na linha 301 do `useUnifiedAuth.ts` continua bloqueando esses usuários como "primeiro acesso" mesmo que eles já saibam a senha e consigam autenticar.

## Correções

### 1. Fix no código — auto-corrigir contas antigas no login (useUnifiedAuth.ts)

Na linha 301, antes de redirecionar para troca de senha, verificar se a conta tem mais de 7 dias. Se sim, o usuário claramente já sabe a senha (acabou de autenticar com sucesso) — atualizar `password_changed = true` automaticamente e deixar passar, sem redirecionar.

```typescript
if (!profile || !profile.password_changed) {
  if (!profile) {
    // Novo perfil - criar e redirecionar para trocar senha
    await supabase.from('profiles').upsert({ ... });
    // redirecionar...
  } else {
    // Perfil existe mas password_changed = false
    // Se conta tem mais de 7 dias, auto-corrigir
    const createdAt = new Date(profile.created_at || 0);
    const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000*60*60*24);
    if (daysSinceCreation > 7) {
      await supabase.from('profiles').update({ password_changed: true }).eq('id', user.id);
      // Continuar login normalmente (não redirecionar)
    } else {
      // Conta recente - redirecionar para trocar senha
    }
  }
}
```

Isso requer adicionar `created_at` ao select do perfil na linha 288.

### 2. Fix no banco — corrigir todos os legados restantes agora

SQL migration para setar `password_changed = true` em todos os perfis com `created_at < '2026-03-12'` que ainda têm `password_changed = false`. Isso cobre os 430 restantes de uma vez.

### Resultado

- Usuários antigos que já sabem a senha vão logar normalmente
- Contas novas (< 7 dias) criadas por webhook ainda passam pelo fluxo de primeiro acesso
- Os 430 perfis legados são corrigidos imediatamente no banco

