

## Implementar sistema robusto de Force Update para PWA (iOS-safe)

### Problema atual

O PWA no iPhone fica preso no cache antigo. O sistema atual usa `registerType: "autoUpdate"` que tenta atualizar o SW automaticamente em background, mas no iOS isso nao funciona de forma confiavel. Alem disso, o `skipWaiting: false` esta correto (nao queremos ativar SW novo automaticamente), mas falta o mecanismo correto de controle manual pelo usuario.

### Arquitetura da solucao

O sistema tera 3 camadas independentes que se complementam:

```text
CAMADA 1: Botao "Atualizar App" (usuario)
  forcePwaUpdate() -> reg.update() -> SKIP_WAITING -> controllerchange -> reload

CAMADA 2: Update Global (admin)
  Admin clica botao -> edge function pwa-version -> app detecta versao diferente -> banner

CAMADA 3: Headers corretos (iOS cache)
  index.html e sw.js = no-cache | assets com hash = immutable
```

### Mudancas detalhadas

#### 1. Headers - `public/_headers`

Adicionar regras para `index.html` e `sw.js` nunca ficarem em cache agressivo:

```text
/index.html
  Cache-Control: no-cache, no-store, must-revalidate

/sw.js
  Cache-Control: no-cache, must-revalidate

/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

Isso resolve o problema raiz no iOS: o browser sempre revalida `index.html` e `sw.js`.

#### 2. Vite config - `vite.config.ts`

- Manter `skipWaiting: false` (controle manual, como pedido)
- Manter `clientsClaim: true`
- Manter `registerType: "autoUpdate"` (apenas detecta SW novo, nao forca)

Nenhuma mudanca necessaria aqui - a config atual ja esta correta para o fluxo desejado.

#### 3. Funcao `forcePwaUpdate()` - novo arquivo `src/utils/forcePwaUpdate.ts`

Criar funcao reutilizavel que faz exatamente o que foi pedido:

```text
a) navigator.serviceWorker.getRegistration() + reg.update()
b) Se existir reg.waiting -> postMessage({type: "SKIP_WAITING"})
c) Escutar controllerchange -> reload com cache-buster ?v=timestamp
d) Se nao tiver SW -> reload simples com cache-buster
```

Retorna callbacks para UX: `onStatus('checking' | 'updating' | 'reloading' | 'no-update')`.

#### 4. Service Worker - `public/push-handler.js`

Ja tem o listener `SKIP_WAITING` (linha 5-9) e o SW do Workbox ja faz `clients.claim()` no activate. Nenhuma mudanca necessaria.

#### 5. Edge Function - `supabase/functions/pwa-version/index.ts`

Nova edge function publica (sem JWT) que:
- Busca `pwa_version` da tabela `app_settings`
- Retorna `{ version: "valor" }` com `Cache-Control: no-store`

Usar a tabela `app_settings` existente com uma nova row `id = 'pwa_version'`.

#### 6. Adicionar row no banco

Inserir na tabela `app_settings`:
```text
id: 'pwa_version'
value: { version: '2026-02-12-001' }
```

#### 7. Atualizar `ForceUpdateModal.tsx`

Reescrever para usar a edge function `pwa-version` ao inves de buscar direto do Supabase:
- No boot, chamar a edge function (fetch simples, sem SDK)
- Comparar resposta com `localStorage.getItem('pwa_version')`
- Se diferente: mostrar banner "Atualizacao disponivel" com botao que chama `forcePwaUpdate()`
- Quando usuario clica: salvar versao no localStorage, chamar `forcePwaUpdate()`

#### 8. Atualizar `UpdateAvailableModal.tsx`

- Receber a funcao `forcePwaUpdate()` como handler ao inves de fazer a logica pesada internamente
- O `performUpdate` vai:
  1. Salvar `pwa_version` no localStorage
  2. Chamar `forcePwaUpdate()`
- Remover a logica de limpar TODO o localStorage/caches (isso causa logout desnecessario)

#### 9. AdminHub - botao "Publicar Update Global"

Atualizar `handleForceUpdate` no `AdminHub.tsx`:
- Em vez de alterar `app_version`, alterar `pwa_version` com um novo valor incrementado
- Formato: `YYYY-MM-DD-NNN` (ex: `2026-02-12-002`)

#### 10. Config.toml

Adicionar entrada para a nova edge function:
```toml
[functions.pwa-version]
verify_jwt = false
```

### Arquivos alterados

1. **`public/_headers`** - Headers para index.html e sw.js (no-cache)
2. **`src/utils/forcePwaUpdate.ts`** - Novo: funcao JS reutilizavel
3. **`supabase/functions/pwa-version/index.ts`** - Novo: edge function publica
4. **`supabase/config.toml`** - Adicionar pwa-version
5. **`src/components/ForceUpdateModal.tsx`** - Reescrever com nova logica
6. **`src/components/UpdateAvailableModal.tsx`** - Simplificar, usar forcePwaUpdate()
7. **`src/pages/AdminHub.tsx`** - Botao atualiza pwa_version
8. **Banco (insert)** - Row pwa_version na app_settings

### O que NAO muda

- `vite.config.ts` (config ja esta correta)
- `public/push-handler.js` (ja tem SKIP_WAITING listener)
- `src/pages/ForceUpdate.tsx` (pagina de fallback, continua existindo)
- `src/main.tsx` (sem controllerchange global - so no clique do usuario)
- Nenhuma outra edge function
- Nenhuma migration de schema

