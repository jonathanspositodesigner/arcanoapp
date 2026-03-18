

# Plano: Email de Recuperação — Intercorrência PIX Pagar.me

## Dados Levantados

6 ordens pendentes de hoje, 4 produtos distintos:

| # | Cliente | Produto | Valor | Página de Checkout |
|---|---------|---------|-------|--------------------|
| 1 | Sidney Gomes | Upscaler Arcano Vitalício | R$29,90 | /planos-upscaler-arcano |
| 2 | Fabiane Gouvêa | 1.500 Créditos Avulsos | R$19,90 | /planos-upscaler-creditos |
| 3 | Italo Gutierrez | Plano Pro Mensal | R$39,90 | /planos-2 |
| 4 | Filipe | Upscaler Arcano Vitalício | R$29,90 | /planos-upscaler-arcano |
| 5 | Flávio | Upscaler Arcano Vitalício | R$29,90 | /planos-upscaler-arcano |
| 6 | Dener Dias | Pro - Arcano Cloner | R$37,00 | /planos-arcano-cloner |

## O que será feito

### 1. Edge Function `send-pix-recovery-email`
- Recebe lista de ordens pendentes (ou busca automaticamente as de hoje)
- Para cada ordem, gera um checkout Pagar.me fresco (somente PIX) usando a mesma lógica do `create-pagarme-checkout`, com o `product_slug` correto
- Monta um email HTML personalizado por pessoa com:
  - Nome do cliente
  - Nome do produto que tentou comprar
  - Explicação breve sobre a intercorrência no gateway
  - Botão CTA com link direto para o checkout Pagar.me gerado
  - Rodapé com link de descadastro
- Envia via SendPulse SMTP API

### 2. Layout do Email (Preview)
Antes de enviar, vou montar o HTML do email e mostrar o layout completo para aprovação. O tom será:

- **Assunto:** "⚠️ Seu pagamento não foi processado — já resolvemos!"
- **Corpo:** Pedido de desculpas pela falha técnica no gateway, explicação que já foi resolvido, botão para tentar novamente com link direto do checkout do produto específico
- **Visual:** Estilo consistente com os emails existentes do sistema (fundo cinza, card branco, botão dourado #d4af37)

### 3. Fluxo de execução
1. Crio a edge function
2. Mostro o layout do email para aprovação
3. Só após aprovação, executo o envio via `curl_edge_functions`

### Detalhes técnicos
- Reutiliza autenticação SendPulse (OAuth com `SENDPULSE_CLIENT_ID` / `SENDPULSE_CLIENT_SECRET`)
- Gera checkout Pagar.me individual por ordem para cada cliente receber seu link correto
- Registra envios para auditoria
- `verify_jwt = false` para poder invocar manualmente

