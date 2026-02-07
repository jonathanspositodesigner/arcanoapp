

# Plano: Corrigir Bug de Login "Primeiro Acesso" + Rate Limit

## Diagnóstico

O usuário `contato.herculessantos@gmail.com` está preso em um loop porque:

1. **No banco `profiles`**: `password_changed = false`
2. **Na realidade**: O usuário já tem senha (logou às 15:16 hoje)

### Fluxo Atual (Bug)
1. Usuário digita email
2. Sistema verifica: `password_changed = false` → "primeiro acesso"
3. Tenta login automático com email como senha → FALHA (senha já foi mudada)
4. Tenta enviar link de reset → RATE LIMIT (muitas tentativas em pouco tempo)
5. Mostra erro genérico

### Por Que Isso Acontece
O campo `password_changed` não é atualizado quando:
- O usuário muda a senha via link de reset
- O usuário é criado pelo admin com senha diferente do email

---

## Solução em 3 Partes

### Parte 1: Corrigir Dados Imediatamente (SQL)
Atualizar `password_changed = true` para todos os usuários que:
- Já logaram antes (`last_sign_in_at IS NOT NULL`)
- OU email foi confirmado (`email_confirmed_at IS NOT NULL`)

```sql
UPDATE profiles p
SET password_changed = true
FROM auth.users u
WHERE p.id = u.id
  AND p.password_changed = false
  AND u.last_sign_in_at IS NOT NULL;
```

### Parte 2: Corrigir o Fluxo de Login (Código)
Mudar a lógica do `checkEmail` para:
- Se `password_changed = false` E auto-login falha E link dá rate limit → **Ir para tela de senha normal**
- Mostrar mensagem clara ao invés de chave de tradução

### Parte 3: Adicionar Tradução Faltante
A chave `errors.errorSendingLink` existe no código default, mas precisa estar no arquivo de tradução também para consistência.

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| SQL (via migration) | EXECUTAR | Corrigir dados: `password_changed = true` para usuários existentes |
| `src/hooks/useUnifiedAuth.ts` | MODIFICAR | Se auto-login e link falharem, ir para tela de senha |
| `src/locales/pt/auth.json` | MODIFICAR | Adicionar `errorSendingLink` e `rateLimitWait` |
| `src/locales/es/auth.json` | MODIFICAR | Adicionar traduções em espanhol |

---

## Mudança no Fluxo de Login

### Antes (Bug)
```
Email → password_changed=false → auto-login falha → link falha → ERRO
```

### Depois (Corrigido)
```
Email → password_changed=false → auto-login falha → link falha → Vai para tela de senha normal
```

Se o rate limit acontecer, o usuário pode tentar digitar a senha que ele lembra.

---

## Código: Mudança no useUnifiedAuth.ts

```typescript
// Case 2: First access (no password set) → try auto-login or send link
if (profileExists && !passwordChanged) {
  console.log('[UnifiedAuth] First access flow');
  
  // Try auto-login with email as password
  const { error: autoLoginError } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: normalizedEmail,
  });
  
  if (!autoLoginError) {
    // ... sucesso, redirecionar
  }
  
  // Auto-login failed → try to send password creation link
  console.log('[UnifiedAuth] Auto-login failed, sending link');
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(...);
  
  if (resetError) {
    // NOVO: Se falhou o link (rate limit ou outro erro), 
    // deixar o usuário tentar com a senha que ele lembra
    console.log('[UnifiedAuth] Reset failed, going to password step');
    
    // Mostrar mensagem apropriada
    if (resetError.message?.includes('429') || resetError.status === 429) {
      toast.info('Link bloqueado temporariamente. Digite sua senha.');
    } else {
      toast.info('Problema ao enviar link. Tente com sua senha.');
    }
    
    // Ir para tela de senha ao invés de travar
    setState(prev => ({
      ...prev,
      step: 'password',
      verifiedEmail: normalizedEmail,
      isLoading: false,
    }));
    return;
  }
  
  // Link enviado com sucesso
  // ...
}
```

---

## Correção de Dados (SQL)

```sql
-- Corrigir TODOS os usuários que já logaram mas têm password_changed=false
UPDATE profiles p
SET password_changed = true, updated_at = NOW()
FROM auth.users u
WHERE p.id = u.id
  AND p.password_changed = false
  AND (u.last_sign_in_at IS NOT NULL OR u.email_confirmed_at IS NOT NULL);
```

---

## Traduções a Adicionar

### Português (`src/locales/pt/auth.json`)

```json
"errors": {
  "errorSendingLink": "Erro ao enviar link. Tente novamente.",
  "rateLimitWait": "Muitas tentativas. Aguarde alguns segundos.",
  "tryWithPassword": "Problema ao enviar link. Tente com sua senha."
}
```

### Espanhol (`src/locales/es/auth.json`)

```json
"errors": {
  "errorSendingLink": "Error al enviar enlace. Inténtalo de nuevo.",
  "rateLimitWait": "Demasiados intentos. Espera unos segundos.",
  "tryWithPassword": "Problema al enviar enlace. Intenta con tu contraseña."
}
```

---

## Resumo

1. **Correção imediata**: SQL para marcar `password_changed = true` em usuários que já logaram
2. **Correção de fluxo**: Se link falhar, ir para tela de senha (fallback)
3. **Traduções**: Adicionar mensagens claras para rate limit

