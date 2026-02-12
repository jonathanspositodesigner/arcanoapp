
# Reformulacao da Secao de Precos - PlanosUpscalerCreditos

## Resumo
Substituir a secao atual de preco unico (card com 69% OFF) por um grid de 3 planos no mesmo estilo visual da pagina /planos-2, adaptado para pagamento unico com creditos de upscaler.

## O que muda

### Estrutura dos Planos (3 cards lado a lado)

| | Starter | Pro | Studio |
|---|---|---|---|
| Preco | R$ 29,90 | R$ 39,90 | R$ 99,90 |
| Tipo | Pagamento unico | Pagamento unico | Pagamento unico |
| Creditos | 1.800 creditos | 5.000 creditos | 10.800 creditos |
| Equivalente | ~30 upscalers | ~83 upscalers | ~160 upscalers |
| Badge | - | MAIS VENDIDO | MELHOR CUSTO/BENEFICIO |

### Features de cada plano (iguais para todos)
- Atualizacoes constantes na ferramenta
- Liberacao imediata
- Suporte exclusivo via WhatsApp

### O que sera removido
- Toggle Mensal/Anual Parcelado (nao se aplica, pagamento unico)
- Plano "IA Unlimited" (nao existira)
- Features removidas: prompts premium, acesso a conteudo premium, acesso a ferramentas de IA, geracao de imagem com NanoBanana, geracao de video com Veo 3, fila prioritaria
- Card unico atual com preco de 69% OFF

### O que sera mantido
- Timer de contagem regressiva de 30 minutos (localStorage para persistencia)
- Titulo "Melhore agora mesmo suas imagens!" e subtitulo
- Mesmo estilo visual escuro (bg `#1A0A2E` / `#0D0221`)

## Detalhes Tecnicos

### Arquivo modificado
- `src/pages/PlanosUpscalerCreditos.tsx` - Secao "SECAO DE PRECO E CTA"

### Implementacao
1. Adicionar estado para countdown de 30 minutos com localStorage (chave propria, ex: `planos-upscaler-countdown`)
2. Remover o card unico atual e substituir por um grid `grid-cols-1 lg:grid-cols-3` com 3 cards
3. Cada card segue o layout do Planos2: nome, preco (sem "/mes", apenas pagamento unico), botao "Comprar", badge de creditos, lista de features com checks
4. Pro tera borda lime/verde com badge "MAIS VENDIDO", Studio tera borda roxa com badge "MELHOR CUSTO/BENEFICIO"
5. Manter URLs de pagamento existentes ou placeholders para atualizacao posterior
6. Badge de creditos mostra o total + equivalente em upscalers abaixo
