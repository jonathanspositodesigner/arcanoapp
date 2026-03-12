

# Diagnóstico: 3 Problemas Encontrados no Checkout Teste

## O que funcionou
- O CAPI **enviou o evento com sucesso** para o Facebook: `events_received: 1`
- UTMs foram capturadas corretamente (campanha, ad set, ad — todos presentes na ordem)
- O `event_id` foi gerado e retornado ao frontend

## Problema 1: `meta_capi_logs` insert silencioso falhando
A função `logCapiEvent` usa `supabase.from('meta_capi_logs').insert(...)` mas **não verifica o `{ error }` retornado** — apenas tem um try/catch que nunca dispara porque o SDK do Supabase não lança exceção em erros de insert. Resultado: o log nunca é salvo e o dashboard fica vazio.

**Correção**: Adicionar verificação do `error` retornado pelo insert e logar com `console.warn` para diagnóstico. Também adicionar uma policy de INSERT para `service_role` ou tornar a policy de insert mais permissiva (atualmente referencia o role `authenticated` mas a edge function usa service_role que deveria bypass RLS — vamos adicionar log do erro para confirmar a causa).

## Problema 2: `fbc` deveria ser gerado a partir do `fbclid` (CRÍTICO)
O checkout recebeu `fbp: null` e `fbc: null` porque o usuário veio do **Instagram Stories** (in-app browser), que muitas vezes não tem os cookies `_fbp`/`_fbc`. Porém, o `fbclid` **ESTÁ presente** nos UTMs: `PAZXh0bgNhZW0BMABhZG...`.

O Facebook aceita que o `fbc` seja construído manualmente no formato: `fb.1.{timestamp}.{fbclid}`. Sem isso, o Facebook **não consegue linkar a venda ao clique no anúncio**.

**Correção**: No `create-pagarme-checkout`, se `fbc` vier null mas `utm_data.fbclid` existir, construir o fbc automaticamente: `fbc = "fb.1." + Date.now() + "." + fbclid`. Mesmo para `fbp`, gerar um fallback se null.

## Problema 3: Frontend não gera `fbc` a partir da URL
A função `getMetaCookies()` só lê cookies. Se o cookie `_fbc` não existir (in-app browsers), ela retorna null mesmo quando o `fbclid` está na URL.

**Correção**: Atualizar `getMetaCookies()` para também verificar `fbclid` na URL e gerar `fbc` no formato `fb.1.{timestamp}.{fbclid}` quando o cookie não existir.

---

## Plano de Correções

### A. Fix `getMetaCookies()` — gerar fbc a partir do fbclid na URL
Se `_fbc` cookie não existir, verificar `window.location.search` por `fbclid` e gerar o valor.

### B. Fix `create-pagarme-checkout` — fallback fbc a partir de utm_data.fbclid
Se `fbc` vier null do frontend, construir a partir de `utm_data.fbclid` antes de enviar ao CAPI.

### C. Fix `logCapiEvent` — capturar e logar erro do insert
Mudar de try/catch para verificar `{ data, error }` do insert e logar o erro real.

### D. Verificar RLS da tabela `meta_capi_logs`
A policy INSERT refere o role `authenticated`. Service role deveria bypass, mas por segurança, adicionar política explícita ou confirmar via log.

