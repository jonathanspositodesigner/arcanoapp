

## Plano: Checkout Pagar.me para desconto de membro e renovação

### Situação atual

Existem **dois cenários de desconto** que ainda usam links Greenn:

1. **Desconto exclusivo para membros (20% OFF)** — página `/planos-artes-membro` (`PlanosArtesMembro.tsx`)
   - Preços: 6m = R$ 21,60 | 1a = R$ 29,60 | Vitalício = R$ 37,60
   - Usa `checkout_link_membro_*` da tabela `artes_packs` (links Greenn)
   
2. **Desconto de renovação (30% OFF)** — página `/planos-artes?renovacao=true` (`PlanosArtes.tsx`)
   - Preços: 6m = R$ 18,90 | 1a = R$ 25,90 | Vitalício = R$ 32,90
   - Usa `checkout_link_renovacao_*` da tabela `artes_packs` (links Greenn)

### O que precisa ser feito

**1. Banco de dados — 54 novos produtos na `mp_products`**

9 packs × 3 tiers × 2 tipos de desconto:

| Tipo | Sufixo slug | Preços (6m / 1a / vit) |
|------|-------------|------------------------|
| Membro | `-membro-6meses`, `-membro-1ano`, `-membro-vitalicio` | R$ 21,60 / R$ 29,60 / R$ 37,60 |
| Renovação | `-renov-6meses`, `-renov-1ano`, `-renov-vitalicio` | R$ 18,90 / R$ 25,90 / R$ 32,90 |

Exemplo slugs para Pack Vol.1:
- `vol1-membro-6meses`, `vol1-membro-1ano`, `vol1-membro-vitalicio`
- `vol1-renov-6meses`, `vol1-renov-1ano`, `vol1-renov-vitalicio`

Todos com `type: 'pack'`, `pack_slug` correto, e `access_type` correspondente.

**2. `PlanosArtesMembro.tsx` — Migrar para Pagar.me**

- Adicionar mapeamento `PAGARME_MEMBER_SLUGS` (9 packs × 3 tiers = 27 slugs)
- Importar e usar `PreCheckoutModal`, `PaymentMethodModal`, `useProcessingButton`
- Replicar o fluxo de 1-click idêntico ao `PlanosArtes.tsx` (verificar perfil completo → modal de método → checkout direto)
- Substituir `handleSelectOption` que abre link Greenn por `handlePagarmeCheckout`

**3. `PlanosArtes.tsx` — Adicionar slugs de renovação no Pagar.me**

- Adicionar mapeamento `PAGARME_RENEWAL_SLUGS` (9 packs × 3 tiers = 27 slugs)
- No `handleSelectOption`, quando `isRenewal && isPagarmeRenewalSlug`, usar o fluxo Pagar.me em vez de abrir link Greenn

### Packs cobertos (9 total)

1. Pack Arcano Vol.1
2. Pack Arcano Vol.2
3. Pack Arcano Vol.3
4. Pack Arcano Vol.4
5. Pack Fim de Ano
6. Pack Agendas
7. Pack de Halloween
8. Pack de Carnaval
9. Pack de São João

### O que NÃO muda

- Webhook Pagar.me — já é genérico
- Edge Functions de checkout e 1-click — já funcionam por slug
- Lógica de fulfillment (acesso 6m/1a/vitalício + bônus) — inalterada
- Links Greenn antigos — continuam funcionando como fallback

### Arquivos editados
- `src/pages/PlanosArtesMembro.tsx` — migrar para fluxo Pagar.me completo
- `src/pages/PlanosArtes.tsx` — adicionar mapeamento de renovação
- Banco de dados — INSERT de 54 produtos na `mp_products`

