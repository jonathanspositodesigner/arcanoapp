
# Plano: Integrar "Gerar Imagem" ao sistema de remuneração de colaboradores

## Contexto auditado
- Função genérica `trg_register_tool_earning_from_job` já existe ✅
- Tabela `image_generator_jobs` **não tem** coluna `reference_prompt_id` ainda
- `collaborator_tool_rates` ainda não tem entrada para Gerar Imagem
- Hook `useCollaboratorAttribution` já está pronto (atribuição via `prefillPromptId` ou seleção da biblioteca)
- `usePartnerBalance` já agrega TODAS as ferramentas de `collaborator_tool_earnings` automaticamente — **nada a mudar lá**
- Admin `PartnerToolRatesAdmin` lê todas as linhas de `collaborator_tool_rates` automaticamente — **aparecerá sozinho**

## 1. Migration de banco (schema)
1. **ALTER TABLE** `image_generator_jobs` ADD COLUMN `reference_prompt_id text`
2. **INSERT** em `collaborator_tool_rates`:
   - `tool_table = 'image_generator_jobs'`
   - `tool_display_name = 'Gerar Imagem'`
   - `earning_per_use = 0.10`
   - `is_active = true`
3. **CREATE TRIGGER** `trg_register_earning_image_generator` na tabela `image_generator_jobs`:
   - `AFTER UPDATE` quando `status` muda para `'completed'`
   - Executa `public.trg_register_tool_earning_from_job('image_generator_jobs')`

A função genérica (já existente) cuida de:
- ✅ Anti-fraude: 1 ganho por (colaborador × usuário pagador) — UNIQUE constraint em `collaborator_tool_earnings`
- ✅ Não pagar pelo próprio colaborador
- ✅ Buscar valor atualizado em `collaborator_tool_rates`
- ✅ Resolver `collaborator_id` via `reference_prompt_id`

## 2. Frontend — `src/pages/GerarImagemTool.tsx`
1. Importar e instanciar `useCollaboratorAttribution`
2. Após cada `createJob` (Flux2, Nano, GPT), se `referencePromptId` existir:
   ```ts
   await supabase
     .from('image_generator_jobs')
     .update({ reference_prompt_id: referencePromptId })
     .eq('id', jobId);
   ```
3. Chamar `setFromLibrary(meta)` quando o usuário selecionar prompt da biblioteca
4. Chamar `clear()` ao reset/upload manual de referência

## 3. Build version
Bump `APP_BUILD_VERSION` em `src/pages/Index.tsx` → `1.3.6`

## Garantias de não-quebra (regra #1)
- ✅ Migration é **puramente aditiva** (nova coluna nullable, nova linha em rate, novo trigger)
- ✅ Não altera nenhuma RPC de créditos (`consume_upscaler_credits` etc.)
- ✅ Não altera função genérica existente — apenas anexa novo trigger
- ✅ Update de `reference_prompt_id` no frontend é fire-and-forget após createJob (não bloqueia geração)
- ✅ Mesma exata arquitetura das 5 ferramentas que já remuneram

## Resultado
- Colaborador ganha R$ 0,10 toda vez que um usuário gera imagem partindo de prompt do colaborador (1× por usuário pagador, vitalício)
- Aparece automaticamente no Admin Hub para edição de valor
- Aparece automaticamente no extrato e saldo do colaborador
