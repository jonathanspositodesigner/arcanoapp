

# Stats Card com Animação + Trocar Título

## O que será feito

1. **Trocar o título** "ESCOLHA O MELHOR PLANO PARA VOCÊ" por "LIBERTE SUA CRIATIVIDADE" nos arquivos de tradução (PT e ES)

2. **Criar componente `StatsCards`** (`src/components/credits/StatsCards.tsx`) que:
   - Busca o total de imagens geradas via RPC `get_ai_tools_cost_averages` (soma de `total_completed` de todas as ferramentas)
   - Exibe 3 cards lado a lado no estilo do print:
     - **+{total} Imagens geradas** (número real do banco)
     - **+247 Vídeos gerados** (valor fixo)
     - **100% Satisfação** (valor fixo)
   - Usa o hook `useAnimatedNumber` existente para animar os números de 0 até o valor final
   - Visual: cards com fundo glassmorphism escuro (`bg-white/[0.03]`, `border-white/10`), ícones coloridos, números grandes com gradiente

3. **Inserir o componente** nas páginas `Planos2.tsx` e `PlanosCreditos.tsx`, logo abaixo do título "LIBERTE SUA CRIATIVIDADE" e acima do billing toggle

## Detalhes técnicos

- A query é pública (RPC sem auth), então funciona para visitantes não logados
- O hook `useAnimatedNumber` já existe em `src/hooks/useAnimatedNumber.ts` com easing cubic
- Os cards terão layout responsivo: 3 colunas em desktop, 1 coluna em mobile
- Arquivo de tradução ES também será atualizado para "LIBERA TU CREATIVIDAD"

