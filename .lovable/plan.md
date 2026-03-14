

## Plano: Card Único com Seletor de Período — Ordem Atualizada

Mesmo plano anterior, com uma única mudança na ordem dos radio buttons:

```text
┌─────────────────────────────────────────────┐
│          ★ Melhor valor (badge)             │
│                                             │
│           [imagem do pack]                  │
│         Pack Arcano Vol. 1                  │
│                                             │
│      ~~R$ 47,00~~  -20%                     │
│        R$ 37,60                             │
│       pagamento único                       │
│                                             │
│   ● Vitalício ─ R$ 37,60  ← pré-selecionado│
│   ○ 1 ano ───── R$ 29,60                   │
│   ○ 6 meses ─── R$ 21,60                   │
│                                             │
│  ✓ Acesso completo ao pack                  │
│  ✓ Downloads ilimitados                     │
│  ✓ Arquivos editáveis                       │
│  ✓ Atualizações permanentes                 │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  👑 Comprar com desconto de membro  │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### Mudança técnica

**Arquivo**: `src/pages/PlanosArtesMembro.tsx`

1. Substituir grid de 3 cards por um único `Card` centralizado
2. Ao renderizar as opções no `RadioGroup`, ordenar como: **Vitalício → 1 ano → 6 meses** (ordem fixa no código, filtrando apenas os que estão enabled)
3. Vitalício pré-selecionado por padrão
4. Preço, botão e features atualizam dinamicamente conforme seleção
5. Packs com opção única mostram apenas essa opção

