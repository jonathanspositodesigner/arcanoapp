

# Correção: Erro Prematuro na UI do Upscaler

## Problema Identificado

O hook `useJobReconciliation` está chamando o endpoint `/reconcile-task` a cada 15 segundos enquanto o job está "processing". Se a consulta ao RunningHub falhar (por qualquer motivo - rate limit, rede, etc), o callback `onReconciled` dispara com status FAILED ou UNKNOWN, e a UI mostra erro mesmo que a task esteja rodando normalmente no RunningHub.

## Solução

Remover completamente a lógica que exibe erro no frontend baseada no resultado do polling. O único responsável por mostrar SUCCESS ou FAILED será:

1. **Webhook** (via Realtime) - resposta oficial do RunningHub
2. **Timeout de 10 minutos** - se o webhook não chegar em 10 minutos, exibir mensagem de timeout (não erro da API)

O polling continuará existindo apenas para **atualizar silenciosamente** o banco quando o RunningHub confirmar SUCCESS/FAILED. Erros de consulta ou status UNKNOWN nunca serão propagados para a UI.

## Mudanças

### 1. `src/hooks/useJobReconciliation.ts`
- Remover o callback `onReconciled` (ou torná-lo opcional e silencioso)
- O polling agora só serve como "self-healing" do banco, não dispara mudanças na UI
- Manter o console.log para debug

### 2. `src/pages/UpscalerArcanoTool.tsx`
- **Remover** o callback `onReconciled` que seta `setStatus('error')` 
- **Adicionar** timer de 10 minutos para timeout (usando `useEffect` + `setTimeout`)
- Quando timeout ocorrer: mostrar mensagem "Tempo excedido. Tente novamente." (não "RunningHub API error")
- Adicionar lock síncrono (`processingRef`) para prevenir chamadas duplicadas

### 3. `src/pages/VideoUpscalerTool.tsx`
- Mesma correção: remover `onReconciled` que dispara erro na UI
- Adicionar timer de timeout

### 4. `src/pages/PoseChangerTool.tsx`
- Mesma correção

### 5. `src/pages/VesteAITool.tsx`
- Mesma correção

## Lógica do Timeout (10 minutos)

```typescript
// Quando job entra em "processing":
const timeoutRef = useRef<number | null>(null);

useEffect(() => {
  if (status === 'processing') {
    // Iniciar timer de 10 minutos
    timeoutRef.current = window.setTimeout(() => {
      setStatus('error');
      setLastError({
        message: 'Tempo limite excedido',
        code: 'TIMEOUT',
        solution: 'A operação demorou mais de 10 minutos. Tente novamente.'
      });
    }, 10 * 60 * 1000); // 10 minutos
  }
  
  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };
}, [status]);

// Limpar timeout quando job completar/falhar via Realtime
```

## Fluxo Final

```
1. Usuário clica "Aumentar Qualidade"
   └── processingRef.current = true (previne duplicação)
   └── Upload + Criar job no banco
   └── Chamar Edge Function
   └── status = 'processing'
   └── Iniciar timer de 10 minutos

2. Enquanto processando:
   └── Polling silencioso a cada 15s (não exibe nada na UI)
   └── Se Realtime receber 'completed' → mostrar resultado
   └── Se Realtime receber 'failed' → mostrar erro do RunningHub
   └── Se timer expirar (10 min) → mostrar timeout

3. Quando terminar:
   └── processingRef.current = false
   └── Cancelar timer
```

## Resultado Esperado

- **Nunca mais** aparece "RunningHub API error" durante processamento normal
- Erro só aparece se:
  - Webhook trouxer FAILED (erro real do RunningHub)
  - Timeout de 10 minutos (algo travou de verdade)
- Tasks duplicadas prevenidas via `processingRef`

