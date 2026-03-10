

# Pré-checkout: email aparece ao clicar no botão de compra

## O que muda

Atualmente o campo de email aparece **acima** do botão CTA e fica sempre visível para usuários não logados. A mudança é:

1. **Esconder o email por padrão** — adicionar um estado `showEmailField` (default `false`)
2. **Primeiro clique no CTA** — se o usuário não está logado e `showEmailField` é `false`, setar `showEmailField = true` em vez de chamar `handlePurchase`. O campo de email aparece **abaixo** do botão com animação de slide/fade.
3. **Campo de email + botão "Continuar"** — após o campo de email, um novo botão "Continuar" (estilo similar ao CTA) que efetivamente chama `handlePurchase`.
4. **Animação** — o bloco do email entra com `animate-fade-in` (já existe no projeto).
5. **Usuários logados** — comportamento não muda, o clique vai direto pro checkout.

## Arquivos editados

**1 arquivo**: `src/pages/PlanosUpscalerArcano.tsx`

- Adicionar estado `showEmailField`
- Mover o bloco `{!user && ...}` do email para **abaixo** do CTAButton
- Envolver em condicional `showEmailField`
- Adicionar classe `animate-fade-in` para animação de entrada
- Modificar `CTAButton onClick`: se `!user && !showEmailField`, apenas mostrar o campo; senão, chamar `handlePurchase`
- Adicionar botão "Continuar" abaixo do input de email
- Remover o input de email de cima do botão

