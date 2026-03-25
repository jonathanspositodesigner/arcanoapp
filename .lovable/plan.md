

## Plano: Configurar botão de upgrade V3 com checkout Mercado Pago

### Contexto
- O produto `upscaler-arcano-v3` já existe na tabela `mp_products` mas com **preço R$ 0,00** — precisa ser atualizado para **R$ 49,90**.
- O webhook `webhook-mercadopago` já lida com a ativação do V3 (concede pack `upscaller-arcano-v3` + bônus V2), **porém** também concede 10.000 créditos + image/video generation — que o usuário disse para **NÃO** fazer.
- A edge function `create-mp-checkout` tem back_urls hardcoded para a página 69 — precisamos torná-las dinâmicas para suportar a página V3.
- O e-mail de compra atual é genérico — precisa de template único para V3.

### Mudanças

**1. Migração: Atualizar preço do produto V3**
- `UPDATE mp_products SET price = 49.90 WHERE slug = 'upscaler-arcano-v3'`

**2. Edge Function `create-mp-checkout` — Back URLs dinâmicas**
- Aceitar campo opcional `source_page` no body da requisição.
- Se `source_page === 'upgrade-v3'`, usar back_urls de failure/pending apontando para `/upgrade-upscaler-v3` em vez de `/planos-upscaler-arcano-69`.
- Success continua indo para `/sucesso-compra?gateway=mercadopago`.

**3. Edge Function `webhook-mercadopago` — Separar V3 do vitalício**
- Remover o V3 (`upscaler-arcano-v3`) da condição que concede 10.000 créditos e image/video generation (linhas 650-735).
- O V3 já é tratado como `type: 'pack'` com `pack_slug: 'upscaller-arcano-v3'` — a ativação do pack (linhas 574-597) já funciona corretamente.
- Manter apenas a lógica de conceder bônus V2 para compradores do V3 (mas mover para o bloco de pack genérico ou criar bloco dedicado).

**4. E-mail de compra V3 — Template único**
- Adicionar bloco condicional em `buildPurchaseEmailHtml` para `product.slug === 'upscaler-arcano-v3'`:
  - Mensagem: "Seu Upscaler Arcano V3 foi ativado! Agora você tem acesso ao Modo Turbo e Upscale em Lote."
  - CTA: "Acessar Agora →" levando para a Home (`https://arcanoapp.voxvisual.com.br/`)
  - Visual com destaque fuchsia/roxo condizente com a identidade do V3.

**5. Frontend `UpgradeUpscalerV3.tsx` — Conectar botão ao checkout**
- Importar e usar `useMPCheckout` (mesmo padrão da página 69).
- No botão "Fazer Upgrade para V3 Agora": chamar `openCheckout('upscaler-arcano-v3')`.
- Renderizar `<MPCheckoutModal />` no JSX.
- Adicionar feedback de `mp_status` na URL (já incluso no hook).
- Passar `source_page: 'upgrade-v3'` para a edge function (via `mpCheckout.ts`).

**6. Redeploy das edge functions**
- Deploy de `create-mp-checkout` e `webhook-mercadopago` após as alterações.

### Arquivos alterados
- `src/pages/UpgradeUpscalerV3.tsx` — hook + botão
- `src/lib/mpCheckout.ts` — aceitar `source_page` opcional
- `supabase/functions/create-mp-checkout/index.ts` — back_urls dinâmicas
- `supabase/functions/webhook-mercadopago/index.ts` — separar V3 dos 10k créditos + template de e-mail V3
- Migração SQL: preço do produto

