

# Plano: 3 Cards de Preço na PricingCardsSection

## O que mudar

Arquivo: `src/components/combo-artes/PricingCardsSection.tsx`

### Estrutura atual
- 1 card de preço (vitalício R$37) + 1 card de garantia
- Layout: `grid-cols-1 md:grid-cols-[3fr_2fr]`

### Nova estrutura
- 3 cards de preço + 1 card de garantia abaixo
- Layout: `grid-cols-1 md:grid-cols-3` para os cards de preço, garantia separada abaixo

### 3 Planos

| Plano | Preço | Destaque | Bônus |
|-------|-------|----------|-------|
| 6 Meses | R$ 27,00 | Não | **Sem bônus** (remove da lista) |
| 1 Ano | R$ 37,00 | Não | Com bônus |
| Vitalício | R$ 47,00 | **Sim** (borda laranja, badge "MAIS POPULAR") | Com bônus |

### Features por plano
- **6 meses**: Remove "Bônus Exclusivos" e o banner "+40 ARTES DE SÃO JOÃO". Features: +40 Artes Inéditas, Acesso por 6 Meses, 210 Motions, 40 Selos 3D, Video Aulas, Atualizações Semanais, Suporte WhatsApp, Área de Membros
- **1 ano**: Todas as features + bônus. Acesso por 1 Ano
- **Vitalício**: Todas as features + bônus. Acesso Vitalício. Card em destaque com borda laranja e badge

### Product slugs
Cada plano precisará de um `product_slug` diferente para o checkout. Vou usar:
- `pack4-6meses`
- `pack4-1ano`  
- `pack4lancamento` (existente, para vitalício)

O `handlePurchase` receberá o slug como parâmetro.

### Layout
- Cards de preço em grid de 3 colunas no desktop, 1 coluna no mobile (vitalício primeiro no mobile por ser destaque)
- Card de garantia fica em seção separada abaixo, largura total
- Countdown de urgência movido para fora dos cards (compartilhado)

