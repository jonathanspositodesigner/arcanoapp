
## Adicionar Preço Original e Badge de Desconto nos Cards de Preço

Vou adicionar o preço original riscado e uma badge mostrando a porcentagem de desconto em cada plano.

### Mudanças

**1. Atualizar dados dos planos**
- **Semestral**: Adicionar `originalPrice: "81"` → preço atual R$ 59,90
- **Vitalício**: Adicionar `originalPrice: "141"` → preço atual R$ 79,90

**2. Calcular e exibir desconto**
- Semestral: De R$ 81 por R$ 59,90 = **26% off**
- Vitalício: De R$ 141 por R$ 79,90 = **43% off**

**3. Atualizar UI do preço**
- Mostrar preço original riscado acima do preço atual
- Adicionar badge com porcentagem de desconto (ex: "-26% OFF")

### Visual Final

```text
┌─────────────────────────────────────┐
│         Pack Semestral              │
│                                     │
│    ┌─────────────┐                  │
│    │  -26% OFF   │  ← Badge verde   │
│    └─────────────┘                  │
│                                     │
│      De R$ 81  ← riscado/cinza      │
│     R$ 59,90   ← preço destaque     │
│      à vista                        │
└─────────────────────────────────────┘
```

### Detalhes Técnicos

**Arquivo:** `src/components/combo-artes/PricingCardsSection.tsx`

1. Adicionar propriedade `originalPrice` em cada plano
2. Criar função para calcular porcentagem de desconto
3. Atualizar JSX da seção de preço para incluir:
   - Badge com desconto (estilo verde, posicionada acima do preço)
   - Preço original com texto riscado (`line-through`)
   - Preço atual em destaque (já existe)
