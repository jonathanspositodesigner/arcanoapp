

## Simplificar seção de teste grátis

Remover o formulário de cadastro (nome, email, WhatsApp) da seção de teste grátis na página `/arcanocloner-teste` e substituir por um único botão "Ir para o Arcano Cloner" que leva para `https://arcanoapp.voxvisual.com.br/arcano-cloner-tool`.

### Arquivo alterado

**`src/components/arcano-cloner/LandingTrialSignupSection.tsx`**
- Remover todos os states (name, email, whatsapp, isSubmitting, isSuccess)
- Remover a função handleSubmit e toda lógica de envio
- Remover o formulário com os 3 inputs
- Remover a tela de sucesso (verificação de email)
- Manter a seção visual (título, badge "Teste Grátis", subtítulo)
- Colocar um único botão "Ir para o Arcano Cloner" com link para `https://arcanoapp.voxvisual.com.br/arcano-cloner-tool`
- O botão manterá o estilo gradient fuchsia/purple existente

