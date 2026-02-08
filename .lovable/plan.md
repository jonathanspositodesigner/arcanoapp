

## Resumo
Configurar os painéis de **Custos IA** e **Rentabilidade** para incluir o **Arcano Cloner** e deixar o sistema documentado para facilitar a adição de novas ferramentas de IA no futuro.

---

## O que será implementado

### 1. Migration SQL - Atualizar 4 RPCs do Banco

As funções RPC estão atualmente hardcoded e não incluem `arcano_cloner_jobs`. Vamos atualizar:

| Função RPC | Descrição |
|------------|-----------|
| `get_ai_tools_usage` | Lista de jobs com paginação |
| `get_ai_tools_usage_count` | Contagem total para paginação |
| `get_ai_tools_usage_summary` | Cards de resumo (totais, médias) |
| `get_ai_tools_cost_averages` | Médias de custo por ferramenta (rentabilidade) |

### 2. Frontend - AdminAIToolsUsageTab.tsx

**Linha 67-72** - Adicionar Arcano Cloner ao filtro de ferramentas:
```typescript
const TOOL_FILTERS = [
  { value: "all", label: "Todas as ferramentas" },
  { value: "Upscaler Arcano", label: "Upscaler Arcano" },
  { value: "Pose Changer", label: "Pose Changer" },
  { value: "Veste AI", label: "Veste AI" },
  { value: "Arcano Cloner", label: "Arcano Cloner" },  // NOVO
];
```

**Linha 216-224** - Adicionar cor do badge:
```typescript
const getToolBadge = (toolName: string) => {
  const colors: Record<string, string> = {
    "Upscaler Arcano": "bg-purple-500/20 text-purple-400 border-purple-500/30",
    "Pose Changer": "bg-orange-500/20 text-orange-400 border-orange-500/30",
    "Veste AI": "bg-pink-500/20 text-pink-400 border-pink-500/30",
    "Video Upscaler": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    "Arcano Cloner": "bg-blue-500/20 text-blue-400 border-blue-500/30",  // NOVO
  };
  return <Badge className={colors[toolName] || ""}>{toolName}</Badge>;
};
```

**Linha 226-234** - Adicionar mapeamento de tabela para cancelamento:
```typescript
const getTableName = (toolName: string): string => {
  switch (toolName) {
    case "Upscaler Arcano": return "upscaler_jobs";
    case "Pose Changer": return "pose_changer_jobs";
    case "Veste AI": return "veste_ai_jobs";
    case "Video Upscaler": return "video_upscaler_jobs";
    case "Arcano Cloner": return "arcano_cloner_jobs";  // NOVO
    default: return "upscaler_jobs";
  }
};
```

### 3. Frontend - AIToolsProfitTable.tsx

**Linha 65-71** - Adicionar custo de créditos padrão:
```typescript
const TOOL_CREDIT_COSTS: Record<string, number> = {
  "Upscaler Arcano": 60,
  "Upscaler Pro": 80,
  "Pose Changer": 60,
  "Veste AI": 60,
  "Video Upscaler": 150,
  "Arcano Cloner": 80,  // NOVO
};
```

---

## Detalhes da Migration SQL

### get_ai_tools_usage - Adicionar Arcano Cloner
```sql
UNION ALL

-- Arcano Cloner jobs
SELECT 
  acj.id,
  'Arcano Cloner'::TEXT as tool_name,
  acj.user_id,
  acj.status,
  COALESCE(acj.rh_cost, 0) as rh_cost,
  COALESCE(acj.user_credit_cost, 0) as user_credit_cost,
  COALESCE(acj.user_credit_cost, 0) - COALESCE(acj.rh_cost, 0) as profit,
  COALESCE(acj.waited_in_queue, false) as waited_in_queue,
  COALESCE(acj.queue_wait_seconds, 0) as queue_wait_seconds,
  CASE 
    WHEN acj.started_at IS NOT NULL AND acj.completed_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (acj.completed_at - acj.started_at))::INTEGER
    ELSE 0
  END as processing_seconds,
  acj.created_at,
  acj.started_at,
  acj.completed_at
FROM arcano_cloner_jobs acj
WHERE acj.user_id IS NOT NULL
```

### get_ai_tools_usage_count - Adicionar
```sql
UNION ALL
SELECT id FROM arcano_cloner_jobs 
WHERE user_id IS NOT NULL
  AND (p_start_date IS NULL OR created_at >= p_start_date)
  AND (p_end_date IS NULL OR created_at <= p_end_date)
```

### get_ai_tools_usage_summary - Adicionar
```sql
UNION ALL

-- Arcano Cloner jobs
SELECT 
  acj.status,
  COALESCE(acj.rh_cost, 0),
  COALESCE(acj.user_credit_cost, 0),
  COALESCE(acj.waited_in_queue, false),
  COALESCE(acj.queue_wait_seconds, 0),
  CASE 
    WHEN acj.started_at IS NOT NULL AND acj.completed_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (acj.completed_at - acj.started_at))::INTEGER
    ELSE 0
  END
FROM arcano_cloner_jobs acj
WHERE acj.user_id IS NOT NULL
  AND (p_start_date IS NULL OR acj.created_at >= p_start_date)
  AND (p_end_date IS NULL OR acj.created_at <= p_end_date)
```

### get_ai_tools_cost_averages - Adicionar
```sql
UNION ALL

-- Arcano Cloner
SELECT 
  'Arcano Cloner'::TEXT as tool_name,
  COUNT(*)::BIGINT as total_jobs,
  COALESCE(ROUND(AVG(rh_cost)::NUMERIC, 2), 0) as avg_rh_cost,
  COALESCE(ROUND(AVG(user_credit_cost)::NUMERIC, 2), 0) as avg_credit_cost,
  COALESCE(SUM(rh_cost)::NUMERIC, 0) as total_rh_cost,
  COALESCE(SUM(user_credit_cost)::NUMERIC, 0) as total_credit_cost
FROM arcano_cloner_jobs
WHERE status = 'completed'
```

---

## Arquivos a Serem Modificados

| Arquivo | Alteração |
|---------|-----------|
| Migration SQL | Recriar as 4 RPCs incluindo `arcano_cloner_jobs` |
| `src/components/admin/AdminAIToolsUsageTab.tsx` | Adicionar filtro, badge e mapeamento |
| `src/components/admin/AIToolsProfitTable.tsx` | Adicionar custo de créditos |

---

## Guia para Adicionar Novas Ferramentas no Futuro

Quando criar uma nova ferramenta de IA (ex: `nova_ferramenta_jobs`), siga este checklist:

### 1. Backend (SQL)
Criar nova migration atualizando as 4 RPCs:
- `get_ai_tools_usage` - Adicionar `UNION ALL` com a nova tabela
- `get_ai_tools_usage_count` - Adicionar `UNION ALL SELECT id FROM nova_tabela`
- `get_ai_tools_usage_summary` - Adicionar `UNION ALL` com métricas
- `get_ai_tools_cost_averages` - Adicionar `UNION ALL` com médias

### 2. Frontend - AdminAIToolsUsageTab.tsx
- Adicionar ao `TOOL_FILTERS` array
- Adicionar cor ao `getToolBadge()` colors map
- Adicionar ao `getTableName()` switch

### 3. Frontend - AIToolsProfitTable.tsx
- Adicionar ao `TOOL_CREDIT_COSTS` com o custo padrão em créditos

