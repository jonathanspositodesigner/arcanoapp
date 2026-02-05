

# Plano: Melhorar Modal "Trabalho em Andamento" com Detalhes e Opção de Cancelar

## Situação Atual

O modal atual apenas mostra uma mensagem genérica indicando que há um trabalho em andamento, sem detalhes do job nem opção de cancelar.

## Objetivo

Transformar o modal para:
1. Mostrar detalhes do job ativo (ferramenta, status, ID)
2. Permitir que o usuário **cancele o trabalho** e receba os créditos de volta

---

## Mudanças Técnicas

### Parte 1: Nova Função SQL para Cancelamento pelo Usuário

Criar `user_cancel_ai_job()` - similar à `admin_cancel_job()` mas verifica se o job pertence ao usuário autenticado:

```sql
CREATE OR REPLACE FUNCTION public.user_cancel_ai_job(
  p_table_name TEXT,
  p_job_id UUID
)
RETURNS TABLE(success BOOLEAN, refunded_amount INTEGER, error_message TEXT)
-- Verifica auth.uid() == job.user_id
-- Estorna créditos via refund_upscaler_credits()
-- Atualiza status para 'cancelled'
```

### Parte 2: Novo Endpoint no Queue Manager

Adicionar endpoint `/user-cancel-job` em `runninghub-queue-manager`:

| Campo | Descrição |
|-------|-----------|
| **Input** | `{ table: string, jobId: string }` |
| **Autenticação** | Token do usuário (Bearer) |
| **Validação** | Job deve pertencer ao usuário autenticado |
| **Output** | `{ success, refunded_amount, error_message }` |

### Parte 3: Atualizar Hook `useActiveJobCheck`

Adicionar função `cancelActiveJob()`:

```typescript
// src/hooks/useActiveJobCheck.ts

const cancelActiveJob = async (toolName: string, jobId: string) => {
  const session = await supabase.auth.getSession();
  const tableName = getTableName(toolName); // 'upscaler_jobs', etc.
  
  const response = await fetch(
    `.../runninghub-queue-manager/user-cancel-job`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ table: tableName, jobId }),
    }
  );
  
  return await response.json();
};
```

### Parte 4: Atualizar `ActiveJobBlockModal.tsx`

Transformar o modal para mostrar detalhes e botão de cancelar:

| Elemento | Antes | Depois |
|----------|-------|--------|
| **Status** | Não mostrava | "Processando" ou "Na Fila" |
| **Botão Cancelar** | Não existia | Botão vermelho "Cancelar Trabalho" |
| **Feedback** | Apenas "Entendi" | Toast de sucesso com créditos devolvidos |

```text
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ Trabalho em Andamento                                       │
│                                                                 │
│  Você já tem um trabalho em processamento no Upscaler Arcano.   │
│                                                                 │
│  Status atual: **Processando**                                  │
│                                                                 │
│  Aguarde a conclusão ou cancele para iniciar outro.             │
│                                                                 │
│                    [Entendi]  [🗑️ Cancelar Trabalho]            │
└─────────────────────────────────────────────────────────────────┘
```

### Parte 5: Atualizar Páginas de Ferramentas

Passar os novos props para o modal em todas as páginas:
- `UpscalerArcanoTool.tsx`
- `PoseChangerTool.tsx`
- `VesteAITool.tsx`
- `VideoUpscalerTool.tsx`

```tsx
<ActiveJobBlockModal
  isOpen={showActiveJobModal}
  onClose={() => setShowActiveJobModal(false)}
  activeTool={activeToolName}
  activeJobId={activeJobId}       // NOVO
  activeStatus={activeJobStatus}  // NOVO
  onCancelJob={cancelActiveJob}   // NOVO
/>
```

---

## Fluxo de Cancelamento pelo Usuário

```text
┌─────────────────────────────────────────────────────────────────┐
│ 1. Modal mostra: "Trabalho em Andamento - Upscaler Arcano"      │
│    Status: Processando                                          │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼ Usuário clica "Cancelar Trabalho"
┌─────────────────────────────────────────────────────────────────┐
│ 2. Frontend chama user-cancel-job                               │
│    { table: "upscaler_jobs", jobId: "abc123" }                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. SQL Function user_cancel_ai_job:                             │
│    → Verifica auth.uid() == job.user_id ✅                      │
│    → Estorna 60 créditos via refund_upscaler_credits()          │
│    → Atualiza status = 'cancelled'                              │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Toast: "✅ 60 créditos estornados!"                          │
│    Modal fecha, usuário pode iniciar novo trabalho              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| **Nova migração SQL** | CRIAR - Função `user_cancel_ai_job()` |
| `supabase/functions/runninghub-queue-manager/index.ts` | MODIFICAR - Adicionar endpoint `/user-cancel-job` |
| `src/hooks/useActiveJobCheck.ts` | MODIFICAR - Adicionar `cancelActiveJob()` |
| `src/components/ai-tools/ActiveJobBlockModal.tsx` | MODIFICAR - Adicionar detalhes e botão cancelar |
| `src/pages/UpscalerArcanoTool.tsx` | MODIFICAR - Passar novos props ao modal |
| `src/pages/PoseChangerTool.tsx` | MODIFICAR - Passar novos props ao modal |
| `src/pages/VesteAITool.tsx` | MODIFICAR - Passar novos props ao modal |
| `src/pages/VideoUpscalerTool.tsx` | MODIFICAR - Passar novos props ao modal |

---

## Resultado Esperado

1. Modal mostra **status atual** do trabalho (Processando/Na Fila)
2. Botão **"Cancelar Trabalho"** aparece ao lado de "Entendi"
3. Ao cancelar, **créditos são devolvidos** automaticamente
4. Toast confirma: "60 créditos estornados!"
5. Usuário pode iniciar um **novo trabalho imediatamente**

