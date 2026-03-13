

## Plano: Clonar seção de planos da referência para `/combo-artes-arcanas`

### O Problema
A seção de planos atual mostra "Biblioteca de Artes Arcanas" com 3 tiers genéricos (6 meses R$27, 1 ano R$37, Vitalício R$47). A referência (print 2) mostra uma estrutura completamente diferente com packs individuais e cumulativos.

### Mudanças no `PricingCardsSection.tsx`

Reescrever os 3 cards com o conteúdo exato da referência:

**Card 1 - Pack Arcano Vol.1**
- Titulo: "Pack Arcano Vol.1"
- Subtitulo: "ACESSO 1 ANO"
- Descrição: "Para quem quer começar com qualidade."
- Badge desconto: -24% OFF
- Preço riscado: De R$ 37
- Preço atual: R$ 27,90 à vista
- Features (todas com check verde):
  - **+55 Artes Editáveis** (bold)
  - 1 Ano de Acesso
  - 210 Motions Editáveis
  - 40 Selos 3D
  - Video Aulas Exclusivas
  - Bônus Exclusivos
  - Atualizações Semanais
  - Suporte via WhatsApp
  - Área de Membros
- Botão: "QUERO SÓ O PACK VOL.1" (estilo escuro/outline)

**Card 2 - Pack Arcano 1 e 2**
- Titulo: "Pack Arcano 1 e 2"
- Subtitulo: "ACESSO 1 ANO"
- Descrição: "Para quem quer mais economia e mais vantagem."
- Badge desconto: -33% OFF
- Preço riscado: De R$ 74
- Preço atual: R$ 49,90 à vista
- Features (todas com check verde):
  - **+110 Artes Editáveis** (bold)
  - 1 Ano de Acesso
  - 210 Motions Editáveis
  - 40 Selos 3D
  - Video Aulas Exclusivas
  - Bônus Exclusivos
  - Atualizações Semanais
  - Suporte via WhatsApp
  - Área de Membros
- Botão: "QUERO OS PACKS VOL.1 E 2" (estilo escuro/outline)

**Card 3 - Pack Arcano 1 ao 3 (highlight)**
- Badge topo: "MAIS VENDIDO" (laranja, com estrela)
- Titulo: "Pack Arcano 1 ao 3"
- Subtitulo: "ACESSO VITALÍCIO" (laranja)
- Descrição: "O mais vendido! 🔥"
- Badge desconto: -58% OFF
- Preço riscado: De R$ 141
- Preço atual: R$ 59,90 à vista
- Bonus badge dourado: "+20 MOVIES PARA TELÃO"
- Features (todas com check laranja):
  - **+210 Artes Editáveis** (bold)
  - **Acesso Vitalício** (bold)
  - 210 Motions Editáveis
  - 40 Selos 3D
  - Video Aulas Exclusivas
  - Bônus Exclusivos
  - Atualizações Semanais
  - Suporte via WhatsApp
  - Área de Membros
- Botão: "QUERO OS PACKS 1 AO 3" (laranja/gradient, destaque)

### O que NÃO muda
- Links de checkout permanecem os mesmos
- Contador e seção de garantia abaixo dos cards permanecem
- Lógica de UTM e Meta Pixel permanecem
- Nenhum outro arquivo é alterado

### Arquivo editado
- `src/components/combo-artes/PricingCardsSection.tsx` — reescrever o array `plans` e ajustar rendering (adicionar campo `description`, mudar badge de "MAIS POPULAR" para "MAIS VENDIDO", tornar todas features habilitadas, bold nas primeiras 1-2 features de cada card)

