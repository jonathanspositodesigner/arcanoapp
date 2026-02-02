

# Plano: Adicionar Botão de Recarga de Créditos + Página de Planos

## Resumo

Adicionar um ícone de "+" clicável próximo ao saldo de créditos que levará os usuários para uma nova página de venda de pacotes de créditos vitalícios.

## Pacotes de Créditos

| Pacote | Créditos | Uso Aproximado |
|--------|----------|----------------|
| Básico | 1.500 | ~25 upscales Standard |
| Popular | 4.200 | ~70 upscales Standard |
| Profissional | 10.800 | ~180 upscales Standard |

## Arquivos a Modificar/Criar

### 1. `src/components/ToolsHeader.tsx`
- Adicionar ícone `PlusCircle` verde ao lado do badge de créditos
- Ao clicar, navega para `/planos-creditos`

### 2. `src/components/upscaler/CreditsCard.tsx`
- Adicionar botão "Comprar Créditos" abaixo do breakdown
- Navega para `/planos-creditos`

### 3. `src/pages/PlanosCreditos.tsx` (CRIAR)
Nova página com:
- Header com botão voltar e título
- Descrição sobre créditos vitalícios
- 3 cards de planos (1500, 4200, 10800 créditos)
- Botões de checkout (links placeholder por enquanto)
- Visual consistente com tema roxo escuro

### 4. `src/App.tsx`
- Adicionar lazy import da página
- Registrar rota `/planos-creditos`

## Layout da Página

```text
+------------------------------------------+
|  ← Voltar         Comprar Créditos       |
+------------------------------------------+
|                                          |
|    💎 Recarregue seus Créditos de IA     |
|    "Créditos vitalícios que nunca        |
|     expiram - use quando quiser!"        |
|                                          |
|  +------------+  +------------+          |
|  |   1.500    |  |   4.200    |          |
|  |  créditos  |  |  créditos  |          |
|  |  ~25 usos  |  |  ~70 usos  |          |
|  |  R$ XX,XX  |  |  R$ XX,XX  |          |
|  |  [Comprar] |  |  [Comprar] |          |
|  +------------+  +------------+          |
|                                          |
|         +----------------+               |
|         |    10.800      |               |
|         |   créditos     |               |
|         |   ~180 usos    |               |
|         |   R$ XX,XX     |               |
|         | ⭐ MELHOR VALOR |               |
|         |   [Comprar]    |               |
|         +----------------+               |
|                                          |
+------------------------------------------+
```

## Detalhes Técnicos

### Ícone no Header
```tsx
// Ao lado do badge de créditos
<Button
  variant="ghost"
  size="icon"
  onClick={() => navigate('/planos-creditos')}
  className="h-7 w-7 text-green-400 hover:text-green-300"
>
  <PlusCircle className="w-4 h-4" />
</Button>
```

### Estrutura dos Planos
```tsx
const creditPlans = [
  { credits: 1500, description: "~25 upscales Standard", price: "XX,XX", link: "#" },
  { credits: 4200, description: "~70 upscales Standard", price: "XX,XX", link: "#", popular: true },
  { credits: 10800, description: "~180 upscales Standard", price: "XX,XX", link: "#", bestValue: true },
];
```

## Observação

Os preços e links de checkout da Greenn serão placeholder por enquanto. Você pode me informar os valores e links reais posteriormente para eu atualizar.

