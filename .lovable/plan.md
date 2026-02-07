

# Plano: Remover Sistema de Atualização Automática do PWA

## Resumo

Vou **remover completamente** o sistema de atualização automática que força o app a baixar novas versões do Service Worker. Isso inclui:

1. O hook `useServiceWorkerUpdate` (que verifica updates a cada 30 segundos)
2. O componente `UpdateAvailableBanner` (banner que aparece pedindo atualização)
3. Configurações do VitePWA que forçam atualização automática

---

## O Que Será Removido/Modificado

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/hooks/useServiceWorkerUpdate.ts` | **DELETAR** | Hook que verifica updates automaticamente |
| `src/components/UpdateAvailableBanner.tsx` | **DELETAR** | Banner de "Nova versão disponível" |
| `src/App.tsx` | **MODIFICAR** | Remover imports e uso dos componentes acima |
| `vite.config.ts` | **MODIFICAR** | Desativar `skipWaiting` e `clientsClaim` automáticos |

---

## Arquivos que NÃO Serão Afetados

| Arquivo | Motivo |
|---------|--------|
| `src/pages/ForceUpdate.tsx` | Rota manual `/force-update` - **permanece** caso precise forçar manualmente no futuro |
| `public/push-handler.js` | Handler de Push Notifications - **permanece** (não relacionado a updates) |
| `src/hooks/usePushNotifications.ts` | Notificações push - **permanece** (usa SW mas não força update) |
| `src/contexts/AIJobContext.tsx` | Jobs de IA - **permanece** intocado |
| Todas as Edge Functions | **permanecem** intocadas |
| Banco de dados | **permanece** intocado |

---

## Mudanças Detalhadas

### 1. DELETAR: `src/hooks/useServiceWorkerUpdate.ts`

Remover o arquivo inteiro. Este hook é responsável por:
- Verificar updates a cada 30 segundos
- Limpar caches antigos automaticamente
- Enviar `SKIP_WAITING` para forçar novo SW

### 2. DELETAR: `src/components/UpdateAvailableBanner.tsx`

Remover o arquivo inteiro. Este componente:
- Detecta quando há SW waiting
- Mostra banner fixo no topo pedindo atualização
- Força reload automático quando `controllerchange` dispara

### 3. MODIFICAR: `src/App.tsx`

**Remover linhas:**
```tsx
// REMOVER esta linha:
import { UpdateAvailableBanner } from "./components/UpdateAvailableBanner";

// REMOVER esta linha:
import { useServiceWorkerUpdate } from "./hooks/useServiceWorkerUpdate";

// REMOVER este comentário e chamada no AppContent:
// Auto-update Service Worker and clean old caches on each session
useServiceWorkerUpdate();

// REMOVER este componente do JSX:
<UpdateAvailableBanner />
```

### 4. MODIFICAR: `vite.config.ts`

**Mudar de:**
```typescript
workbox: {
  // ...
  clientsClaim: true,
  skipWaiting: true,
  // ...
}
```

**Para:**
```typescript
workbox: {
  // ...
  clientsClaim: false,
  skipWaiting: false,
  // ...
}
```

Isso impede que o novo Service Worker:
- `clientsClaim: false` → Não toma controle das tabs abertas automaticamente
- `skipWaiting: false` → Não pula a fila de waiting automaticamente

---

## O Que Continua Funcionando

| Funcionalidade | Status |
|----------------|--------|
| PWA instalável | ✅ Continua funcionando |
| Cache de assets | ✅ Continua funcionando |
| Push Notifications | ✅ Continua funcionando |
| Ferramentas de IA | ✅ Continua funcionando |
| Jobs em progresso | ✅ Não serão mais interrompidos |
| `/force-update` manual | ✅ Disponível se precisar |
| Offline mode | ✅ Continua funcionando |

---

## Comportamento Após a Mudança

**ANTES:**
- App verificava updates a cada 30 segundos
- Quando detectava nova versão, mostrava banner
- Ao clicar "Atualizar", forçava reload
- Às vezes recarregava sozinho (causando problemas em jobs)

**DEPOIS:**
- App **não verifica** updates automaticamente
- Usuário só recebe nova versão quando:
  1. Fecha TODAS as abas do app e abre novamente
  2. Ou acessa `/force-update` manualmente
  3. Ou limpa cache do navegador manualmente
- Jobs de IA nunca serão interrompidos por updates

---

## Garantias de Segurança

| Item | Status |
|------|--------|
| Edge Functions | ✅ INTOCADAS |
| Webhooks de pagamento | ✅ INTOCADOS |
| Banco de dados | ✅ INTOCADO |
| Push Notifications | ✅ INTOCADO |
| Créditos de IA | ✅ INTOCADO |
| Jobs em andamento | ✅ Protegidos (sem reloads forçados) |

