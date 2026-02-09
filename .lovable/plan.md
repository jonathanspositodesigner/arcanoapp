
## Configuracoes dinamicas de creditos e custos de API para ferramentas IA

### Resumo
Criar uma tabela no banco de dados (`ai_tool_settings`) para armazenar os valores de creditos e custos de API de cada ferramenta. Todas as ferramentas passarao a ler esses valores do banco em vez de constantes hardcoded. O painel de rentabilidade tera botoes de edicao em cada linha para alterar valores em tempo real.

Jobs antigos nao serao afetados -- cada job ja grava o `user_credit_cost` no momento da execucao. Alteracoes futuras so valem para novos jobs.

---

### Etapa 1 -- Migration: criar tabela `ai_tool_settings`

Criar tabela com campos:
- `id` (uuid, PK)
- `tool_name` (text, unique, not null)
- `credit_cost` (integer, not null)
- `has_api_cost` (boolean, default false)
- `api_cost` (numeric, default 0)
- `updated_at` (timestamptz, default now())

Seed com valores atuais:

| tool_name | credit_cost | has_api_cost | api_cost |
|---|---|---|---|
| Upscaler Arcano | 60 | false | 0 |
| Upscaler Pro | 80 | false | 0 |
| Pose Changer | 60 | false | 0 |
| Veste AI | 60 | false | 0 |
| Video Upscaler | 150 | false | 0 |
| Arcano Cloner | 80 | true | 0.12 |
| Gerador Avatar | 75 | true | 0.12 |

RLS:
- SELECT para authenticated (todas as ferramentas precisam ler)
- UPDATE somente admins (via `has_role(auth.uid(), 'admin')`)

Trigger para atualizar `updated_at` automaticamente.

---

### Etapa 2 -- Hook `useAIToolSettings`

Novo arquivo: `src/hooks/useAIToolSettings.ts`

- Busca todos os registros de `ai_tool_settings`
- Retorna mapa de configuracoes + funcoes auxiliares
- `getCreditCost(toolName: string, fallback?: number)` -- retorna o custo de creditos com fallback seguro
- `getApiCost(toolName: string)` -- retorna `{ hasApiCost, apiCost }`
- `updateToolSettings(toolName, data)` -- faz update no banco (para o admin)
- `isLoading` -- estado de carregamento
- Usa `@tanstack/react-query` para cache e invalidacao automatica

---

### Etapa 3 -- Atualizar cada ferramenta para usar o hook

**Padrao de mudanca (igual em todos os arquivos):**

```
// ANTES:
const CREDIT_COST = 80;

// DEPOIS:
const { getCreditCost } = useAIToolSettings();
const creditCost = getCreditCost("Arcano Cloner", 80);
```

Trocar todas as referencias de `CREDIT_COST` por `creditCost` (variavel local). O fallback garante que se o banco nao responder, o valor antigo e usado.

Arquivos afetados:
- `src/pages/ArcanoClonerTool.tsx` -- fallback 80
- `src/pages/PoseChangerTool.tsx` -- fallback 60
- `src/pages/VesteAITool.tsx` -- fallback 60
- `src/pages/VideoUpscalerTool.tsx` -- fallback 150
- `src/pages/GeradorPersonagemTool.tsx` -- fallback 75
- `src/pages/UpscalerArcanoTool.tsx` -- caso especial: busca "Upscaler Arcano" e "Upscaler Pro", substitui `version === 'pro' ? 80 : 60` por `version === 'pro' ? getCreditCost('Upscaler Pro', 80) : getCreditCost('Upscaler Arcano', 60)`

Em cada arquivo:
1. Remover `const CREDIT_COST = XX;`
2. Importar e usar o hook
3. Substituir `CREDIT_COST` por `creditCost` em: verificacao de saldo, envio para edge function, e exibicao no botao

---

### Etapa 4 -- Edicao inline no painel de rentabilidade

**Arquivo: `src/components/admin/AIToolsProfitTable.tsx`**

Mudancas:
1. Remover constantes hardcoded `TOOL_CREDIT_COSTS` e `TOOL_API_COSTS`
2. Importar `useAIToolSettings` e ler valores do banco
3. Adicionar icone de lapis (Pencil) em cada linha da tabela (coluna "Operacao")
4. Ao clicar, abrir modal de edicao com:
   - Input "Creditos" (number)
   - Checkbox "Tem Extra de API"
   - Input "Valor Extra API em R$" (number, condicional -- so aparece se checkbox marcado)
5. Ao salvar, chamar `updateToolSettings(toolName, { credit_cost, has_api_cost, api_cost })`
6. Invalidar query para refrescar tabela automaticamente
7. A tabela recalcula receita, custo, lucro e margem instantaneamente

---

### Seguranca

- Valores padrao (fallback) em cada ferramenta garantem funcionamento mesmo se o banco falhar
- RLS impede usuarios normais de alterar configuracoes
- Jobs antigos nao sao afetados (o `user_credit_cost` ja e gravado no momento do job)
- O hook usa React Query com `staleTime` curto para manter dados atualizados

### Arquivos criados/modificados

| Arquivo | Acao |
|---|---|
| Migration SQL | Criar tabela + seed + RLS |
| `src/hooks/useAIToolSettings.ts` | Novo hook |
| `src/components/admin/AIToolsProfitTable.tsx` | Remover hardcoded, adicionar edicao |
| `src/pages/ArcanoClonerTool.tsx` | Usar hook |
| `src/pages/PoseChangerTool.tsx` | Usar hook |
| `src/pages/VesteAITool.tsx` | Usar hook |
| `src/pages/VideoUpscalerTool.tsx` | Usar hook |
| `src/pages/GeradorPersonagemTool.tsx` | Usar hook |
| `src/pages/UpscalerArcanoTool.tsx` | Usar hook (2 entradas) |
