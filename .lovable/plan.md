
# Plano: Forçar Atualização do PWA para Todos os Usuários

## Problema Identificado

Existe uma **dessincronização de versões** no código:

| Arquivo | Versão Atual | Deveria Ser |
|---------|--------------|-------------|
| `App.tsx` | 5.3.0 ✅ | - |
| `vite.config.ts` (cacheId) | 5.2.0 ❌ | 5.3.0 |
| `useServiceWorkerUpdate.ts` (currentCacheId) | 5.2.0 ❌ | 5.3.0 |
| `ForceUpdateModal.tsx` (APP_VERSION) | 5.2.0 ❌ | 5.3.0 |

Por causa disso, os caches antigos **não estão sendo invalidados** e os usuários continuam com a versão antiga.

---

## Solução

Sincronizar todas as versões para **5.3.0** nos seguintes arquivos:

### Arquivo 1: `vite.config.ts`

Atualizar o `cacheId` e o cache de imagens:

```typescript
// Linha 57: Atualizar cacheId
cacheId: "arcanoapp-v5.3.0",

// Linha 76: Atualizar cache de imagens
cacheName: "arcanoapp-images-v5.3.0",
```

### Arquivo 2: `src/hooks/useServiceWorkerUpdate.ts`

Atualizar a referência de versão:

```typescript
// Linha 92: Atualizar currentCacheId
const currentCacheId = 'arcanoapp-v5.3.0';
```

### Arquivo 3: `src/components/ForceUpdateModal.tsx`

Atualizar a constante de versão para referência:

```typescript
// Linha 2: Atualizar APP_VERSION
export const APP_VERSION = '5.3.0';
```

---

## Como Funciona a Atualização

Quando o usuário abrir o app após a publicação:

```text
┌─────────────────────────────────────────────────────────────────┐
│ 1. Usuário abre o app                                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Service Worker detecta novo cacheId (v5.3.0)                 │
│    → Configuração "autoUpdate" + "skipWaiting" ativadas         │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. useServiceWorkerUpdate executa cleanOldCaches()              │
│    → Deleta todos os caches que NÃO contêm "arcanoapp-v5.3.0"   │
│    → Isso inclui "arcanoapp-v5.2.0" e anteriores                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Novo Service Worker assume controle (SKIP_WAITING)           │
│    → App carrega arquivos novos do servidor                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## O Que Acontece em Cada Situação

| Situação do Usuário | O Que Acontece |
|---------------------|----------------|
| **App aberto no navegador** | Próximo refresh ou foco = atualização automática |
| **PWA instalado no celular** | Próxima abertura do app = atualização automática |
| **App em segundo plano** | Quando voltar ao primeiro plano = verificação de updates |

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `vite.config.ts` | Atualizar `cacheId` para v5.3.0 |
| `src/hooks/useServiceWorkerUpdate.ts` | Atualizar `currentCacheId` para v5.3.0 |
| `src/components/ForceUpdateModal.tsx` | Atualizar `APP_VERSION` para v5.3.0 |

---

## Resultado Esperado

Após publicar essas mudanças:

1. **Todos os usuários** que abrirem o app receberão a nova versão
2. **Caches antigos** serão deletados automaticamente
3. **Não há modal de bloqueio** - a atualização acontece silenciosamente em background
4. **Parâmetros de marketing preservados** - sem redirecionamentos forçados

A atualização é **gradual** - cada usuário recebe quando abre o app ou quando o app volta do segundo plano.
