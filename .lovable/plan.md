

# Reverter "Arcano Studio" para "Arcano Cloner" em todo o frontend

## Resumo
Todas as 93 ocorrencias de "Arcano Studio" encontradas em 11 arquivos serao revertidas para "Arcano Cloner". Nenhuma alteracao no banco de dados ou backend -- apenas textos no frontend.

## Arquivos a alterar

### 1. `src/components/layout/AppSidebar.tsx`
- Menu lateral: nome da ferramenta "Arcano Studio" -> "Arcano Cloner"

### 2. `src/pages/ArcanoClonerTool.tsx`
- Titulo h1 da pagina
- Chamadas `getCreditCost('Arcano Studio', 80)` -> `'Arcano Cloner'`
- Chamadas `registerJob(jobId, 'Arcano Studio', ...)` -> `'Arcano Cloner'`

### 3. `src/pages/GeradorPersonagemTool.tsx`
- Label do atalho "Arcano Studio" -> "Arcano Cloner"

### 4. `src/pages/FerramentasIAAplicativo.tsx`
- Nome da ferramenta estatica e mapeamento de slug

### 5. `src/pages/PlanosCreditos.tsx`
- Nome no card de plano

### 6. `src/pages/Planos.tsx`, `src/pages/Planos2.tsx`, `src/pages/PlanosUpscalerCreditos.tsx`
- Lista de ferramentas AI

### 7. `src/ai/JobManager.ts`
- Chave do mapeamento de nomes (precisa bater com os registerJob)

### 8. `src/components/admin/AdminAIToolsUsageTab.tsx`
- Labels, filtros e mapeamentos no painel admin

### 9. `src/components/admin/AIToolsProfitTable.tsx`
- Placeholder de exemplo

## O que NAO muda
- Nomes de tabelas no banco (ex: `arcano_cloner_jobs`)
- Slugs de URL (`/arcano-cloner-tool`)
- Valores internos mapeados (ex: `'arcano_cloner'`)

