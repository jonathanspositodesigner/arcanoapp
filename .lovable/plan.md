

# Melhorar email de compra + adicionar link WhatsApp

## Status do reembolso
O acesso já foi cancelado automaticamente (`is_active: false` no `user_pack_purchases`). Funcionou corretamente.

## Melhorias no email

### Arquivo a editar
`supabase/functions/webhook-mercadopago/index.ts` — função `buildPurchaseEmailHtml`

### Mudanças no template HTML
1. **Layout mais profissional e limpo**:
   - Header com logo/ícone maior e mais impactante
   - Espaçamento mais generoso entre seções
   - Tipografia melhorada com hierarquia visual clara
   - Cards de credenciais com melhor contraste e legibilidade
   - Botão CTA maior e mais destacado com efeito hover
   - Cores mais refinadas mantendo o tema roxo/dourado

2. **Adicionar link de suporte WhatsApp no rodapé**:
   - Texto pequeno: "Problemas com seu produto? Fale conosco"
   - Link apontando para `https://wa.me/5533988819891`
   - Posicionado entre o copyright e o link de cancelar inscrição

### Resultado
Email mais bonito e profissional, com suporte acessível no rodapé.

