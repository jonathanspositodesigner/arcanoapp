

# Auditoria Completa: Produtos Mercado Pago vs Pagar.me

## Resultado: TUDO PRONTO no banco de dados

Todos os **78 produtos** na tabela `mp_products` estão ativos, com `pack_slug`, `access_type`, `credits_amount`, `plan_slug` e `billing_period` corretamente preenchidos. A edge function `create-pagarme-checkout-v2` busca produtos dinamicamente dessa tabela, e o `webhook-pagarme` processa todos os 4 tipos: `pack`, `credits`, `subscription`, `landing_bundle`.

Nenhum produto está faltando no banco de dados.

---

## O que FALTA: 13 páginas/componentes ainda usam `useMPCheckout`

Apenas a `/planos-2` foi migrada. Todas as demais ainda chamam o Mercado Pago:

| Página/Componente | Slugs usados | Tipo |
|---|---|---|
| `UpscalerArcanoV3.tsx` | upscaler-arcano-starter/pro/ultimate, upscaler-arcano-v3 | credits + pack |
| `UpscalerArcanoV3Es.tsx` | upscaler-arcano-v3 | pack |
| `UpscalerArcanoV3Teste.tsx` | upscaler-arcano-starter/pro/ultimate, upscaler-arcano-v3 | credits + pack |
| `PlanosUpscalerArcano.tsx` | upscaler-arcano-starter/pro/ultimate, upscaller-arcano-vitalicio | credits + pack |
| `PlanosUpscalerArcano69v2.tsx` | mesmos 4 slugs | credits + pack |
| `PlanosArtes.tsx` | ~72 slugs de packs (vol1-4, carnaval, halloween, saojoao, fimdeano, agendas × 3 períodos × normal/renov/membro) | pack |
| `PricingCardsSection.tsx` (combo) | combo-1e2-1ano, combo-1ao3-vitalicio, combo-vol1-1ano | pack |
| `GuaranteeSectionCombo.tsx` | combo-1ao3-vitalicio | pack |
| `PricingCardsSectionPack4.tsx` | pack4-6meses/1ano/vitalicio | pack |
| `GuaranteeSectionPack4.tsx` | pack4-vitalicio | pack |
| `MotionsGallerySectionPack4.tsx` | pack4-vitalicio | pack |
| `LandingPricingSection.tsx` (arcano-cloner) | landing-starter/pro/ultimate-avulso | landing_bundle |
| `UpgradeUpscalerV3.tsx` | usa useMPCheckout | - |

---

## Plano de Migração (substituição mecânica em 13 arquivos)

Para cada arquivo acima, a mudança é idêntica e puramente mecânica:

1. Trocar `import { useMPCheckout }` → `import { usePagarmeCheckout }`
2. Trocar `useMPCheckout(...)` → `usePagarmeCheckout(...)`
3. Trocar `MPCheckoutModal` → `PagarmeCheckoutModal` (no destructuring e no JSX)
4. Trocar `isMPLoading` → `isLoading` (onde aplicável)

Nenhuma mudança de slug, nenhuma mudança visual, nenhuma mudança de preço, nenhuma mudança no banco de dados.

### Arquivos editados

| Arquivo | Mudança |
|---|---|
| `src/pages/UpscalerArcanoV3.tsx` | Hook MP → Pagar.me |
| `src/pages/UpscalerArcanoV3Es.tsx` | Hook MP → Pagar.me |
| `src/pages/UpscalerArcanoV3Teste.tsx` | Hook MP → Pagar.me |
| `src/pages/PlanosUpscalerArcano.tsx` | Hook MP → Pagar.me |
| `src/pages/PlanosUpscalerArcano69v2.tsx` | Hook MP → Pagar.me |
| `src/pages/PlanosArtes.tsx` | Hook MP → Pagar.me |
| `src/pages/UpgradeUpscalerV3.tsx` | Hook MP → Pagar.me |
| `src/components/combo-artes/PricingCardsSection.tsx` | Hook MP → Pagar.me |
| `src/components/combo-artes/GuaranteeSectionCombo.tsx` | Hook MP → Pagar.me |
| `src/components/prevenda-pack4/PricingCardsSectionPack4.tsx` | Hook MP → Pagar.me |
| `src/components/prevenda-pack4/GuaranteeSectionPack4.tsx` | Hook MP → Pagar.me |
| `src/components/prevenda-pack4/MotionsGallerySectionPack4.tsx` | Hook MP → Pagar.me |
| `src/components/arcano-cloner/LandingPricingSection.tsx` | Hook MP → Pagar.me |

### O que NÃO muda
- Nenhum produto no banco de dados
- Nenhuma edge function
- Nenhum webhook
- Nenhuma mudança visual
- O `PreCheckoutModal.tsx` (usado no app interno) já chama Pagar.me diretamente

