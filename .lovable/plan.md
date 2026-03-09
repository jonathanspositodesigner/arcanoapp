

# Trocar token do Mercado Pago para produção

## Situação atual
O secret `MERCADOPAGO_ACCESS_TOKEN` já existe configurado — mas com um token de **sandbox/teste** (por isso o checkout abre em `sandbox.mercadopago.com.br`).

## O que precisa ser feito

### 1. Atualizar o secret com o token de produção
- Vou solicitar que você insira o **Access Token de produção** do Mercado Pago
- Para encontrá-lo: acesse [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers) → Suas integrações → Credenciais de produção → copie o **Access Token** (começa com `APP_USR-...`)

### 2. Nenhuma mudança de código necessária
- A Edge Function `create-mp-checkout` já usa `Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')` — basta trocar o valor do secret e o checkout passa a ser de produção automaticamente

## Resultado
- O checkout abrirá em `mercadopago.com.br` (sem "sandbox")
- Pagamentos reais serão processados (PIX, cartão, boleto)
- Você poderá testar com um pagamento real na página `/planos-upscaler-arcano-mp`

