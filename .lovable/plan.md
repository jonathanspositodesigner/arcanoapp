

## Corrigir botão do Arcano Cloner e adicionar tag "Nova Ferramenta"

### Problema
O botão "Acessar Ferramenta" do Arcano Cloner está com a cor roxa (gradiente purple/fuchsia) ao invés de verde como as outras ferramentas. Isso acontece porque a função `checkToolAccess` retorna `false` para o slug `arcano-cloner`, já que ele não está vinculado a nenhum pack no banco de dados.

### Solução

**Arquivo: `src/pages/FerramentasIAAplicativo.tsx`**

1. **Corrigir a cor do botão**: Adicionar `arcano-cloner` na função `checkToolAccess` para que retorne `true` (acesso livre), fazendo o botão ficar verde (`bg-green-500`) como os demais.

2. **Adicionar tag "Nova Ferramenta"**: No `renderToolCard`, adicionar um badge/tag posicionado no canto superior direito do card quando o slug for `arcano-cloner`. O badge terá:
   - Texto: "NOVO"
   - Icone: `Sparkles` do lucide-react
   - Estilo: fundo verde vibrante (`bg-green-500`), texto branco, com leve animação pulse para chamar atenção
   - Posição: `absolute top-2 right-2 z-10`

### Detalhes Técnicos

```text
checkToolAccess("arcano-cloner")
  Antes:  false (cai no hasAccessToPack que retorna false)
  Depois: true  (retorno direto antes de chegar no hasAccessToPack)
```

Mudança na função `checkToolAccess`:
- Adicionar condição: `if (slug === "arcano-cloner") return true;`

Badge "NOVO" no card:
- Inserido dentro do `div.aspect-[16/9]`, antes da imagem
- Classes: `absolute top-2 right-2 z-10 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse`

Nenhuma outra ferramenta ou arquivo precisa ser alterado.

