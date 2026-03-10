

## Plano: Configurar chave Pagar.me e integrar checkout

### Passo 1 — Salvar a Secret Key
Ao implementar, vou acionar a ferramenta segura para você colar a chave da API do Pagar.me. Ela será salva como `PAGARME_SECRET_KEY` e ficará disponível nas backend functions.

### Passo 2 — Criar edge function `create-pagarme-checkout`
- Recebe: `product_slug`, `user_email`, `user_cpf`, `user_name`, `billing_type`, `utm_data`
- Busca produto na tabela `mp_products`
- Cria cliente no Pagar.me (`POST /customers`)
- Cria pedido (`POST /orders`) com PIX ou Cartão
- Para PIX: retorna QR code
- Para Cartão: retorna boleto/link (checkout transparente requer tokenização no front — vou usar `billingType` adequado)
- Salva ordem na tabela (reutilizar `mp_orders` ou criar `pagarme_orders`)

### Passo 3 — Criar edge function `webhook-pagarme`
- Recebe notificações do Pagar.me quando pagamento é confirmado
- Ativa acesso do usuário (mesma lógica dos outros webhooks)

### Passo 4 — Atualizar PreCheckoutModal
- Trocar chamada de `create-asaas-checkout` para `create-pagarme-checkout`

### Passo 5 — Remover integração Asaas
- Deletar `create-asaas-checkout/index.ts` e `webhook-asaas/index.ts`
- Limpar `config.toml`

