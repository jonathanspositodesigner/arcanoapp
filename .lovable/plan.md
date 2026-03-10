

## Plano: Página de sucesso pós-pagamento + link WhatsApp

### Alterações

**1. Nova página `src/pages/SucessoUpscalerArcano.tsx`**
- Design similar ao `SucessoArtesMusicos` (confetti, card centralizado, gradiente)
- Mensagem principal: "Seu pagamento está sendo processado"
- Subtítulo: "Se você já pagou, seu acesso foi liberado! Coloque seu email de compra para acessar seu conteúdo."
- Campo de email + botão "Acessar meu conteúdo"
- Ao submeter: chama `check_profile_exists` → redireciona para login ou definição de senha conforme estado do perfil
- Link menor no rodapé: "Problemas com seu pagamento? Fale conosco no WhatsApp" apontando para `https://wa.me/33988819891`

**2. Registrar rota em `src/App.tsx`**
- Adicionar lazy import e rota `/sucesso-upscaler-arcano`

**3. Atualizar `success_url` no edge function `create-pagarme-checkout/index.ts`**
- Linha 149: mudar para `https://arcanoapp.voxvisual.com.br/sucesso-upscaler-arcano`

**4. Atualizar redirect no `PreCheckoutModal.tsx`**
- Linha 182: mudar URL para `/sucesso-upscaler-arcano`

