
# Nova Sessao "Para Quem E" - Arcano Cloner

## Onde sera adicionada
Logo apos a sessao "Veja o que o Arcano Cloner e capaz de fazer" (linha ~263), antes da sessao "HOW IT WORKS" (linha ~264).

## Conteudo

**Titulo chamativo:** "Quem ja esta lucrando e se destacando com o Arcano Cloner"
**Subtitulo:** "Se voce se encaixa em pelo menos um desses perfis, o Arcano Cloner foi feito pra voce"

### 6 cards com icones Lucide em tom roxo:

1. **Empreendedores de Renda Extra** (icone: DollarSign) - "Quer faturar vendendo ensaios fotograficos profissionais sem precisar de camera ou estudio"
2. **Profissionais e Executivos** (icone: Briefcase) - "Precisa de fotos profissionais para LinkedIn, curriculo ou portfolio sem gastar uma fortuna"
3. **Musicos e Artistas** (icone: Music) - "Crie presskits, capas de album e materiais visuais incriveis sem depender de fotografo"
4. **Usuarios Comuns** (icone: User) - "Quer fotos incriveis para redes sociais, perfis de namoro ou uso pessoal com qualidade de estudio"
5. **Infoprodutores** (icone: Rocket) - "Precisa de imagens profissionais para anuncios, paginas de venda e conteudo digital"
6. **Social Media e Criadores** (icone: Share2) - "Produza conteudo visual de alto nivel para seus clientes ou para suas proprias redes"

## Estilo
- Mesmo padrao visual da pagina: fundo escuro, cards com `bg-white/5 border-white/10 rounded-3xl`
- Icones em `text-fuchsia-400` dentro de container `bg-fuchsia-500/10`
- Grid responsivo: 1 coluna mobile, 2 colunas tablet, 3 colunas desktop
- `auto-rows-fr` para altura uniforme dos cards
- Usando `StaggeredAnimation` para animacao de entrada

## Detalhes tecnicos
- Arquivo: `src/pages/PlanosArcanoCloner.tsx`
- Importar icones adicionais do lucide-react: `Briefcase`, `Music`, `User`, `Rocket`, `Share2`
- Inserir entre linha 262 e 264
