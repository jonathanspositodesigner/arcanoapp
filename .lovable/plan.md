

# Reembolso automático + Email de compra no webhook do Mercado Pago

## Situação atual

### Reembolso (já funciona ✅)
O webhook já tem a lógica de reembolso implementada (linhas 232-249). Quando o MP envia status `refunded`, `cancelled` ou `charged_back`, o sistema:
- Desativa o acesso no `user_pack_purchases` (`is_active = false`)
- Atualiza a ordem para `refunded`

**Porém**, falta revogar créditos caso o produto seja do tipo `credits`. Atualmente só revoga acesso a packs. Vou adicionar essa parte.

### Email de compra (não existe ❌)
O webhook do Mercado Pago **não envia nenhum email** após pagamento aprovado. Os webhooks da Greenn têm essa lógica com SendPulse, mas o MP não. Precisa ser adicionado.

---

## Plano de implementação

### 1. Adicionar envio de email no pagamento aprovado
Após o bloco de processamento do pagamento (após atualizar a ordem para `paid`), adicionar lógica de envio de email via SendPulse com:
- Template HTML roxo/dourado similar ao usado nos webhooks da Greenn
- Credenciais de acesso (email e senha = email)
- Botão CTA apontando para `https://arcanoapp.voxvisual.com.br/upscaler-arcano`
- Nome do produto comprado
- Tracking via `welcome_email_logs` (dedup + rastreamento)

### 2. Completar lógica de reembolso para créditos
No bloco de reembolso, adicionar revogação de créditos quando `product.type === 'credits'`:
- Usar `revoke_credits_on_refund` RPC (mesmo padrão do webhook-greenn)

### Arquivo editado
- `supabase/functions/webhook-mercadopago/index.ts`

