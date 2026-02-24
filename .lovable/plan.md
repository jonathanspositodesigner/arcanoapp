

## Adicionar quantidade aproximada de imagens abaixo dos créditos em cada card

Cada imagem custa 60 créditos. Vou adicionar a informação "~ X imagens/mês" logo abaixo do badge de créditos em todos os cards (mensal e anual parcelado).

### Cálculos

| Plano | Créditos | Imagens (creditos / 60) |
|-------|----------|------------------------|
| Free | 300 | 5 |
| Starter | 1.800 | 30 |
| Pro | 4.200 | 70 |
| Ultimate | 10.800 | 180 |
| IA Unlimited | Ilimitados | Ilimitadas |

### O que será feito

**Arquivo:** `src/pages/Planos2.tsx`

1. Adicionar a propriedade `images` em todos os planos **mensais** que ainda não têm:
   - Free: `images: 5`
   - Starter: `images: 30`
   - Pro: `images: 70`
   - Ultimate: `images: 180`
   - IA Unlimited: `images: "Ilimitadas"`

2. Adicionar `images` nos planos **anuais** que faltam:
   - Free: `images: 5`
   - IA Unlimited: `images: "Ilimitadas"`

3. Ajustar a renderização do badge de créditos (linha ~470-478) para mostrar a quantidade de imagens em **todos** os planos (mensal e anual), não apenas nos anuais como está hoje. A linha de imagens já existe (`= X imagens/mês`), basta garantir que apareça para todos os planos que tenham a propriedade `images`.

Resultado visual: abaixo de cada badge de créditos aparecerá algo como `~ 70 imagens/mês` em texto pequeno roxo.
