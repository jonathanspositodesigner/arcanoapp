

## Correção do Sistema de Indicação - Os créditos não estão sendo processados

### Problema encontrado

Testei no banco de dados e confirmei: **nenhum referral foi processado**. A tabela `referrals` está vazia. O código de referência do `jonathan.lifecazy@gmail.com` existe (código `35200ef7`), mas quando alguém se cadastra, os créditos não são distribuídos.

### Causa raiz

Existem **dois problemas** no fluxo atual:

1. **O código não captura o `error` da RPC**: Na linha que chama `process_referral`, o código faz `const { data: refResult }` mas ignora o campo `error`. Se a chamada falha, ninguém fica sabendo.

2. **Problema de sessão após signup**: Quando o email requer confirmação (como é o caso), o `signUp` retorna o `user` mas **não cria uma sessão autenticada completa**. Embora a RPC seja `SECURITY DEFINER` (deveria funcionar sem auth), o cliente Supabase pode estar enviando a chamada com um token inválido/incompleto, causando rejeição antes de chegar na função.

3. **O `referral_code` pode não estar no localStorage**: Se o usuário abriu o link em um navegador/aba e depois se cadastrou de outra forma, o código se perde.

### Solução

#### 1. Adicionar logs e tratamento de erro robusto no `process_referral`
**Arquivo:** `src/hooks/useUnifiedAuth.ts`

- Capturar e logar tanto `data` quanto `error` da chamada RPC
- Adicionar `console.log` antes da chamada para confirmar que o referral code existe no localStorage
- NÃO remover o `referral_code` do localStorage se houver erro (para poder tentar novamente)

#### 2. Também capturar `?ref=` no HomeAuthModal
**Arquivo:** `src/components/HomeAuthModal.tsx`

- Adicionar `useEffect` para capturar `?ref=` da URL, garantindo que funcione mesmo se o modal abrir diretamente

#### 3. Tentar processar referral também no login (após confirmação de email)
**Arquivo:** `src/hooks/useUnifiedAuth.ts`

- Quando o usuário faz login pela primeira vez (após confirmar email), verificar se tem `referral_code` no localStorage e processar
- Isso resolve o caso onde o signup não conseguiu processar porque não tinha sessão

### Detalhes técnicos

```text
Fluxo corrigido:

1. Usuario abre link ?ref=35200ef7
2. Index.tsx salva "35200ef7" no localStorage
3. Usuario se cadastra (signup)
4. Tenta process_referral -> se falhar, MANTÉM no localStorage
5. Usuario confirma email e faz login
6. No login, verifica localStorage -> encontra referral_code -> processa novamente
7. Creditos distribuidos: 300 para novo, 150 para indicador
```

**Arquivos a alterar:**
- `src/hooks/useUnifiedAuth.ts` - Melhorar tratamento de erro + processar referral no login
- `src/components/HomeAuthModal.tsx` - Capturar `?ref=` da URL
