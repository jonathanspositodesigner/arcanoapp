

## Plano: Criar slugs exclusivos para Upscaler Arcano + atualizar preço Vitalício

### 1. Inserir 3 novos produtos na tabela `mp_products`

Criar 3 registros com tipo `landing_bundle` (mesmo comportamento dos do Arcano Cloner):

| Slug | Título | Preço | Créditos | plan_slug | type |
|------|--------|-------|----------|-----------|------|
| `upscaler-arcano-starter` | Upscaler Arcano - Starter | 24.90 | 1500 | starter | landing_bundle |
| `upscaler-arcano-pro` | Upscaler Arcano - Pro | 37.00 | 4200 | pro | landing_bundle |
| `upscaler-arcano-ultimate` | Upscaler Arcano - Ultimate | 79.90 | 14000 | ultimate | landing_bundle |

Todos com `access_type: 'vitalicio'`, `is_active: true`, sem `pack_slug` (igual aos do Cloner).

### 2. Atualizar preço do Vitalício

UPDATE no `upscaller-arcano-vitalicio` de R$ 29,90 para R$ 99,90. Lógica de fulfillment (liberar pack `upscaller-arcano`) permanece idêntica.

### 3. Atualizar slugs na página

Em `src/pages/PlanosUpscalerArcano.tsx`, trocar os `productSlug`:
- Starter: `landing-starter-avulso` → `upscaler-arcano-starter`
- Pro: `landing-pro-avulso` → `upscaler-arcano-pro`
- Ultimate: `landing-ultimate-avulso` → `upscaler-arcano-ultimate`
- Vitalício: mantém `upscaller-arcano-vitalicio` (mesmo slug)

### Resultado
Cada venda do Upscaler aparecerá com nome próprio ("Upscaler Arcano - Pro" etc.) nos emails e registros, separado do Arcano Cloner.

