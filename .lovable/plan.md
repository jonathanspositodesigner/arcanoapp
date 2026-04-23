

## Auditoria completa: Bugs no sistema de atribuição de créditos ao colaborador

### Bugs encontrados

---

#### BUG 1 — Crédito fantasma: upload próprio não limpa referencePromptId
**Afeta**: Arcano Cloner, Pose Changer, Veste AI

**Cenário**: Usuário navega da biblioteca com prompt de parceiro → chega na ferramenta com `referencePromptId` setado → troca a imagem de referência por uma foto própria via upload → gera → colaborador recebe crédito indevidamente.

**Causa**: A função `handleUploadFromModal` em cada ferramenta seta a nova imagem mas **não limpa** o `referencePromptId`.

**Correção**: Adicionar `setReferencePromptId(null)` dentro de `handleUploadFromModal` em:
- `src/pages/ArcanoClonerTool.tsx`
- `src/pages/PoseChangerTool.tsx`
- `src/pages/VesteAITool.tsx`

---

#### BUG 2 — Crédito fantasma no Seedance2: referencePromptId nunca atualiza
**Afeta**: Seedance 2

**Cenário**: Usuário navega da biblioteca com prompt de parceiro → chega no Seedance com `referencePromptId` setado na inicialização → muda o prompt, troca as imagens de referência, faz o que quiser → gera 20 vezes → colaborador recebe pelo primeiro uso do dia, mas o prompt de referência pode não ter nada a ver com o que foi gerado.

**Causa**: `setReferencePromptId` é chamado apenas na inicialização do `useState`. Não existe nenhum ponto no código que atualize ou limpe esse estado.

**Correção**: Limpar `referencePromptId` sempre que o usuário alterar as imagens de referência manualmente ou limpar o formulário, em `src/pages/Seedance2.tsx`.

---

#### BUG 3 — MovieLed envia ID de prompt admin como referência
**Afeta**: MovieLed Maker

**Cenário**: Usuário seleciona um item da biblioteca de admin (não de parceiro) → a linha `referencePromptId: partnerPromptIdRef.current || selectedLibraryItem?.id || null` envia o ID do prompt admin → a RPC procura na tabela `partner_prompts`, não encontra, e retorna `invalid_prompt_or_partner` → sem crédito (correto), mas gera log de erro desnecessário.

**Causa**: O fallback `selectedLibraryItem?.id` usa IDs de `admin_prompts`, não de `partner_prompts`.

**Correção**: Remover o fallback `selectedLibraryItem?.id`. Enviar apenas `partnerPromptIdRef.current || null`.

---

#### BUG 4 — MovieLed nunca limpa partnerPromptIdRef
**Afeta**: MovieLed Maker

**Cenário**: Usuário navega da biblioteca com prompt de parceiro → muda a seleção para outro item da biblioteca (admin) → gera → o `partnerPromptIdRef.current` ainda contém o ID do parceiro antigo → colaborador recebe crédito indevido.

**Causa**: `partnerPromptIdRef.current` é setado apenas no `useEffect` de inicialização e nunca mais é limpo ou atualizado.

**Correção**: Limpar `partnerPromptIdRef.current = null` quando o usuário seleciona um novo item da biblioteca ou faz upload de imagem própria, em `src/pages/MovieLedMakerTool.tsx`.

---

#### BUG 5 — TABLES_WITH_REFERENCE_PROMPT_ID inclui tabelas sem a coluna
**Afeta**: Nenhum bug de crédito, mas gera queries desnecessárias

**Causa**: O set `TABLES_WITH_REFERENCE_PROMPT_ID` no `runninghub-queue-manager` inclui `flyer_maker_jobs`, `character_generator_jobs`, `bg_remover_jobs` e `video_generator_jobs`, mas essas tabelas NÃO possuem a coluna `reference_prompt_id`. A query falha silenciosamente no try/catch.

**Correção**: Remover as 4 tabelas do set em `supabase/functions/runninghub-queue-manager/index.ts`.

---

### Resumo das correções

| Arquivo | O que corrigir |
|---------|---------------|
| `src/pages/ArcanoClonerTool.tsx` | Limpar `referencePromptId` no `handleUploadFromModal` |
| `src/pages/PoseChangerTool.tsx` | Limpar `referencePromptId` no `handleUploadFromModal` |
| `src/pages/VesteAITool.tsx` | Limpar `referencePromptId` no `handleUploadFromModal` |
| `src/pages/Seedance2.tsx` | Limpar `referencePromptId` ao alterar refs/prompt manualmente |
| `src/pages/MovieLedMakerTool.tsx` | Remover fallback `selectedLibraryItem?.id`, limpar ref ao mudar seleção |
| `supabase/functions/runninghub-queue-manager/index.ts` | Remover tabelas sem a coluna do set |

### O que NÃO está bugado (confirmado na auditoria)

- A RPC `register_collaborator_tool_earning` está correta (1 overload, daily limit funciona)
- A navegação da biblioteca passa `prefillPromptType: 'partner'` corretamente
- O `/finish` do queue-manager tem idempotência correta (não duplica earning)
- O Seedance-poll e seedance-recovery chamam a RPC corretamente
- `prompt_clicks` tracking funciona independente dos earnings
- Bloqueio de auto-uso (`self_usage_blocked`) funciona
- Nenhuma tabela ou RLS precisa ser alterada

