
# Plano: Atualizar Preços e Adicionar Badges de Créditos na Planos-2

## Objetivo
Atualizar os preços dos planos na página `/planos-2` e adicionar badges visuais de créditos de IA abaixo do botão "Assinar", com um degradê moderno de prata para azul.

## Novos Valores

| Plano | Preço Mensal | Créditos de IA |
|-------|--------------|----------------|
| Starter | R$19,90/mês | 1.800 créditos |
| Pro | R$29,90/mês | 4.400 créditos |
| IA Unlimited | R$59,90/mês | Ilimitados |

## O que será implementado

### 1. Atualizar preços mensais
- **Starter**: de R$14,90 para R$19,90
- **Pro**: de R$20,90 para R$29,90  
- **IA Unlimited**: de R$29,90 para R$59,90

### 2. Adicionar propriedade de créditos
Cada plano receberá uma nova propriedade `credits` para armazenar a informação dos créditos:
- Starter: `"1.800 créditos de IA"`
- Pro: `"4.400 créditos de IA"`
- IA Unlimited: `"Créditos Ilimitados"`

### 3. Criar Badge de Créditos
Logo abaixo do botão "Assinar", centralizado, será adicionado um badge com:
- Gradiente moderno de **prata (#C0C0C0 / #A0A0A0)** para **azul (#3B82F6 / #1E40AF)**
- Ícone de faísca/sparkle para destacar
- Texto com os créditos do plano
- Padding e bordas arredondadas elegantes

### 4. Estilo do Badge
```css
/* Gradiente aplicado */
background: linear-gradient(90deg, #9CA3AF → #3B82F6 → #1E40AF)
```

O badge terá:
- Bordas arredondadas completas (rounded-full)
- Padding horizontal e vertical balanceado
- Texto em branco para contraste
- Posicionamento centralizado abaixo do botão

## Detalhes Técnicos

**Arquivo a ser modificado:**
- `src/pages/Planos2.tsx`

**Mudanças no objeto de planos:**
```typescript
// Starter mensal
price: "19,90",
credits: "1.800 créditos de IA",

// Pro mensal  
price: "29,90",
credits: "4.400 créditos de IA",

// IA Unlimited mensal
price: "59,90",
credits: "Créditos Ilimitados",
```

**Novo elemento JSX (após o Button):**
```jsx
{/* Badge de Créditos */}
<div className="flex justify-center mb-4">
  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium text-white bg-gradient-to-r from-gray-400 via-blue-500 to-blue-700">
    <Sparkles className="w-3.5 h-3.5" />
    {plan.credits}
  </span>
</div>
```

## Resultado Visual
Cada card de plano terá:
1. Nome do plano
2. Preço atualizado
3. Botão "Assinar"
4. **Badge de créditos** (centralizado, com degradê prata→azul)
5. Lista de features
