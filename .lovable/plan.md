
## Resumo
Implementar **mensagem amigável para erros do servidor** (RunningHub) + **investigar por que os jobs do Vinny não aparecem no painel**.

---

## Diagnóstico dos Jobs do vinnynunesrio@gmail.com

| Job ID | Task ID | Status | Error | Créditos |
|--------|---------|--------|-------|----------|
| `52cb9d66-3f2b...` | 2020619404211003393 | `failed` | `工作流运行失败` | 60 (refunded: true) |
| `fa49805e-c52c...` | 2020619972786659330 | `running` | null | 60 (refunded: false) |

**Problema identificado:**
1. O primeiro job falhou com erro chinês `工作流运行失败` = "Workflow execution failed" - este é um erro da RunningHub quando o workflow do ComfyUI falha
2. O segundo job está travado em `running` sem webhook - provavelmente será limpo pelo cleanup automático

**Por que não aparecem no painel:** Os jobs DEVEM aparecer, pois têm `user_id` válido. Se não aparecem, pode ser:
- Filtro de data incorreto (verificar se está olhando "Últimos 7 dias")
- Cache do frontend

---

## O que Será Implementado

### 1. Mensagem Amigável para Erros da RunningHub

Vou criar uma função helper que traduz erros técnicos/chineses em mensagens amigáveis para o usuário:

**Arquivo:** `src/utils/errorMessages.ts`

```typescript
export function getAIErrorMessage(errorMessage: string | null): {
  message: string;
  solution: string;
} {
  // Erro chinês da RunningHub = "Workflow execution failed"
  if (errorMessage?.includes('工作流运行失败') || errorMessage?.includes('workflow')) {
    return {
      message: 'Servidor temporariamente indisponível',
      solution: 'Aguarde 5 minutos e tente novamente. Se persistir, use uma imagem diferente.'
    };
  }
  
  // Erros de timeout
  if (errorMessage?.includes('timeout') || errorMessage?.includes('timed out')) {
    return {
      message: 'Processamento demorou muito',
      solution: 'Tente novamente com uma imagem menor ou aguarde alguns minutos.'
    };
  }
  
  // Erros de VRAM/memória
  if (errorMessage?.includes('VRAM') || errorMessage?.includes('memory') || errorMessage?.includes('OOM')) {
    return {
      message: 'Imagem muito complexa',
      solution: 'Use uma imagem menor ou reduza a resolução de saída.'
    };
  }
  
  // Sem output (webhook sem resultado)
  if (errorMessage?.includes('No output')) {
    return {
      message: 'Processamento não retornou resultado',
      solution: 'Aguarde 5 minutos e tente novamente.'
    };
  }
  
  // Erro genérico
  return {
    message: errorMessage || 'Erro no processamento',
    solution: 'Tente novamente ou use uma imagem diferente.'
  };
}
```

### 2. Integrar nas Ferramentas

**Arquivos a modificar:**
- `src/pages/UpscalerArcanoTool.tsx`
- `src/pages/PoseChangerTool.tsx`
- `src/pages/ArcanoClonerTool.tsx`
- `src/pages/VesteAITool.tsx` (se existir)

Em cada ferramenta, no callback `onStatusChange` quando `status === 'failed'`:

```typescript
// ANTES
setLastError({
  message: update.errorMessage || 'Processing failed',
  code: 'TASK_FAILED',
  solution: 'Tente novamente com uma imagem diferente.'
});

// DEPOIS
import { getAIErrorMessage } from '@/utils/errorMessages';

const friendlyError = getAIErrorMessage(update.errorMessage);
setLastError({
  message: friendlyError.message,
  code: 'TASK_FAILED',
  solution: friendlyError.solution
});
```

---

## Arquivos a Serem Criados/Modificados

| Arquivo | Ação |
|---------|------|
| `src/utils/errorMessages.ts` | **Criar** - Função helper de tradução de erros |
| `src/pages/UpscalerArcanoTool.tsx` | **Modificar** - Usar mensagem amigável |
| `src/pages/PoseChangerTool.tsx` | **Modificar** - Usar mensagem amigável |
| `src/pages/ArcanoClonerTool.tsx` | **Modificar** - Usar mensagem amigável |
| `src/pages/VesteAITool.tsx` | **Modificar** (se existir) |

---

## Sobre os Jobs do Vinny

Os jobs ESTÃO no banco de dados e DEVEM aparecer na RPC. Recomendo:

1. **Atualizar a página do painel** (F5)
2. **Verificar filtro de data** - Colocar "Hoje" ou "Todo período"
3. **Buscar por email** - Digitar "vinnynunesrio" no campo de busca

Se ainda não aparecer, pode ser necessário verificar a RPC `get_ai_tools_usage` para garantir que está consolidando corretamente.

---

## Preview da Mensagem de Erro no Frontend

**ANTES:**
```
❌ 工作流运行失败
💡 Tente novamente com uma imagem diferente ou configurações menores.
```

**DEPOIS:**
```
❌ Servidor temporariamente indisponível
💡 Aguarde 5 minutos e tente novamente. Se persistir, use uma imagem diferente.
```
