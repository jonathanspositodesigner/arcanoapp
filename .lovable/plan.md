

## Bloqueio de Emails Temporarios no Cadastro

### O que sera feito

Criar uma protecao em duas camadas (cliente + servidor) para impedir cadastro com emails temporarios/descartaveis, com excecao do dominio `@tuamaeaquelaursa.com`.

### Camada 1: Validacao no Cliente
**Arquivo:** `src/utils/disposableEmailDomains.ts` (novo)

- Criar um arquivo com uma lista de ~500 dominios de emails temporarios mais conhecidos (baseado na lista oficial do repositorio `disposable-email-domains/disposable-email-domains` no GitHub com 5000+ dominios)
- Incluir dominios populares como: `tempmail.com`, `guerrillamail.com`, `yopmail.com`, `10minutemail.com`, `mailinator.com`, `throwaway.email`, `temp-mail.org`, etc.
- Alem da lista fixa, incluir deteccao por padroes suspeitos (dominios contendo palavras como "tempmail", "throwaway", "disposable", "10minute", "fake", etc.)
- Exportar funcao `isDisposableEmail(email: string): boolean` que verifica o dominio

**Arquivo:** `src/hooks/useUnifiedAuth.ts`

- Na funcao `signup`, antes de chamar `supabase.auth.signUp`, validar o email com `isDisposableEmail()`
- Se for email temporario, exibir toast de erro e bloquear o cadastro
- O dominio `@tuamaeaquelaursa.com` sera excluido da verificacao (allowlist)

### Camada 2: Validacao no Servidor
**Arquivo:** `supabase/functions/send-confirmation-email/index.ts`

- Adicionar a mesma verificacao de email temporario na Edge Function
- Se o email for temporario, retornar erro 400 antes de enviar o email de confirmacao
- Isso garante que mesmo se alguem burlar o frontend, o servidor bloqueia

### Detalhes tecnicos

**Lista de dominios bloqueados** (amostra dos mais relevantes, total ~500):
- Todos os dominios `*minutemail*`, `*tempmail*`, `*guerrilla*`, `*yopmail*`, `*mailinator*`
- Dominios com extensoes suspeitas: `.tk`, `.ml`, `.cf`, `.ga`, `.gq` quando combinados com padroes de email temporario
- Servicos populares: `temp-mail.org`, `throwaway.email`, `guerrillamail.com`, `sharklasers.com`, `grr.la`, `guerrillamailblock.com`, `pokemail.net`, `spam4.me`, `trashmail.com`, `trash-mail.com`, etc.

**Allowlist** (dominios que NUNCA serao bloqueados):
- `tuamaeaquelaursa.com`

**Funcao de validacao:**
```text
isDisposableEmail(email)
  1. Extrair dominio do email
  2. Verificar se esta na allowlist -> se sim, retorna false (permitido)
  3. Verificar se esta na lista de dominios bloqueados -> se sim, retorna true (bloqueado)
  4. Verificar padroes suspeitos no dominio (regex) -> se match, retorna true
  5. Retorna false (permitido)
```

**Arquivos a criar:**
- `src/utils/disposableEmailDomains.ts` - Lista de dominios + funcao de validacao

**Arquivos a alterar:**
- `src/hooks/useUnifiedAuth.ts` - Adicionar validacao antes do signup
- `supabase/functions/send-confirmation-email/index.ts` - Adicionar validacao server-side

