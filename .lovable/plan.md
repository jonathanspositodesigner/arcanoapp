

## Resumo
Corrigir o bug onde a UI do Upscaler fica travada em "processando" quando um job falha. O problema é que falta chamar `endSubmit()` no handler de falha.

---

## Problema identificado

O código do `UpscalerArcanoTool.tsx` (linhas 315-325) não chama `endSubmit()` quando recebe `status === 'failed'`:

```typescript
// CÓDIGO ATUAL (com bug):
} else if (update.status === 'failed') {
  console.log('[Upscaler] Job failed:', update.errorMessage);
  setStatus('error');
  const friendlyError = getAIErrorMessage(update.errorMessage);
  setLastError({
    message: friendlyError.message,
    code: 'TASK_FAILED',
    solution: friendlyError.solution
  });
  setIsWaitingInQueue(false);
  toast.error(friendlyError.message);
  // ❌ FALTA: endSubmit() - botão fica travado!
}
```

Todas as outras ferramentas (VesteAI, PoseChanger, ArcanoCloner, VideoUpscaler) chamam `endSubmit()` corretamente.

---

## Correção

Adicionar `endSubmit()` no bloco de falha do `onStatusChange`:

```typescript
// CÓDIGO CORRIGIDO:
} else if (update.status === 'failed') {
  console.log('[Upscaler] Job failed:', update.errorMessage);
  setStatus('error');
  const friendlyError = getAIErrorMessage(update.errorMessage);
  setLastError({
    message: friendlyError.message,
    code: 'TASK_FAILED',
    solution: friendlyError.solution
  });
  setIsWaitingInQueue(false);
  toast.error(friendlyError.message);
  endSubmit(); // ✅ ADICIONAR: libera o botão
}
```

---

## Arquivo alterado

| Arquivo | Mudança |
|---------|---------|
| `src/pages/UpscalerArcanoTool.tsx` | Adicionar `endSubmit()` no bloco `update.status === 'failed'` (linha ~325) |

---

## Resultado esperado

Quando um job falha (seja por erro do RunningHub, timeout, ou qualquer outra razão):
1. ✅ Status muda para "error" (já funciona)
2. ✅ Mensagem de erro aparece (já funciona)
3. ✅ Toast de erro é mostrado (já funciona)
4. ✅ **NOVO:** Botão é liberado para nova tentativa
5. ✅ **NOVO:** Usuário não fica preso em "processando"

