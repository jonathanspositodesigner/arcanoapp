

# Otimizar velocidade do checkout Pagar.me

## Problema encontrado

Analisei a edge function `create-pagarme-checkout` e encontrei **3 gargalos** que fazem o checkout demorar:

1. **Meta CAPI está bloqueando a resposta** — O comentário diz "fire-and-forget" mas o código usa `await`, ou seja, espera a resposta do Facebook ANTES de retornar a URL do checkout. Isso adiciona 1-3 segundos.

2. **Operações sequenciais que poderiam ser paralelas** — A atualização do perfil, a busca de produto e o rate limit rodam um após o outro. Algumas podem rodar ao mesmo tempo.

3. **Atualizações do banco após criar o checkout também bloqueiam** — O update do `asaas_payment_id` e do `fbc/fbp` rodam antes de retornar a URL.

## O que vou fazer (sem mudar nenhuma lógica)

### 1. Meta CAPI → Fire-and-forget real
Remover o `await` da chamada Meta CAPI. O checkout retorna imediatamente sem esperar o Facebook responder. O evento continua sendo enviado normalmente.

### 2. Paralelizar rate limit + busca de produto
Hoje rodam em sequência. Vou rodar os dois ao mesmo tempo com `Promise.all`.

### 3. Mover atualizações pós-checkout para depois do return
As atualizações de `asaas_payment_id` e `fbc/fbp` na tabela de ordens vão rodar **depois** de retornar a URL ao usuário, usando `waitUntil` ou simplesmente não aguardando o resultado.

### 4. Perfil: atualizar sem bloquear
A atualização do perfil (nome, CPF, etc.) não precisa bloquear o checkout.

## Resultado esperado
O checkout deve ficar **1-4 segundos mais rápido**, dependendo da latência do Facebook e do banco.

## Risco
**Zero** — Nenhuma lógica de pagamento, validação ou verificação é alterada. Apenas a ordem em que as operações acontecem muda, e chamadas não-críticas deixam de bloquear a resposta.

## Arquivo modificado
- `supabase/functions/create-pagarme-checkout/index.ts`

