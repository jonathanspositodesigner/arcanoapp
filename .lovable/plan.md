

## Recriar Página "Biblioteca de Artes Arcanas - Combo 3 em 1" no React

### Resumo

Vou criar uma nova página React que replica EXATAMENTE a landing page WordPress "Biblioteca de Artes Arcanas - 3 packs pelo preço de 1" (combo3em1) que você enviou. A página será adicionada na rota `/combo-artes-arcanas`.

---

### Seções da Página (ordem exata do WordPress)

| # | Seção | Descrição |
|---|-------|-----------|
| 1 | Hero Mobile | Logo + Título "Leve 3 Packs pelo Preço de 1" + Subtítulo + Badge membros |
| 2 | Hero Desktop | Símbolo gold + Screenshot área de membros + Título "BEM VINDO À BIBLIOTECA DE ARTES ARCANAS" + Cards de benefícios |
| 3 | "VEJA TUDO QUE VOCÊ VAI RECEBER" | Título animado com gradiente |
| 4 | Galeria Flyers | Badge "FLYERS EDITÁVEIS" + Carrosséis: Pagode, Forró, Sertanejo com imagens |
| 5 | Galeria Motions | Badge "MOTIONS EDITÁVEIS" + Grid de vídeos com thumbnails (clicáveis) |
| 6 | CTA Central | Botão "QUERO ESSAS ARTES E MOTIONS" + Badge "Compra Segura" |
| 7 | Bônus | Badge "PACK DE SELOS 3D" + Carrossel de selos + Cards com recursos |
| 8 | Planos de Preço | 3 cards: Trimestral (R$9,90 3x), Semestral (R$9,90 6x), Vitalício (R$6,66 12x) com lista de benefícios |
| 9 | FAQ | Accordion com 5 perguntas frequentes |
| 10 | Suporte WhatsApp | "Ainda tem dúvidas?" + Botão WhatsApp |
| 11 | Footer | Nome + CNPJ + Direitos reservados |
| 12 | Botão Fixo Mobile | CTA flutuante no rodapé para mobile |

---

### Arquivos a Criar

#### Estrutura de Componentes

```text
src/pages/ComboArtesArcanas.tsx          # Página principal
src/components/combo-artes/
├── index.ts                             # Exports
├── HeroSectionCombo.tsx                 # Hero com logo e título
├── AreaMembrosSection.tsx               # Símbolo gold + screenshot
├── FlyersGallerySection.tsx             # Carrosséis de artes por categoria
├── MotionsGallerySection.tsx            # Grid de vídeos
├── Selos3DSection.tsx                   # Pack de selos 3D
├── PricingCardsSection.tsx              # 3 planos de preço
├── FAQSectionCombo.tsx                  # Accordion FAQ
├── WhatsAppSupportSection.tsx           # Suporte WhatsApp
├── FooterSection.tsx                    # Footer com CNPJ
└── FloatingCTAMobile.tsx                # Botão fixo mobile
```

---

### Detalhes de Cada Seção

#### 1. Hero Section (Mobile + Desktop)

**Elementos:**
- Logo: `https://voxvisual.com.br/wp-content/uploads/2024/11/LOGO-CLLR-1.png`
- Título: "Leve 3 Packs de Artes **pelo Preço de 1**" (laranja: #EF672C)
- Subtítulo: "+ de 200 Artes Editáveis PSD e CANVA! Promoção por tempo limitado!"
- Badge membros: Ícone + "+2200 Membros ativos!"

**Cores:**
- Background: Gradiente escuro
- Texto principal: Branco
- Destaque: #EF672C (laranja)

#### 2. Área de Membros Section

**Elementos:**
- Símbolo gold: `https://voxvisual.com.br/wp-content/uploads/2025/11/simbolo-gold-2.webp`
- Screenshot: `https://voxvisual.com.br/wp-content/uploads/2025/11/area-de-membros.webp`
- Título: "SEJA BEM VINDO À BIBLIOTECA DE ARTES ARCANAS!"
- Descrição: "Uma plataforma completa com tudo que você precisa..."

**3 Cards de Benefícios:**
1. Comunidade: Ícone + "+1700 Membros Ativos na Comunidade"
2. Canva/Photoshop: Ícone + "Edite tudo canva ou photoshop"
3. Suporte: Ícone + "suporte técnico exclusivo e dedicado"

#### 3. Galeria de Flyers

**Categorias com Carrosséis:**
1. ARTES DE PAGODE (10 imagens)
2. ARTES DE FORRÓ (10 imagens)
3. ARTES DE SERTANEJO (10 imagens)

**Imagens (URLs do WordPress):**
- Pagode: FESTEJA-TROPICAL, MIXTURADINHO, BYE-BYE-FERIAS, HOJE-JONAS-ESTICADO, etc.
- Forró: similares
- Sertanejo: similares

#### 4. Galeria de Motions

**Grid de 4 vídeos com thumbnails:**
1. AGENDA-HERIQUE-E-JULIANO.webp → vídeo MP4
2. HALLOWGRILL.webp → vídeo MP4
3. ATRACAO-CONFIRMADA-MC-PEDRINHO.webp → vídeo MP4
4. (mais vídeos)

**Comportamento:** Click abre modal com vídeo

#### 5. Pack de Selos 3D

**Elementos:**
- Badge: "PACK DE SELOS 3D"
- Carrossel de selos 3D
- Cards com recursos de IA

#### 6. Pricing Cards (3 planos)

**Plano Trimestral:**
- Título: "Pack arcano 1 ao 3 acesso TRIMESTRAL"
- Subtítulo: "Para quem quer testar tudo sem compromisso."
- Lista: 3 Meses, 200 Artes, 210 Motions, 40 Selos 3D, Video Aulas, Bônus, Atualizações, WhatsApp, Área de Membros
- Preço: 3x R$9,90 ou R$29,90 à vista
- Link: `https://payfast.greenn.com.br/147967/offer/e6jRLB...`

**Plano Semestral:**
- Título: "Pack arcano 1 ao 3 acesso semestral"
- Subtítulo: "Para quem quer mais economia e mais vantagem."
- Preço: 6x R$9,90 ou R$59,90 à vista
- Link: `https://payfast.greenn.com.br/147968/offer/KeCO0d...`

**Plano Vitalício (destaque):**
- Título: "Pack arcano 1 ao 3 acesso vitalício"
- Subtítulo: "O mais vendido! 🔥"
- Bônus Extra: +30 Artes Reveillon e Natal
- Preço: 12x R$6,66 ou R$79,90 à vista
- Link: `https://payfast.greenn.com.br/redirect/246696...`

#### 7. FAQ Section

**5 Perguntas:**
1. "Como vou receber o meu acesso?" → Resposta sobre email
2. "Qual programa preciso para editar as artes?" → Canva e Photoshop
3. "O pacote inclui suporte técnico?" → Sim, email e video aulas
4. "Sou iniciante, é pra mim?" → Excelente escolha para iniciantes
5. "O pack recebe atualizações?" → Sim, 1 arte por semana

#### 8. WhatsApp Support

- Título: "Ainda tem dúvidas?"
- Subtítulo: "Fale diretamente comigo pelo whatsapp"
- Botão verde: "CHAMAR NO WHATSAPP" → Link WhatsApp

#### 9. Footer

- Nome: "Jonathan Christian Spósito Santos"
- CNPJ: "56.413.822/000-159"
- Copyright: "Todos os direitos reservados ©"

#### 10. Floating CTA Mobile

- Botão fixo: "DESBLOQUEAR 1 ano de acesso"
- Texto: "Esta oferta é válida somente em dezembro!"

---

### URLs das Imagens (WordPress)

Todas as imagens serão carregadas diretamente das URLs do WordPress original para manter fidelidade visual:

```text
# Logo
https://voxvisual.com.br/wp-content/uploads/2024/11/LOGO-CLLR-1.png

# Hero
https://voxvisual.com.br/wp-content/uploads/2024/12/AssetAlunosIC.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/simbolo-gold-2.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/area-de-membros.webp

# Ícones
https://voxvisual.com.br/wp-content/uploads/2025/11/COMUNIDADE.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/tablet-and-laptop.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/suport-1.png

# Artes Pagode
https://voxvisual.com.br/wp-content/uploads/2025/11/FESTEJA-TROPICAL-ST.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/MIXTURADINHO-ST.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/BYE-BYE-FERIAS.webp
... (mais 7)

# Motions (thumbnails)
https://voxvisual.com.br/wp-content/uploads/2025/11/AGENDA-HERIQUE-E-JULIANO.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/HALLOWGRILL.webp
https://voxvisual.com.br/wp-content/uploads/2025/11/ATRACAO-CONFIRMADA-MC-PEDRINHO.webp

# Motions (vídeos)
https://voxvisual.com.br/wp-content/uploads/2025/11/MOTION-Flyer-HallowGrill-Stories-Social-Media.mp4
https://voxvisual.com.br/wp-content/uploads/2025/11/MOTION-ATRACAO-CONFIRMADA-MC-PEDRINHO-1.mp4

# Compra Segura
https://voxvisual.com.br/wp-content/uploads/2025/11/greenn-compra-segura.png
https://voxvisual.com.br/wp-content/uploads/2025/11/compra-Segura-vetor-branco1-1.png
```

---

### Rota

Adicionar no `App.tsx`:
```typescript
<Route path="/combo-artes-arcanas" element={<ComboArtesArcanas />} />
```

---

### Cores e Estilo

| Elemento | Cor |
|----------|-----|
| Background principal | Preto/Gradiente escuro |
| Texto principal | Branco |
| Destaque/CTA | #EF672C (laranja) / #f65928 |
| Cards | Fundo escuro com borda sutil |
| Botões compra | Laranja com gradiente |
| WhatsApp | Verde (#25D366) |

---

### Funcionalidades

1. **Meta Pixel**: ViewContent + InitiateCheckout (igual outras páginas)
2. **UTM Tracking**: appendUtmToUrl para links de checkout
3. **Carrosséis**: Usar embla-carousel-react (já instalado)
4. **Vídeos**: Modal com player ao clicar thumbnail
5. **FAQ**: Accordion com radix-ui
6. **Animações**: useScrollAnimation para fade-in
7. **Responsivo**: Mobile-first, esconde/mostra seções por breakpoint

---

### Resultado

Uma página React que replica fielmente a landing page WordPress, mantendo:
- Todas as imagens nas mesmas posições
- Todos os textos exatos
- Mesma estrutura de seções
- Mesmos links de checkout Greenn
- Mesmo estilo visual (cores, gradientes, espaçamentos)
- Carrosséis funcionais
- Vídeos clicáveis
- FAQ expansível
- CTA mobile fixo

