

## Bloquear criacao de multiplas contas por dispositivo

### Problema
Usuarios podem criar varias contas no mesmo dispositivo para ganhar 300 creditos gratis repetidamente.

### Solucao

Usar o sistema de device fingerprint que ja existe no projeto (`src/lib/deviceFingerprint.ts`) para rastrear dispositivos no momento do signup. Antes de criar a conta, verificamos se aquele dispositivo ja criou alguma conta antes.

### Mudancas

#### 1. Nova tabela: `device_signups`

Registra qual fingerprint criou qual conta:

```text
device_signups
- id (uuid, PK)
- device_fingerprint (text, indexed)
- user_id (uuid)
- created_at (timestamptz)
```

#### 2. Nova funcao RPC: `check_device_signup_limit`

- Recebe o fingerprint do dispositivo
- Retorna se o dispositivo ja foi usado para criar conta
- SECURITY DEFINER para bypassar RLS

#### 3. Alteracao no signup (`src/hooks/useUnifiedAuth.ts`)

No inicio da funcao `signup`:
- Pega o fingerprint do dispositivo usando `getDeviceFingerprint()` (ja existe)
- Chama a RPC `check_device_signup_limit` para verificar se ja existe conta nesse dispositivo
- Se ja existir, mostra toast de erro: "Este dispositivo ja possui uma conta cadastrada. Use sua conta existente."
- Se nao existir, prossegue com o signup normalmente

Apos o signup ser bem sucedido (depois de criar o profile):
- Registra o fingerprint na tabela `device_signups`

#### 4. Adaptacao do fingerprint

O fingerprint atual usa a key `admin_device_fp` no localStorage (pois era so para admin 2FA). Vamos criar uma funcao separada `getSignupDeviceFingerprint()` que usa uma key diferente (`signup_device_fp`) para nao conflitar. A logica de geracao sera a mesma.

### Limitacoes conhecidas

- O fingerprint e armazenado no localStorage, entao limpar os dados do navegador permite bypass
- Usar navegadores diferentes no mesmo dispositivo gera fingerprints diferentes
- Nao e 100% a prova de fraude, mas cria uma barreira significativa para a maioria dos usuarios casuais
- Para maior seguranca, o fingerprint tambem e baseado em screen resolution, timezone, user agent e idioma, o que dificulta o bypass mesmo limpando localStorage

### Arquivos afetados

- Nova migration SQL (tabela + RPC)
- `src/hooks/useUnifiedAuth.ts` (verificacao no signup)
- `src/lib/deviceFingerprint.ts` (nova funcao para signup fingerprint)

