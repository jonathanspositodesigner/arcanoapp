

## Diagnóstico

O código NÃO remove PIX. A configuração `excluded_payment_types: [{ id: 'ticket' }]` só bloqueia boleto. PIX deveria aparecer normalmente.

O problema é a **credencial armazenada em `MERCADOPAGO_ACCESS_TOKEN`**. Quando PIX funcionava, era outra credencial/conta. Após a troca, PIX sumiu. Isso significa que:

1. A credencial atual pode ser de **teste** (começa com `TEST-`), onde PIX não aparece no checkout.
2. Ou a conta MP da credencial atual **não tem PIX habilitado**.

## Plano (simples e direto)

### 1. Verificar/trocar a credencial
- Vou pedir para você inserir novamente a credencial de **PRODUÇÃO** do Mercado Pago (começa com `APP_USR-`).
- Ela será salva em `MERCADOPAGO_ACCESS_TOKEN`.

### 2. Adicionar log de diagnóstico na função
- Logar os primeiros 8 caracteres do token usado (sem expor o segredo) para confirmar se é `APP_USR-` (produção) ou `TEST-` (teste).
- Logar o `collector_id` retornado pelo MP na resposta da preferência para confirmar qual conta está sendo usada.

### 3. Re-deploy da edge function
- Após trocar o secret e adicionar o log, fazer re-deploy para aplicar.

## Arquivos a alterar
- `supabase/functions/create-mp-checkout/index.ts` — adicionar 2 linhas de log diagnóstico (prefixo do token + collector_id da resposta)

## Ação do usuário necessária
- Confirmar/inserir a credencial de produção correta (a que começa com `APP_USR-`) no secret `MERCADOPAGO_ACCESS_TOKEN`.

