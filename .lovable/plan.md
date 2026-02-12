

# Plano: Bloquear free trial duplicado + PRO inativo no trial

## Resumo
Duas mudancas:
1. Quem usou o teste gratuito da landing page (email na tabela `landing_page_trials`) sera impedido de resgatar os 300 creditos gratuitos no app.
2. No mockup do upscaler da landing, o modo PRO aparece visivel mas desabilitado com indicacao de que e exclusivo para assinantes.

---

## Detalhes Tecnicos

### 1. Bloquear resgate de 300 creditos para emails da landing page trial

Dois pontos de verificacao precisam ser atualizados:

**a) `supabase/functions/check-free-trial-eligibility/index.ts`**
- Apos checar `promo_claims` e `arcano_cloner_free_trials`, adicionar uma terceira verificacao na tabela `landing_page_trials`
- Se o email existir com `code_verified = true`, retornar `eligible: false` com `reason: 'already_claimed'`

**b) `supabase/functions/claim-arcano-free-trial/index.ts`**
- Antes de chamar a RPC `claim_arcano_free_trial_atomic`, verificar se o email do usuario autenticado existe na `landing_page_trials` com `code_verified = true`
- Se existir, retornar `{ already_claimed: true }` impedindo o resgate

### 2. PRO inativo no mockup do trial

**`src/components/upscaler/trial/UpscalerMockup.tsx`**
- Manter o botao "PRO" visivel no header
- Adicionar um icone de cadeado e tooltip/texto pequeno tipo "Exclusivo para assinantes"
- Ao clicar no PRO (quando trial ativo), mostrar um mini aviso inline ou toast dizendo que o modo PRO e exclusivo para quem assina um plano
- Garantir que o modo Standard permanece selecionado e funcional durante o trial

### 3. Arquivos a modificar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/check-free-trial-eligibility/index.ts` | Adicionar check na `landing_page_trials` |
| `supabase/functions/claim-arcano-free-trial/index.ts` | Adicionar check na `landing_page_trials` |
| `src/components/upscaler/trial/UpscalerMockup.tsx` | PRO visivel mas inativo com mensagem de exclusividade |

### 4. Sem mudancas no banco de dados
A tabela `landing_page_trials` ja existe com os campos necessarios (`email`, `code_verified`). Nenhuma migration necessaria.

