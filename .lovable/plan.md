

## Mudanças nos Planos v2

### Resumo das alterações
- **Starter**: preço 19,90 → 24,90; créditos 1.800 → 1.500 (≈25 imagens/mês)
- **Pro**: créditos 4.200 → 5.000 (≈83 imagens/mês); badge "Mais Vendido" (verde/lime)
- **Ultimate**: créditos 10.800 → 14.000 (≈233 imagens/mês); badge "Melhor Custo/Benefício"
- **IA Unlimited**: badge mais destacada "CRIE SEM LIMITES"
- Frases abaixo do botão: Starter "Para começar" / Pro "Triplo de crédito por +R$20" / Ultimate "Ideal para designers e criadores ativos" / Unlimited "Máxima liberdade"

### Arquivos a alterar

**1. `src/pages/Planos2.tsx`** (UI dos planos)
- Starter mensal: price "24,90", credits "1.500 créditos de IA", images 25
- Starter anual: price "24,90", yearlyTotal "298,80", credits "1.500 créditos de IA", images 25
- Pro mensal: credits "5.000 créditos de IA", images 83
- Pro anual: credits "5.000 créditos de IA", images 83
- Ultimate mensal: credits "14.000 créditos de IA", images 233
- Ultimate anual: credits "14.000 créditos de IA", images 233
- Mover `bestSeller: true` do Ultimate para o Pro
- Mover badge "MELHOR CUSTO/BENEFÍCIO" (`hasCountdown`) do Unlimited para o Ultimate
- Unlimited: nova badge destacada "CRIE SEM LIMITES" (gradiente dourado/amarelo, maior)
- Adicionar tagline abaixo do botão Assinar em cada card
- Ajustar estilos dos botões para acompanhar as novas badges

**2. `supabase/functions/webhook-pagarme/index.ts`** (ativação via Pagar.me)
- PLAN_CONFIG starter: credits_per_month 1800 → 1500
- PLAN_CONFIG pro: credits_per_month 4200 → 5000
- PLAN_CONFIG ultimate: credits_per_month 10800 → 14000

**3. `supabase/functions/webhook-greenn/index.ts`** (ativação via Greenn)
- Produto 160732 (starter): credits_per_month 1800 → 1500
- Produto 160735 (pro): credits_per_month 4200 → 5000
- Produto 160738 (ultimate): credits_per_month 10800 → 14000
- Atualizar benefits do email de boas-vindas:
  - starter: "1.500 créditos mensais (~25 imagens/mês)"
  - pro: "5.000 créditos mensais (~83 imagens/mês)"
  - ultimate: "14.000 créditos mensais (~233 imagens/mês)"

**4. `supabase/functions/process-billing-reminders/index.ts`** (emails de renovação)
- plano-starter benefits/losses: 1.800 → 1.500
- plano-pro benefits/losses: 4.200 → 5.000
- plano-ultimate benefits/losses: 10.800 → 14.000

**5. `src/components/admin/RenewalEmailsMonitoring.tsx`** (preview admin)
- Sem mudança estrutural, apenas reflete os dados do banco

**6. Atualização no banco** (assinantes ativos existentes)
- UPDATE planos2_subscriptions SET credits_per_month = 1500 WHERE plan_slug = 'starter' AND is_active = true
- UPDATE planos2_subscriptions SET credits_per_month = 5000 WHERE plan_slug = 'pro' AND is_active = true
- UPDATE planos2_subscriptions SET credits_per_month = 14000 WHERE plan_slug = 'ultimate' AND is_active = true

