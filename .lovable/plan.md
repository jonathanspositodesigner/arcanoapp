

# Corrigir Bugs no Cadastro Manual de Assinantes (Admin)

## Problemas Encontrados

### Bug 1 (CRITICO): Slug "unlimited" nao bate com getPlanFeatures
- A lista `PAID_PLANS` usa `slug: "unlimited"` para o plano IA Unlimited
- Porem, a funcao `getPlanFeatures()` so trata os casos `'ia-unlimited'` e `'ultimate'`
- Resultado: ao cadastrar um usuario no plano IA Unlimited pelo admin, o `getPlanFeatures("unlimited")` cai no `default`, retornando `has_image_generation: false, has_video_generation: false`
- **Isso explica exatamente o bug que voce esta vendo** - o plano e criado mas a geracao de imagem fica bloqueada

### Bug 2: Editar usuario nao atualiza creditos
- A funcao `handleEdit` atualiza a assinatura (plan_slug, flags, etc.) mas **nunca chama** `reset_upscaler_credits`
- Se voce mudar um usuario de Starter (600 creditos) para Ultimate (6000 creditos), o saldo de creditos continua o mesmo de antes

## Correcoes

### Correcao 1: Adicionar 'unlimited' ao getPlanFeatures
No arquivo `src/components/admin/AdminPlanos2SubscribersTab.tsx`, linha 56:

Adicionar `case 'unlimited':` junto com `case 'ia-unlimited':` e `case 'ultimate':` para que todos os tres slugs retornem as permissoes corretas (imagem e video habilitados).

### Correcao 2: Alocar creditos ao editar usuario
Na funcao `handleEdit` (linha 346), apos atualizar a assinatura com sucesso, chamar `reset_upscaler_credits` para sincronizar o saldo de creditos com o novo plano. Isso garante que ao trocar de plano, os creditos sejam atualizados imediatamente.

### Correcao 3: Fix retroativo no banco
Executar UPDATE para corrigir os 2 usuarios com `plan_slug = 'unlimited'` que possam ter flags erradas (ja foram corrigidos manualmente antes, mas e bom garantir).

## Arquivos Modificados
- `src/components/admin/AdminPlanos2SubscribersTab.tsx` (2 alteracoes)

