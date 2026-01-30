
# Plano: Corrigir Contraste e Unificar Cores da Biblioteca de Prompts

## Problema Identificado

A Biblioteca de Prompts tem vários elementos com cores que não combinam com a identidade visual roxa ou possuem baixo contraste:

| Elemento | Cor Atual | Problema |
|----------|----------|----------|
| Botões da sidebar (Gerar no ChatGPT, etc) | Texto branco/roxo claro | Baixíssimo contraste, quase ilegível |
| Botão "Torne-se Premium" | Gradiente amarelo/laranja | Não combina com a paleta roxa |
| Botão "Ferramentas de IA" | Verde (`bg-green-600`) | Cor destoante da identidade |
| Botão "Fazer Login" | Borda roxa clara | Baixo contraste |
| Aba "Comunidade" | Borda roxa clara | Baixo contraste |

## Solução: Nova Paleta de Cores

Todas as cores serão unificadas para combinar com a identidade visual roxa:

### 1. Botões da Sidebar (Gerar com IA)
**De:** `border-purple-500/30 text-purple-200` (baixo contraste)
**Para:** `bg-[#1A0A2E] border-purple-500/50 text-white` + hover mais vibrante

### 2. Botão "Torne-se Premium"  
**De:** `bg-gradient-to-r from-yellow-500 to-orange-500` (amarelo)
**Para:** `bg-gradient-to-r from-purple-500 to-pink-500` (roxo/rosa - combina com identidade)

### 3. Botão "Ferramentas de IA"
**De:** `bg-green-600` (verde destoante)
**Para:** `bg-gradient-to-r from-fuchsia-500 to-purple-600` (fúcsia/roxo - destaque moderno)

### 4. Botão "Fazer Login"
**De:** `border-purple-500/30 text-purple-200`
**Para:** `bg-purple-900/50 border-purple-400/50 text-white`

### 5. Aba "Comunidade" (não selecionada)
**De:** `border-purple-500/30 text-purple-300`
**Para:** `bg-purple-900/30 border-purple-400/50 text-purple-200`

## Mudanças Específicas no Código

### Arquivo: `src/pages/BibliotecaPrompts.tsx`

#### Botões da Sidebar (linhas 653-664)
```tsx
// ANTES
className="w-full h-auto py-4 px-4 ... border-purple-500/30 text-purple-200 hover:text-white"

// DEPOIS  
className="w-full h-auto py-4 px-4 ... bg-purple-900/40 border-purple-400/50 text-white hover:bg-purple-500/30"
```

#### Botão "Torne-se Premium" (múltiplas ocorrências)
```tsx
// ANTES
className="bg-gradient-to-r from-yellow-500 to-orange-500 ..."

// DEPOIS
className="bg-gradient-to-r from-purple-500 to-pink-500 ..."
```

#### Botão "Ferramentas de IA" (linha 668-674)
```tsx
// ANTES
className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white ..."

// DEPOIS
className="w-full mt-6 bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:opacity-90 text-white ..."
```

#### Botão "Fazer Login" (linha 644)
```tsx
// ANTES
className="w-full border-purple-500/30 text-purple-200 hover:bg-purple-500/20 ..."

// DEPOIS
className="w-full bg-purple-900/50 border-purple-400/50 text-white hover:bg-purple-500/30 ..."
```

## Resumo Visual da Nova Paleta

```text
┌─────────────────────────────────────────────┐
│  SIDEBAR                                     │
│  ┌─────────────────────────────────────────┐│
│  │ Instalar App     (gradiente roxo/rosa)  ││
│  └─────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────┐│
│  │ Torne-se Premium (gradiente roxo/rosa)  ││
│  └─────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────┐│
│  │ Fazer Login      (roxo escuro sólido)   ││
│  └─────────────────────────────────────────┘│
│                                              │
│  Gere com IA                                 │
│  ┌─────────────────────────────────────────┐│
│  │ Gerar no ChatGPT (fundo roxo escuro)    ││
│  └─────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────┐│
│  │ Gerar no Whisk   (fundo roxo escuro)    ││
│  └─────────────────────────────────────────┘│
│                                              │
│  ┌─────────────────────────────────────────┐│
│  │ Ferramentas IA   (gradiente fúcsia)     ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

## Arquivo a Modificar

- `src/pages/BibliotecaPrompts.tsx` - Atualizar classes de cores dos botões

## Resultado Esperado

- Todos os botões terão contraste adequado
- Cores unificadas na paleta roxa/rosa/fúcsia
- Identidade visual consistente e moderna
- Sem amarelo, laranja ou verde destoantes
