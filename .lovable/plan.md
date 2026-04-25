## Plano — "Gerar sua versão" para Flyers com IA

Trava mensal **compartilhada** cross-tool (já implementada na RPC `register_collaborator_tool_earning`).

### 1. `src/pages/BibliotecaPrompts.tsx`
- Adicionar handler que detecta categoria `Flyers com IA` (excluindo vídeos por extensão).
- Renderizar botão "Gerar sua versão" no card e no modal para esses itens.
- Ao clicar, navegar para `/flyer-maker` com `state`:
  ```ts
  { referenceImageUrl: item.imageUrl,
    flyerType: 'outro',
    prefillPromptId: item.partnerId ? item.id : null,
    prefillPromptType: item.partnerId ? 'partner' : null }
  ```

### 2. `src/pages/FlyerMakerTool.tsx`
- Ler `location.state` no mount: pré-carregar a imagem como referência (download + adicionar ao input), forçar categoria "Outros", armazenar `referencePromptId` em ref.
- Persistir `reference_prompt_id` na inserção do job em `flyer_maker_jobs`.
- Manter o ID em sessão mesmo se o usuário mudar imagem/prompt antes de gerar (limpar só ao sair da página ou após primeira geração concluída).

### 3. Migration de banco
- `ALTER TABLE flyer_maker_jobs ADD COLUMN IF NOT EXISTS reference_prompt_id uuid;` + índice parcial.
- Trigger `trg_register_earning_flyer_maker` AFTER UPDATE em `flyer_maker_jobs`: quando `status` virar `completed` e `reference_prompt_id` não nulo, chama a RPC compartilhada `register_collaborator_tool_earning` (mesma usada por `image_generator_jobs`).
- Verificar `ai_tool_registry` para `flyer_maker_jobs` (custo R$ 0,10 colaborador). Se não existir entry, inserir.

### 4. `src/pages/TornarSeColaborador.tsx`
- Ajuste leve na cláusula 5.1 para reforçar que a trava mensal é **compartilhada entre todas as ferramentas de IA** (1 pagamento por usuário×prompt×mês, independente da ferramenta).

### 5. Versionamento
- `APP_BUILD_VERSION` → `1.3.9` em `src/pages/Index.tsx`.

### 6. Build errors pré-existentes
Os erros TS18046/TS2339/TS2304 listados (em `check-free-trial-eligibility`, `claim-free-trial`, `create-stripe-checkout`, `webhook-greenn-artes`, `webhook-hotmart-artes`, `webhook-pagarme`, e os `.then().catch()` no `create-pagarme-checkout-v2`) são em edge functions fora do escopo desta task. **Não vou corrigir nesta entrega** para não desviar do foco. Posso abrir uma task dedicada depois se quiser.
