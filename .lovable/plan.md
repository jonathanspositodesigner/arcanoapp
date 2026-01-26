
## Correção Completa da Página Combo Artes Arcanas

### Problemas Identificados

Com base na análise do HTML original e da implementação atual, identifiquei os seguintes problemas:

---

### 1. CATEGORIAS DE FLYERS FALTANDO

**Implementação atual:** 3 categorias (Pagode, Forró, Sertanejo)
**Página original:** 6 categorias + Bônus Fim de Ano

**Categorias faltando:**
- ARTES DE FUNK (10 imagens)
- ARTES DE CAVALGADA (8 imagens)
- CATEGORIAS VARIADAS (10+ imagens)

**Arquivo a modificar:** `src/components/combo-artes/FlyersGallerySection.tsx`

---

### 2. MOTIONS FALTANDO

**Implementação atual:** 4 motions
**Página original:** 10 motions

**Motions faltando:**
- MOTION-FORRO-ELETRONICA
- MOTION-FUNK-BAILE
- MOTION-REVEILLON-STORIES
- MOTION-SAO-JOAO
- MOTION-HALLOWEEN
- E mais 1-2 adicionais

**Arquivo a modificar:** `src/components/combo-artes/MotionsGallerySection.tsx`

---

### 3. SEÇÃO DE BÔNUS ESPECIAL DE FIM DE ANO FALTANDO

**Não existe na implementação atual**

Deve incluir:
- Texto: "Adquirindo essa semana você leva também nosso Pack BÔNUS ESPECIAL DE FIM DE ANO"
- Carrossel com 14+ artes de Reveillon/Natal
- Badge "Especial de Fim de ano!"

**Ação:** Criar novo componente `BonusFimDeAnoSection.tsx`

---

### 4. SEÇÃO "NÃO É SÓ MAIS UM PACK" (INTRO MOTIONS) FALTANDO

**Não existe na implementação atual**

Deve incluir:
- Título: "NÃO É SÓ MAIS UM PACK DE ARTES, UMA PLATAFORMA COMPLETA!"
- Subtítulo: "MOTIONS FLYERS"
- Descrição: "Esses são alguns dos motions que você vai ter acesso dentro da nossa plataforma!"

**Arquivo a modificar:** `src/components/combo-artes/MotionsGallerySection.tsx`

---

### 5. SEÇÃO "E NÃO É SÓ ISSO" - GRID DE 8 BÔNUS FALTANDO

**Não existe na implementação atual**

Deve incluir um grid com 8 bônus:
1. BÔNUS 1 - Pack Prompts de IA
2. BÔNUS 2 - Pack Capas de Palco
3. BÔNUS 3 - Pack Agendas de Shows
4. BÔNUS 4 - Pack Mockups
5. BÔNUS 5 - Comunidade VIP
6. BÔNUS 6 - Video Aulas Exclusivas
7. BÔNUS 7 - Atualizações Semanais
8. BÔNUS 8 - Suporte VIP

**Ação:** Criar novo componente `BonusGridSection.tsx`

---

### 6. SEÇÃO DE GARANTIA FALTANDO

**Não existe na implementação atual**

Deve incluir:
- Título: "Qual a minha garantia?"
- Ícone de selo de garantia
- Texto sobre 7 dias de garantia incondicional

**Ação:** Criar novo componente `GuaranteeSectionCombo.tsx`

---

### 7. SELOS 3D INCOMPLETOS

**Implementação atual:** 8 selos
**Página original:** 26+ selos

**Arquivo a modificar:** `src/components/combo-artes/Selos3DSection.tsx`

---

### Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `BonusFimDeAnoSection.tsx` | Carrossel de artes Reveillon/Natal |
| `BonusGridSection.tsx` | Grid dos 8 bônus grátis |
| `GuaranteeSectionCombo.tsx` | Seção de garantia 7 dias |

---

### Arquivos a Modificar

| Arquivo | Modificações |
|---------|--------------|
| `FlyersGallerySection.tsx` | Adicionar categorias Funk, Cavalgada, Variadas (30+ novas imagens) |
| `MotionsGallerySection.tsx` | Adicionar título intro + 6 novos motions |
| `Selos3DSection.tsx` | Expandir de 8 para 26 selos |
| `ComboArtesArcanas.tsx` | Adicionar novos componentes na ordem correta |
| `index.ts` | Exportar novos componentes |

---

### Ordem Correta das Seções na Página

1. HeroSectionCombo
2. AreaMembrosSection
3. FlyersGallerySection (com TODAS as 6 categorias)
4. **BonusFimDeAnoSection** (NOVA)
5. MotionsGallerySection (com intro + 10 motions)
6. Selos3DSection (com 26 selos)
7. **BonusGridSection** (NOVA - 8 bônus grátis)
8. **GuaranteeSectionCombo** (NOVA)
9. PricingCardsSection
10. FAQSectionCombo
11. WhatsAppSupportSection
12. FooterSection
13. FloatingCTAMobile

---

### URLs de Imagens a Adicionar

**ARTES DE FUNK (10 imagens):**
- FLYER-EVENTO-BAILE-DA-FAVORITA-STORIES.webp
- B-DAY-DO-TUBARAO-ST.webp
- FUNK-PARTY-ST.webp
- BAILE-DO-PISTINHA-ST.webp
- FUNK-PREMIUM-ST.webp
- (+ 5 mais)

**ARTES DE CAVALGADA (8 imagens):**
- 12a-CAVALGADA-DOS-AMIGOS.webp
- RODEIO-E-VAQUEJADA.webp
- CAVALGADA-BENEFICENTE.webp
- RODEIO-COUNTRY-ST.webp
- (+ 4 mais)

**CATEGORIAS VARIADAS (10+ imagens):**
- DIA-DOS-NAMORADOS-ST.webp
- HALLOWEEN-PARTY-ST.webp
- BLACK-FRIDAY-STORIES.webp
- DIA-DAS-MAES-ST.webp
- (+ 6 mais)

**BÔNUS FIM DE ANO (14 imagens):**
- REVEILLON-DOS-SONHOS-ST.webp
- NATAL-PREMIUM-ST.webp
- FELIZ-ANO-NOVO-ST.webp
- (+ 11 mais)

**MOTIONS ADICIONAIS (6 vídeos):**
- MOTION-FORRO-ELETRONICA.mp4
- MOTION-FUNK-BAILE.mp4
- MOTION-REVEILLON-STORIES.mp4
- MOTION-SAO-JOAO.mp4
- MOTION-CAVALGADA.mp4
- MOTION-COUNTRY.mp4

**SELOS 3D (18 adicionais):**
- selo-3d-9.webp até selo-3d-26.webp

---

### Resultado Esperado

Após as correções:
- 6 categorias de flyers com 60+ artes no total
- Seção Bônus Fim de Ano com 14 artes temáticas
- 10 motions clicáveis com preview
- 26 selos 3D no carrossel
- Grid com 8 bônus grátis detalhados
- Seção de garantia 7 dias
- Página 100% fiel ao WordPress original
