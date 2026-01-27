
## Simplificação da Seção de Preços

Vou atualizar a seção de preços removendo o plano trimestral e modificando a exibição de preços para mostrar apenas o valor à vista.

### Mudanças a Fazer

**1. Remover o plano Trimestral**
- Deletar completamente o objeto do plano "trimestral" do array `plans`
- Manter apenas os planos "semestral" e "vitalício"

**2. Simplificar exibição de preços**
- Remover a exibição de parcelamento (6x de R$9,90 e 12x de R$6,66)
- Mostrar apenas o preço à vista como preço principal
- Atualizar os dados dos planos:
  - **Semestral**: R$ 59,90 à vista
  - **Vitalício**: R$ 79,90 à vista

**3. Ajustar o grid**
- Mudar de `md:grid-cols-3` para `md:grid-cols-2` já que teremos apenas 2 planos

### Detalhes Técnicos

```text
Arquivo: src/components/combo-artes/PricingCardsSection.tsx

ANTES (3 planos com parcelamento):
┌─────────────┬─────────────┬─────────────┐
│  Trimestral │  Semestral  │  Vitalício  │
│  3x R$9,90  │  6x R$9,90  │ 12x R$6,66  │
│  (R$29,90)  │  (R$59,90)  │  (R$79,90)  │
└─────────────┴─────────────┴─────────────┘

DEPOIS (2 planos, só à vista):
┌─────────────────┬─────────────────┐
│    Semestral    │    Vitalício    │
│    R$ 59,90     │    R$ 79,90     │
└─────────────────┴─────────────────┘
```

- Remover propriedades `installments` e `price` (parcelado)
- Usar `fullPrice` como preço principal
- Atualizar estrutura do JSX para exibir apenas o preço à vista
