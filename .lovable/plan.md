
Objetivo (o que vou corrigir agora)
1) “Torne-se Premium” (barra de cima e barra lateral): trocar o gradiente atual para roxo → azul, seguindo a identidade visual.
2) Filtros (abas “Exclusivos/Comunidade” + chips de categoria): parar de aparecerem “brancos” e sem contraste; deixar com fundo roxo escuro e texto legível.
3) Botão “Detalhes” nos cards: parar de aparecer branco; deixar com fundo roxo escuro e alto contraste (mesmo padrão dos filtros).
4) “Vasculhar tudo” dentro da Biblioteca de Prompts (/biblioteca-prompts): além desses 3 pontos, vou corrigir outros botões “outline” que também podem estar ficando brancos por causa do `bg-background` do componente Button (ex.: paginação e botão “Baixar” no modal).

Por que isso está acontecendo (raiz do problema)
- O componente `Button` (src/components/ui/button.tsx) no variant `outline` aplica automaticamente: `bg-background`.
- Se as variáveis/tema do `--background` estiverem claros em algum contexto, o botão “outline” fica branco.
- No arquivo `src/pages/BibliotecaPrompts.tsx` ainda existem vários botões com `variant="outline"` sem um `bg-...` explícito, então eles podem continuar brancos.

Onde está no código (achados)
Arquivo principal: `src/pages/BibliotecaPrompts.tsx`

A) “Torne-se Premium” (topo)
- Desktop top bar:
  - Linha ~508 e ~516: `className="bg-gradient-to-r from-yellow-500 to-orange-500 ..."`
- Mobile top bar:
  - Linha ~560 e ~568: `className="bg-gradient-to-r from-yellow-500 to-orange-500 ..."`

B) “Torne-se Premium” (sidebar)
- Sidebar:
  - Linha ~631 e ~640: `className="bg-gradient-to-r from-purple-500 to-pink-500 ..."`

C) Filtros (onde está branco)
- Abas “Exclusivos/Comunidade”:
  - Linha ~748-760: botões usam `variant="outline"` e no caso “Exclusivos” (quando desmarcado) não tem `bg-...` explícito.
- Chips de categoria:
  - Linha ~764-770: `variant="outline"` e sem `bg-...` explícito; texto ainda está bem claro: `text-purple-300/70`.

D) Botão “Detalhes” nos cards
- Linha ~828-835:
  - `variant="outline"`
  - `className="text-xs border-purple-500/30 text-purple-300 ..."` (sem `bg-...`), então pode ficar branco.

E) Outros “outline” que precisam entrar no “vasculhar tudo”
- Paginação:
  - Linhas ~845-863: botões `variant="outline"` sem `bg-...`.
- Modal de detalhes:
  - Botão “Baixar” (linha ~976-989) é `variant="outline"` sem `bg-...`.

Decisão visual (paleta e padrão)
1) CTA Premium (Torne-se Premium / Premium):
- Gradiente: roxo → azul
- Proposta de classes (Tailwind):
  - `bg-gradient-to-r from-purple-600 to-blue-500 text-white hover:from-purple-500 hover:to-blue-400`
- Isso será aplicado tanto na barra de cima quanto na sidebar (e também no CTA dentro do modal premium para consistência).

2) Botões “outline” (filtros, detalhes, paginação, baixar):
- Mesmo “esquema moderno” e consistente:
  - Fundo: roxo bem escuro translúcido
  - Borda: roxo médio/50
  - Texto: roxo claro ou branco (alto contraste)
- Proposta de classes:
  - `bg-purple-900/40 border-purple-400/50 text-purple-100 hover:bg-purple-500/20 hover:text-white`

Implementação (passo a passo)
1) Biblioteca de Prompts: ajustar gradiente do Premium (top bar + sidebar)
- Em `src/pages/BibliotecaPrompts.tsx`:
  - Trocar todas as ocorrências do “Premium / Torne-se Premium” que hoje estão em amarelo/laranja e roxo/rosa para o novo gradiente roxo→azul:
    - Desktop top bar (linhas ~508, ~516)
    - Mobile top bar (linhas ~560, ~568)
    - Sidebar (linhas ~631, ~640)
  - Também alinhar:
    - CTA do “Premium Modal” (linha ~894-900) para roxo→azul (hoje está roxo→rosa)

2) Biblioteca de Prompts: corrigir filtros que estão brancos e sem contraste
- Abas “Exclusivos/Comunidade”:
  - Garantir que o estado “desmarcado” tenha `bg-purple-900/30` (ou /40) para nunca cair no `bg-background` branco.
  - Ajustar o texto para `text-purple-200` (remover o “/70” no que estiver muito apagado).
- Chips de categoria:
  - No estado “não selecionado”, adicionar `bg-purple-900/30` + `border-purple-400/50` + `text-purple-200`.
  - No estado “selecionado”, manter `bg-purple-600 text-white` (já está ok), ou se quiser mais premium/impacto, opcionalmente usar um gradiente sutil (não vou mudar isso sem necessidade).

3) Biblioteca de Prompts: corrigir botão “Detalhes” dos cards
- No botão “Detalhes” (linhas ~828-835):
  - Manter `variant="outline"` (se preferir), mas adicionar `bg-purple-900/40` para sobrescrever `bg-background`.
  - Subir contraste do texto (`text-purple-100` ou `text-purple-200`) e hover consistente.

4) “Vasculhar tudo” (mesmo problema em outros botões outline na mesma página)
- Paginação (linhas ~845-863):
  - Adicionar `bg-purple-900/40` nos botões `variant="outline"` (setas).
- Modal de detalhes (botão “Baixar”, linha ~976-989):
  - Adicionar `bg-purple-900/40` e texto com contraste.
- Revisão rápida adicional (ainda no mesmo arquivo):
  - Procurar por `variant="outline"` e garantir que todos tenham um `bg-...` explícito quando forem elementos importantes de interação.
  - Procurar por `from-yellow-500 to-orange-500` dentro de BibliotecaPrompts e remover onde estiver ligado a “premium” (para não ficar amarelo perdido).

Critério de aceite (o que você vai ver depois)
1) “Torne-se Premium” na barra de cima e na lateral: gradiente roxo→azul (não amarelo, não rosa).
2) Filtros (abas e categorias): nenhum botão branco; tudo com fundo roxo escuro e texto legível.
3) Botão “Detalhes” nos cards: não fica branco, mantém contraste no fundo escuro.
4) Paginação e “Baixar” no modal: também não ficam brancos.

Arquivo(s) que serão alterados
- `src/pages/BibliotecaPrompts.tsx` (principal)
- (Sem necessidade de alterar tailwind config ou o componente Button base; vamos resolver por classes explícitas na página para evitar efeitos colaterais no resto do app.)

Teste end-to-end (checklist)
- Desktop: /biblioteca-prompts
  - Ver top bar: Premium roxo→azul
  - Ver sidebar: Premium roxo→azul
  - Clicar em categorias: chips com contraste
  - Card: botão Detalhes sem branco
  - Paginação: setas sem branco
- Mobile: /biblioteca-prompts
  - Top bar: Premium roxo→azul
  - Ver filtros e botões com contraste

Observação importante
- Vou manter a identidade visual roxa como base e usar o azul apenas como “segundo tom” do gradiente premium (do jeito que você pediu), para reduzir a sensação de “muita cor misturada”.
