

# Corrigir link de redirecionamento e comportamento do modal

## Problema 1: Link quebrado

O `confirm-email-free-trial` redireciona para `https://arcanoapp.voxvisual.com.br/upscaler` -- essa rota NAO EXISTE. A rota correta das ferramentas de IA e `/ferramentas-ia-aplicativo`.

### Correcao

Alterar em `supabase/functions/confirm-email-free-trial/index.ts`:
- Linha 4: `REDIRECT_URL` de `/upscaler` para `https://arcanoapp.voxvisual.com.br/ferramentas-ia-aplicativo`

Isso afeta:
- O redirect do magic link (linha 188)
- O link do botao na pagina de sucesso (linha 29)
- O link do botao na pagina de erro (linha 63)

## Problema 2: Modal fechando apos envio do email

O modal precisa:
- **NAO fechar** apos enviar o email de confirmacao
- Mostrar uma tela informando que o usuario precisa ir ao email e clicar no link
- Ter um botao X visivel para fechar manualmente se quiser
- NAO permitir fechar clicando fora durante o step `verify-email`

### Correcao em `AIToolsAuthModal.tsx`

- No `onOpenChange` do Dialog, bloquear fechamento por clique fora quando estiver no step `verify-email`
- Garantir que o step `verify-email` continue visivel com instrucoes claras
- Manter o X funcional para fechar manualmente

## Arquivos modificados

- `supabase/functions/confirm-email-free-trial/index.ts` (corrigir URL de `/upscaler` para `/ferramentas-ia-aplicativo`)
- `src/components/ai-tools/AIToolsAuthModal.tsx` (bloquear fechamento automatico no step verify-email)
