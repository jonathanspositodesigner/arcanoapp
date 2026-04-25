## Diagnóstico

Investiguei o problema e encontrei o bug exato.

### O que está acontecendo

1. **Fotos de comida:** No banco de dados a categoria está cadastrada como **`Produto/Comida`** (singular), mas no código (`src/pages/BibliotecaPrompts.tsx`, linha 63) a lista `GERAR_IMAGEM_CATEGORIES` está procurando por **`Produtos/Comida`** (plural com "s"). Por causa dessa diferença de uma única letra, a função `isGerarImagemCategory()` retorna `false` e o botão roxo "Gerar sua versão" nunca aparece nesses cards — independente do prompt ser Premium ou não.

2. **Flyers com IA:** A categoria `Flyers com IA` no código bate exatamente com o banco. O código já está correto e o botão `isFlyerIACategory` deveria estar aparecendo. Pode ser que o usuário não tenha visto porque o overlay com os botões só aparece ao **passar o mouse (desktop)** ou **pressionar e segurar (mobile)** — o card precisa estar em estado ativo.

### Confirmação importante sobre a regra de negócio

A lógica de exibição dos botões "Gerar sua versão" (Cenários, Logos, Selos 3D, Outros, Produto/Comida, Flyers com IA, Movies para Telão, Seedance 2, Fotos→Cloner) **JÁ está correta**: eles são renderizados sem nenhuma checagem de `isPremium`. Ou seja, mesmo usuários sem assinatura veem o botão e podem clicar para ir para a ferramenta de IA correspondente — usarão seus créditos avulsos normalmente. O único bloqueio Premium é no botão "Copiar" do prompt em si, que vira "Premium" com cadeado. Isso bate com a regra que você reforçou.

## Plano de correção

### 1. `src/pages/BibliotecaPrompts.tsx` (linha 63)
Trocar `'Produtos/Comida'` por `'Produto/Comida'` dentro do `Set` `GERAR_IMAGEM_CATEGORIES`. Mudança de uma única letra que vai liberar o botão roxo "Gerar sua versão" em todas as fotos de comida (incluindo o card "Food burger" da screenshot), levando para `/gerar-imagem` com o motor Nano Banana e o prompt já preenchido.

### 2. Verificação dos Flyers com IA
Após o deploy, vou pedir para você confirmar passando o mouse num card de Flyer (ex: "Flyer dia das mães") se o botão "Gerar sua versão" aparece no overlay. Se NÃO aparecer, vou investigar mais a fundo (pode ser ordenação CSS, z-index ou algo no SecureImage que está bloqueando o overlay no mobile). Se aparecer, é só uma questão de descoberta visual.

### 3. Bump de versão
Incrementar `APP_BUILD_VERSION` em `src/pages/Index.tsx` para `1.4.2` conforme regra de auto-incremento.

### O que NÃO vou mexer

- Lógica de Premium do botão "Copiar"
- Lógica de cobrança de créditos das ferramentas (`/gerar-imagem`, `/flyer-maker`)
- Qualquer outra categoria que já esteja funcionando
- Comportamento mobile do overlay (active vs hover) — segue o padrão atual

Mudança cirúrgica, risco zero de quebrar qualquer fluxo existente.