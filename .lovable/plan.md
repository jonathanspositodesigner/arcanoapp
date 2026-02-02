
# Plano: Atualizar Página de Créditos com Preços e Apresentação das Ferramentas

## Resumo

Transformar a página de créditos em uma mini landing page que apresenta as ferramentas de IA disponíveis antes de mostrar os planos de recarga.

## Mudanças a Implementar

### 1. Atualizar Preços
```tsx
const creditPlans = [
  { credits: 1500, price: "29,90", ... },
  { credits: 4200, price: "39,90", ... },
  { credits: 10800, price: "99,90", ... },
];
```

### 2. Adicionar Seção de Apresentação das Ferramentas

**Ferramentas Disponíveis:**
- **Upscaler Arcano** - Aumente a qualidade das suas imagens com IA
- **Forja de Selos 3D** - Crie selos e emblemas 3D profissionais
- **Mudar Roupa** - Troque a roupa de pessoas em fotos
- **Mudar Pose** - Altere a pose de pessoas em imagens

**Em Breve:**
- Upscaler de Vídeo
- Remoção de Fundo
- Edição Automática de Fotos
- Remover Objeto
- Gerar Telões de LED
- Gerar Narração e Música

### 3. Estrutura Visual da Página

```text
+------------------------------------------+
|  ← Voltar         Comprar Créditos       |
+------------------------------------------+
|                                          |
|    🚀 Ferramentas de IA Integradas       |
|    "Tudo em forma de aplicativo,         |
|     mais fácil e prático!"               |
|                                          |
|  [Grid 2x2 de Ferramentas Disponíveis]   |
|  +----------+  +----------+              |
|  | Upscaler |  | Forja 3D |              |
|  +----------+  +----------+              |
|  +----------+  +----------+              |
|  | Roupa IA |  | Pose IA  |              |
|  +----------+  +----------+              |
|                                          |
|    🔮 Em Breve                           |
|  [Lista de ferramentas futuras]          |
|                                          |
+------------------------------------------+
|                                          |
|    💎 Recarregue seus Créditos           |
|    "Créditos vitalícios!"                |
|                                          |
|  [Cards de planos: 29,90 / 39,90 / 99,90]|
|                                          |
+------------------------------------------+
```

## Arquivo a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/pages/PlanosCreditos.tsx` | Adicionar seção de ferramentas, atualizar preços |

## Ícones a Usar

- `Wand2` - Upscaler Arcano
- `Box` - Forja de Selos 3D  
- `Shirt` - Mudar Roupa
- `PersonStanding` - Mudar Pose
- `Clock` ou `Sparkles` - Em Breve

## Observações

- Layout será responsivo (2 colunas no mobile, 4 no desktop para ferramentas)
- Seção "Em Breve" terá badges sutis para cada ferramenta futura
- Mantém o visual roxo escuro consistente com a plataforma
- Texto conciso e objetivo, estilo landing page mas compacto
