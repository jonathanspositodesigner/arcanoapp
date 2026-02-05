
# Auto-Cancelamento de Jobs Travados + Modal Melhorado

## Resumo

Implementar duas melhorias no sistema unificado de ferramentas de IA:

1. **Auto-cancelamento**: Jobs com status "running" há mais de 10 minutos são automaticamente cancelados (no servidor)
2. **Modal melhorado**: Quando usuário tenta iniciar novo job tendo outro ativo, mostrar detalhes do job ativo com opção de cancelar

---

## Mudanças

### 1. Backend: `runninghub-queue-manager/index.ts`

Adicionar endpoint `/force-cancel-job` que cancela qualquer job (running ou queued) do usuário:

```typescript
// Novo endpoint para forçar cancelamento de job running
async function handleForceCancelJob(req: Request): Promise<Response> {
  const { table, jobId, userId } = await req.json();
  
  // Permite cancelar jobs running (não só queued)
  // 1. Atualiza status para 'cancelled'
  // 2. Devolve créditos
  // 3. Atualiza fila
}
```

Também aumentar o threshold de reconciliação de 8 para 10 minutos para alinhar com o timeout do frontend.

### 2. Frontend: `useActiveJobCheck.ts`

Adicionar função `forceCancel` para cancelar qualquer job:

```typescript
interface ActiveJobResult {
  hasActiveJob: boolean;
  activeTool: string | null;
  activeTable?: string;
  activeJobId?: string;
  activeStatus?: string;
  createdAt?: string;
  startedAt?: string;  // NOVO - para mostrar há quanto tempo está rodando
}

const forceCancelJob = async (table: string, jobId: string, userId: string): Promise<boolean> => {
  // Chama /force-cancel-job
}
```

### 3. Frontend: `ActiveJobBlockModal.tsx`

Redesenhar o modal para mostrar informações do job ativo e permitir cancelamento:

```text
┌─────────────────────────────────────────────────┐
│ ⚠️ Trabalho em Andamento                        │
├─────────────────────────────────────────────────┤
│                                                 │
│  Você tem um trabalho ativo:                    │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ 🎨 Upscaler Arcano                        │  │
│  │ Status: Processando...                    │  │
│  │ Iniciado há: 3 minutos                    │  │
│  │                                           │  │
│  │ [🗑️ Cancelar Este Trabalho]              │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  Você só pode ter um trabalho por vez.          │
│                                                 │
│              [Entendi]                          │
└─────────────────────────────────────────────────┘
```

Props adicionais:
- `activeJobId: string`
- `activeTable: string`
- `startedAt?: string`
- `onJobCancelled?: () => void`

### 4. Frontend: `useAIToolProcessor.ts`

Adicionar os novos campos ao retorno do hook para alimentar o modal:

```typescript
// Novos estados
const [activeJobId, setActiveJobId] = useState('');
const [activeTable, setActiveTable] = useState('');
const [activeStartedAt, setActiveStartedAt] = useState<string | undefined>();

// No checkActiveJob:
if (hasActiveJob && activeTool) {
  setActiveToolName(activeTool);
  setActiveJobStatus(activeStatus || '');
  setActiveJobId(result.activeJobId || '');
  setActiveTable(result.activeTable || '');
  setActiveStartedAt(result.startedAt);
  setShowActiveJobModal(true);
}

// Retorno adicional
return {
  // ... existing
  activeJobId,
  activeTable,
  activeStartedAt,
};
```

### 5. Tipos: `src/types/ai-tools.ts`

Adicionar novos campos ao tipo de retorno:

```typescript
interface UseAIToolProcessorReturn {
  // ... existing
  activeJobId: string;
  activeTable: string;
  activeStartedAt?: string;
}
```

---

## Fluxo de Cancelamento

```text
Usuário clica "Cancelar Este Trabalho"
    │
    ├── Frontend chama forceCancelJob(table, jobId, userId)
    │
    ├── Backend /force-cancel-job:
    │       ├── Atualiza job para status='cancelled'
    │       ├── Devolve créditos via refund_upscaler_credits
    │       └── Atualiza posições da fila
    │
    ├── Realtime: job atualizado dispara evento
    │       └── Se tinha outra aba aberta, ela vê o cancelamento
    │
    └── Modal fecha + callback onJobCancelled()
            └── Usuário pode tentar novamente
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/runninghub-queue-manager/index.ts` | Novo endpoint `/force-cancel-job` + threshold 10min |
| `src/hooks/useActiveJobCheck.ts` | Adicionar `forceCancelJob()` + campos extras no retorno |
| `src/hooks/useAIToolProcessor.ts` | Armazenar e expor dados do job ativo |
| `src/types/ai-tools.ts` | Novos campos no tipo de retorno |
| `src/components/ai-tools/ActiveJobBlockModal.tsx` | Redesenhar com detalhes do job + botão cancelar |

---

## Resultado Esperado

1. **Jobs travados**: Se ficar 10+ min em "running" sem resposta do RunningHub, o watchdog no servidor cancela automaticamente e devolve créditos

2. **Modal informativo**: Usuário vê exatamente qual job está ativo, há quanto tempo, e pode cancelar direto do modal

3. **Uma única fonte de verdade**: Toda essa lógica fica centralizada no hook unificado e edge function, não precisa duplicar em cada ferramenta
