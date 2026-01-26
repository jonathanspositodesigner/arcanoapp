
# Plano: Seção de Features abaixo da Hero

## O que será feito
Adicionar uma nova seção com 5 cards de features logo abaixo da Hero section na página Combo Artes Arcanas.

## Features que serão incluídas
1. **Acesso Imediato** - Ícone de raio/velocidade
2. **7 Dias de Garantia** - Ícone de escudo/garantia
3. **Grupo VIP no WhatsApp** - Ícone de mensagem
4. **Suporte Técnico Exclusivo** - Ícone de headset
5. **Plataforma de Membros** - Ícone de usuários

## Design dos Cards
- Layout em grid: 2 colunas no mobile, 5 colunas no desktop
- Cards com fundo gradiente escuro (consistente com o resto da página)
- Borda sutil com hover effect laranja (#EF672C)
- Ícones circulares com fundo semi-transparente laranja
- Texto branco com descrição em cinza

---

## Detalhes Técnicos

### Arquivos a criar
1. **`src/components/combo-artes/FeaturesSection.tsx`** - Novo componente com os 5 cards de features

### Arquivos a modificar
1. **`src/components/combo-artes/index.ts`** - Adicionar export do novo componente
2. **`src/pages/ComboArtesArcanas.tsx`** - Importar e posicionar a FeaturesSection logo abaixo da HeroSectionCombo

### Estrutura do componente
```tsx
// Array com as 5 features
const features = [
  { icon: Zap, title: "Acesso Imediato", description: "..." },
  { icon: Shield, title: "7 Dias de Garantia", description: "..." },
  { icon: MessageCircle, title: "Grupo VIP no WhatsApp", description: "..." },
  { icon: Headphones, title: "Suporte Técnico Exclusivo", description: "..." },
  { icon: Users, title: "Plataforma de Membros", description: "..." },
]

// Grid responsivo com cards estilizados
```

### Ordem das seções (após implementação)
1. HeroSectionCombo
2. **FeaturesSection** (NOVA)
3. FlyersGallerySection
4. BonusFimDeAnoSection
5. MotionsGallerySection
6. ... (restante mantido)
