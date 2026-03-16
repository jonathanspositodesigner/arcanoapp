

## Plano: Redirecionar compra 1-clique para Home

**Escopo**: Apenas 1 linha no frontend. Nenhum outro fluxo é afetado.

**Arquivo**: `src/components/upscaler/PreCheckoutModal.tsx`, linha 287

**Mudança**:
- Trocar `window.location.href = 'https://arcanoapp.voxvisual.com.br/sucesso-compra'` por `window.location.href = '/'`

Isso afeta **apenas** o bloco `handleOneClickBuy` quando `is_paid === true`. O fluxo de checkout normal (PIX, cartão via hosted page) continua redirecionando para `/sucesso-compra` normalmente.

