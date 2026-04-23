

## Plano: Corrigir sincronização de prompts de parceiros na biblioteca de ferramentas

### Problema

Quando um parceiro sobe um prompt com categoria "Fotos" e seleciona uma subcategoria (ex: "Politico Feminino"), o prompt aparece na Biblioteca de Prompts mas **nunca aparece na biblioteca interna das ferramentas** (Arcano Cloner, Veste AI, Pose Maker). Isso acontece porque:

1. O `subcategorySlug` é coletado no formulário de upload, mas **nunca é salvo** no banco
2. A função `syncFotoToAllTools` que cria as entradas em `ai_tool_library_items` **nunca é chamada** para prompts de parceiros — nem no upload, nem na aprovação
3. A função `syncFotoToAllTools` tem `source_table` hardcoded como `"admin_prompts"`, então mesmo se fosse chamada, criaria registros apontando para a tabela errada

### Alterações

#### 1. Migração: Adicionar coluna `subcategory_slug` na tabela `partner_prompts`
- Nova coluna `subcategory_slug TEXT NULL` para persistir a subcategoria escolhida pelo parceiro

#### 2. `src/lib/iaLibrarySync.ts` — Aceitar `source_table` como parâmetro
- Adicionar parâmetro opcional `sourceTable` (default: `"admin_prompts"`) na função `syncFotoToAllTools`
- Usar esse parâmetro ao montar as rows do upsert

#### 3. `src/pages/PartnerUpload.tsx` — Salvar `subcategorySlug` no insert
- Adicionar `subcategory_slug: media.subcategorySlug` no insert de `partner_prompts`

#### 4. `src/pages/AdminCommunityReview.tsx` — Sincronizar na aprovação
- Após aprovar um prompt de parceiro com `category === 'Fotos'`, buscar o `subcategory_slug` do prompt e chamar `syncFotoToAllTools(promptId, slug, 'partner_prompts')`
- Na rejeição/exclusão, chamar `syncFotoToAllTools(promptId, null, 'partner_prompts')` para remover das bibliotecas

#### 5. Prompt já aprovado da Herica Nagila
- Inserir manualmente as entradas em `ai_tool_library_items` para o prompt `5db09b19-bdfa-4245-8d45-028acb480d71` na subcategoria "politico" das 3 ferramentas, com `source_table: 'partner_prompts'`

### Resultado
- Prompts de parceiros aprovados aparecem na biblioteca interna das ferramentas
- Subcategoria é persistida e usada corretamente
- Fluxo admin de aprovação/rejeição mantém as bibliotecas sincronizadas

