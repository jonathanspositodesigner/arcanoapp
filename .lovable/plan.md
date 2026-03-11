

## Plano: Email de Notificação de Venda para o Admin

### O que será feito

Toda vez que uma compra for aprovada (em qualquer webhook: Pagar.me e Mercado Pago), enviar um email para `jonathandesigner1993@gmail.com` com parabéns e os dados da compra.

### Template do Email (modelo visual)

```text
┌──────────────────────────────────────────────┐
│          🎉 NOVA VENDA APROVADA! 🎉          │
│       background: gradiente roxo/dourado      │
├──────────────────────────────────────────────┤
│                                              │
│   🏆 Parabéns! Mais uma venda no Arcano!    │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  📦 Produto:  Upscaler Arcano Pack     │  │
│  │  💰 Valor:    R$ 19,90                 │  │
│  │  💳 Método:   PIX                      │  │
│  │  📧 Cliente:  cliente@email.com        │  │
│  │  👤 Nome:     João da Silva            │  │
│  │  📅 Data:     11/03/2026 às 14:30      │  │
│  │  🏷️ Plataforma: Pagar.me              │  │
│  └────────────────────────────────────────┘  │
│                                              │
│   "Continue assim! Cada venda é uma          │
│    confirmação do seu trabalho incrível."     │
│                                              │
│            Vox Visual © 2026                 │
└──────────────────────────────────────────────┘
```

Estilo visual: mesmo padrão do email de compra do cliente (fundo escuro #0d0015, gradiente roxo, dourado, bordas arredondadas).

### Mudanças técnicas

**1. `webhook-pagarme/index.ts`**
- Criar função `sendAdminNotificationEmail(email, productName, amount, paymentMethod, customerEmail, customerName, platform, requestId)`
- Gera HTML no mesmo estilo visual do `buildPurchaseEmailHtml` mas com dados da venda
- Chamar logo após o `sendPurchaseEmail` (linha ~453), enviando via SendPulse para `jonathandesigner1993@gmail.com`

**2. `webhook-mercadopago/index.ts`**
- Mesma função `sendAdminNotificationEmail` duplicada (cada webhook é independente)
- Chamar após o `sendPurchaseEmail` existente (linha ~404)

### Dados incluídos no email
- Produto comprado (nome)
- Valor (R$)
- Método de pagamento (PIX, cartão, boleto)
- Email do cliente
- Nome do cliente
- Data/hora da compra
- Plataforma (Pagar.me ou Mercado Pago)

### Segurança
- O email do admin é hardcoded na função (não configurável pelo cliente)
- Usa o mesmo SendPulse já configurado
- Não afeta nenhum fluxo existente — é um envio adicional após o email do cliente

