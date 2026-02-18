
## Configuração do Produto 159713 — Arcano Cloner (4.200 Créditos Vitalícios)

### Confirmação: Revogação de créditos em reembolso

**Já está implementado e funcionando.** Ambos os webhooks possuem lógica completa para reembolso:

- Quando o status é `refunded` ou `chargeback`, o sistema localiza o usuário pelo email
- Chama o RPC `revoke_credits_on_refund` que remove os créditos do saldo lifetime
- Em chargebacks, o email vai automaticamente para a blacklist
- O RPC `revoke_credits_on_refund` existe e está ativo no banco

Assim que o produto 159713 for adicionado ao mapeamento, a revogação automática já vai funcionar para ele também. Nenhuma mudança extra é necessária nesse aspecto.

---

### O que será feito

Três mudanças nos webhooks, sem tocar em mais nada:

**1. `supabase/functions/webhook-greenn-artes/index.ts`**

- Adicionar `159713: { amount: 4200, name: 'Arcano Cloner' }` no `CREDITS_PRODUCT_MAPPING` (linha 52)
- Criar constante `ARCANO_CLONER_PRODUCT_IDS = [159713]` para detecção no template de email
- Na função `sendCreditsWelcomeEmail`: adicionar bloco `if (isArcanoCloner)` **antes** do bloco `if (isUpscaler)` com template exclusivo do Arcano Cloner

**2. `supabase/functions/webhook-greenn-creditos/index.ts`**

- Adicionar `159713: 4200` no `PRODUCT_CREDITS` (linha 21)

---

### Template de Email — Arcano Cloner

**Assunto:** `🤖 Arcano Cloner | Acesso Ativado! +4.200 Créditos`
**Remetente:** `Arcano App <contato@voxvisual.com.br>`
**Botão CTA:** → `https://arcanolab.voxvisual.com.br/`

Visual do template (fundo escuro, identidade Arcano Cloner):

```text
┌─────────────────────────────────────────┐
│  Fundo: #0D0221  |  Container: #1A0A2E  │
├─────────────────────────────────────────┤
│                                         │
│   🤖  ARCANO CLONER                     │
│   Ferramenta de Fotos com IA            │
│                                         │
│   ✅ ACESSO ATIVADO                     │
│                                         │
├─────────────────────────────────────────┤
│  Olá, [Nome]!                           │
│  Você adquiriu o Arcano Cloner —        │
│  a ferramenta de geração de fotos       │
│  com inteligência artificial.           │
├── BOX GRADIENTE #7c3aed → #ec4899 ─────┤
│         +4.200                          │
│    créditos adicionados                 │
│    à sua conta (VITALÍCIOS)             │
├─────────────────────────────────────────┤
│  📋 DADOS DO SEU PRIMEIRO ACESSO:       │
│  Email: [email]                         │
│  Senha: [email]                         │
│  ⚠️ Troque sua senha no 1º acesso       │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐    │
│  │  🚀 ACESSAR MEU PRODUTO         │    │
│  └─────────────────────────────────┘    │
│     → arcanolab.voxvisual.com.br/       │
├─────────────────────────────────────────┤
│  © Arcano App                           │
└─────────────────────────────────────────┘
```

---

### Fluxo completo após a mudança

```text
Compra do produto 159713
        │
        ▼
webhook-greenn-artes recebe o evento
        │
        ├── status = "paid" → adiciona 4.200 créditos lifetime
        │                   → ativa Premium Pro
        │                   → envia email Arcano Cloner
        │
        └── status = "refunded" → revoga créditos (já funciona!)
                                → blacklist em caso de chargeback
```

---

### Resumo técnico

| Item | Valor |
|---|---|
| Product ID | 159713 |
| Créditos | 4.200 (lifetime/vitalício) |
| Webhook principal | webhook-greenn-artes |
| Webhook secundário | webhook-greenn-creditos |
| URL do botão CTA | https://arcanolab.voxvisual.com.br/ |
| Assunto do email | 🤖 Arcano Cloner | Acesso Ativado! +4.200 Créditos |
| Remetente | Arcano App <contato@voxvisual.com.br> |
| Revogação em reembolso | Já funciona — nenhuma mudança necessária |
| Produto 156957 | NÃO será tocado |
