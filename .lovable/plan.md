

## Plano: Migrar todos os packs da Biblioteca de Artes para checkout Pagar.me

### Situação atual
- Apenas o **Pack Arcano Vol. 4** usa Pagar.me (slugs: `pack4-6meses`, `pack4-1ano`, `pack4-vitalicio`)
- Os outros 8 packs usam links de checkout da Greenn
- A lógica de fulfillment no webhook já é **genérica** — lê `pack_slug` e `access_type` da tabela `mp_products`, então **não precisa de alteração no webhook**

### Packs a migrar (8 packs × 3 tiers = 24 novos produtos)

| Pack | Slugs Pagar.me |
|------|---------------|
| Pack Arcano Vol.1 | `vol1-6meses`, `vol1-1ano`, `vol1-vitalicio` |
| Pack Arcano Vol.2 | `vol2-6meses`, `vol2-1ano`, `vol2-vitalicio` |
| Pack Arcano Vol.3 | `vol3-6meses`, `vol3-1ano`, `vol3-vitalicio` |
| Pack Fim de Ano | `fimdeano-6meses`, `fimdeano-1ano`, `fimdeano-vitalicio` |
| Pack Agendas | `agendas-6meses`, `agendas-1ano`, `agendas-vitalicio` |
| Pack de Halloween | `halloween-6meses`, `halloween-1ano`, `halloween-vitalicio` |
| Pack de Carnaval | `carnaval-6meses`, `carnaval-1ano`, `carnaval-vitalicio` |
| Pack de São João | `saojoao-6meses`, `saojoao-1ano`, `saojoao-vitalicio` |

Preços: 6 meses = R$ 27, 1 ano = R$ 37, vitalício = R$ 47 (mesma lógica do Pack 4).

### Alterações

**1. Banco de dados — Inserir 24 produtos na tabela `mp_products`**

Cada um com: `slug`, `title`, `price`, `type: 'pack'`, `pack_slug` (slug do pack na `artes_packs`), `access_type` (`6_meses`, `1_ano`, `vitalicio`), `is_active: true`.

**2. `src/pages/PlanosArtes.tsx` — Expandir `PAGARME_PACK_SLUGS`**

Adicionar todos os 8 packs no mapeamento, para que ao clicar em comprar, todos os packs usem o fluxo Pagar.me (PreCheckoutModal + PaymentMethodModal + 1-click) em vez de abrir links Greenn.

```typescript
const PAGARME_PACK_SLUGS: Record<string, Record<string, string>> = {
  'pack-arcano-vol-4': { '6_meses': 'pack4-6meses', '1_ano': 'pack4-1ano', 'vitalicio': 'pack4-vitalicio' },
  'pack-arcano-vol-1': { '6_meses': 'vol1-6meses', '1_ano': 'vol1-1ano', 'vitalicio': 'vol1-vitalicio' },
  'pack-arcano-vol-2': { '6_meses': 'vol2-6meses', '1_ano': 'vol2-1ano', 'vitalicio': 'vol2-vitalicio' },
  'pack-arcano-vol-3': { '6_meses': 'vol3-6meses', '1_ano': 'vol3-1ano', 'vitalicio': 'vol3-vitalicio' },
  'pack-fim-de-ano': { '6_meses': 'fimdeano-6meses', '1_ano': 'fimdeano-1ano', 'vitalicio': 'fimdeano-vitalicio' },
  'pack-agendas': { '6_meses': 'agendas-6meses', '1_ano': 'agendas-1ano', 'vitalicio': 'agendas-vitalicio' },
  'pack-de-halloween': { '6_meses': 'halloween-6meses', '1_ano': 'halloween-1ano', 'vitalicio': 'halloween-vitalicio' },
  'pack-de-carnaval': { '6_meses': 'carnaval-6meses', '1_ano': 'carnaval-1ano', 'vitalicio': 'carnaval-vitalicio' },
  'pack-de-sao-joao': { '6_meses': 'saojoao-6meses', '1_ano': 'saojoao-1ano', 'vitalicio': 'saojoao-vitalicio' },
};
```

### O que NÃO muda
- **Webhook Pagar.me** — já é genérico, lê `pack_slug` e `access_type` do produto
- **Edge Function `create-pagarme-checkout`** — já busca por `slug` na `mp_products`, funciona sem alteração
- **PreCheckoutModal / PaymentMethodModal / 1-click** — toda a lógica existente se aplica automaticamente
- **Links Greenn antigos** — continuam funcionando caso alguém acesse por link salvo (o webhook Greenn continua ativo)
- **Curso** (`eventoia-como-criar-selos-3d-animados`) — não incluído pois não foi mencionado no print

### Arquivos editados
- `src/pages/PlanosArtes.tsx` — expandir mapeamento `PAGARME_PACK_SLUGS`
- Banco de dados — INSERT de 24 produtos na `mp_products`

