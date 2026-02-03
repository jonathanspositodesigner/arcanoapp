

## Problema

Quando você clica UMA vez no botão "Gerar Pose", a função `handleProcess` é chamada DUAS vezes, criando 2 jobs e gastando 2x créditos.

Isso acontece porque:
1. `setStatus('uploading')` é chamado na linha 280
2. Mas o React atualiza o estado de forma **assíncrona** (não instantânea)
3. Durante esses milissegundos, se houver um segundo evento de clique (duplo clique acidental, ou re-render), a condição `isProcessing` ainda é `false`
4. A segunda chamada passa e executa tudo de novo

---

## Solução

Adicionar um **flag síncrono** com `useRef` que bloqueia imediatamente qualquer chamada duplicada do **mesmo usuário no mesmo navegador**.

**IMPORTANTE:** Isso NÃO afeta outros usuários! Cada navegador tem sua própria instância do React. O sistema de fila de 3 simultâneos no backend continua funcionando normalmente.

---

## Alterações técnicas

**Arquivo:** `src/pages/PoseChangerTool.tsx`

1. **Adicionar ref para bloqueio síncrono** (linha ~54):
```typescript
const processingRef = useRef(false);
```

2. **No início de `handleProcess` (linha 262), adicionar verificação imediata:**
```typescript
const handleProcess = async () => {
  // CRITICAL: Prevent duplicate calls (sync check)
  if (processingRef.current) {
    console.log('[PoseChanger] Already processing, ignoring duplicate call');
    return;
  }
  processingRef.current = true;

  // ... resto do código existente ...
```

3. **No catch de erro (linha 374), liberar o flag:**
```typescript
} catch (error: any) {
  console.error('[PoseChanger] Process error:', error);
  setStatus('error');
  toast.error(error.message || 'Erro ao processar imagem');
  processingRef.current = false; // LIBERA O FLAG
}
```

4. **No `handleReset` (linha 399), também liberar:**
```typescript
const handleReset = () => {
  processingRef.current = false; // LIBERA O FLAG
  setPersonImage(null);
  // ... resto ...
```

5. **Quando o job completa com sucesso ou erro via realtime, liberar o flag** (no callback de `subscribeToJobUpdates`)

---

## Por que funciona

| Tipo de operação | `useState` | `useRef` |
|-----------------|------------|----------|
| Atualização | Assíncrona (próximo render) | **Síncrona (imediata)** |
| Acessível no mesmo tick | Não | **Sim** |

Ao usar `processingRef.current = true` ANTES de qualquer `await`, bloqueamos qualquer chamada duplicada no mesmo milissegundo.

---

## Diagrama do fluxo

```text
Clique 1                          Clique 2 (acidental)
   │                                   │
   ▼                                   ▼
processingRef.current = false?    processingRef.current = true?
   │                                   │
   ▼                                   ▼
   SIM → processingRef = true         SIM → RETURN (bloqueado)
   │
   ▼
 await criar job...
 await upload...
 await edge function...
   │
   ▼
 (continua normalmente)
```

---

## Resultado

- 1 clique = 1 job = 1 cobrança de créditos
- Múltiplos usuários continuam funcionando em paralelo (cada um com seu próprio `processingRef`)
- Sistema de fila de 3 simultâneos no backend não é afetado

