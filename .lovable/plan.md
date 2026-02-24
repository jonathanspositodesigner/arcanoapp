

## Adicionar seção de créditos avulsos na página /planos-2

Abaixo da grade de planos de assinatura, será adicionada uma nova seção com o titulo "Compre um pacote de créditos avulsos" contendo os 3 cards de pacotes de créditos vitalícios, no mesmo estilo visual da pagina atual de créditos.

### O que sera adicionado

Uma nova seção logo abaixo dos cards de assinatura (antes do modal "Coming Soon") contendo:

1. **Titulo e subtitulo** - "Compre um pacote de créditos avulsos" com a mensagem de creditos vitalicios
2. **3 cards de creditos** com os valores atualizados:
   - 1.500 creditos por R$ 19,90 (original R$ 39,90)
   - 4.200 creditos por R$ 29,90 (original R$ 49,90) - badge "POPULAR"
   - 14.000 creditos por R$ 79,90 (original R$ 149,90) - badge "MELHOR VALOR"
3. **Badges de economia** - 46% e 57% nos pacotes maiores
4. **Badge "Vitalicio"** em todos os cards
5. **Botao "Comprar Agora"** com link para pagamento Greenn
6. **Nota informativa** explicando que creditos vitalicios sao consumidos apos os mensais

### Detalhes tecnicos

**Arquivo editado:** `src/pages/Planos2.tsx`

- Importar icones adicionais: `Coins`, `Zap`, `Star`, `Tag`
- Adicionar array `creditPlans` com os 3 pacotes (mesmos dados e links do `PlanosCreditos.tsx`)
- Inserir a seção de creditos entre o fechamento do `StaggeredAnimation` (linha 536) e o dialog "Coming Soon" (linha 539)
- Estilo dos cards: fundo `bg-[#1A0A2E]`, bordas roxas, gradientes nos icones e botoes, consistente com o tema da pagina
- Grid responsivo: 1 coluna mobile, 3 colunas desktop (`md:grid-cols-3`)
- Largura maxima `max-w-4xl` centralizada

