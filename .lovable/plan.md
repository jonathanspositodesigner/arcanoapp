
# Correção: Remover Premium Pro indevido (2099) e bloquear lógica errada

## Problema identificado

Duas Edge Functions de webhook de compra de créditos contêm um bloco que ativa automaticamente o plano "Arcano Pro" com validade até 2099 para qualquer usuário que compra créditos avulsos. Isso concede acesso Premium vitalício gratuito a quem apenas comprou pacotes de créditos.

**Causa raiz**: Linhas ~647-676 em `webhook-greenn-creditos/index.ts` e linhas ~796-825 em `webhook-greenn-artes/index.ts`.

**Impacto**: 41 usuários estão com Premium Pro ativo até 2099 indevidamente.

---

## Plano de execução

### 1. Desativar os 41 usuários com Pro indevido (2099)

Executar UPDATE no banco para setar `is_active = false` em todos os registros de `premium_users` onde `expires_at > 2090-01-01` e `greenn_product_id IS NULL` (ou seja, não vieram de assinatura real).

Nota: O usuário `guilhermeaaleixo@gmail.com` tem `greenn_product_id = 148926`, o que indica que pode ter uma assinatura legítima. Ele será analisado separadamente -- se o produto 148926 é um plano real ou pacote de créditos, será tratado conforme o caso.

### 2. Remover o bloco de ativação Pro das Edge Functions

**Arquivo**: `supabase/functions/webhook-greenn-creditos/index.ts`
- Remover linhas 647-676 (bloco "Ativar Premium Pro automaticamente")

**Arquivo**: `supabase/functions/webhook-greenn-artes/index.ts`
- Remover linhas 796-825 (bloco "Ativar Premium Pro automaticamente")

A lógica de criação de `user_pack_purchases` (que vem logo depois) será mantida intacta -- ela apenas registra o pack comprado para exibição na home, o que é correto.

### 3. Deploy das Edge Functions corrigidas

As duas funções serão redeployadas automaticamente após a edição.

---

## Resumo técnico

| Item | Detalhe |
|------|---------|
| Usuários afetados | 41 com expires_at = 2099 |
| Causa | Bloco de código em webhooks de créditos |
| Correção banco | UPDATE premium_users SET is_active = false WHERE expires_at > 2090 |
| Correção código | Remover bloco "Ativar Premium Pro" de ambos os webhooks |
| Risco | Nenhum -- a compra de créditos continua funcionando normalmente, apenas sem conceder Pro grátis |
