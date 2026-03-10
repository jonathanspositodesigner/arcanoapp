

## Plano: Revogar acesso, deletar conta e adicionar à lista negra

**Usuário:** roger_newlife@hotmail.com (ID: `0272b42d-a674-453d-b2d6-410aa0ac82be`)

**Estado atual:**
- Tem acesso vitalício ao pack `upscaller-arcano` (ativo)
- Tem créditos: nenhum registro em upscaler_credits
- Não está na lista negra

### Ações a executar (via dados, não migrations):

1. **Desativar acesso ao pack** — UPDATE `user_pack_purchases` SET `is_active = false` para o registro dele

2. **Adicionar à lista negra** — INSERT em `blacklisted_emails` com email `roger_newlife@hotmail.com` e motivo "Pagamento não confirmado - Mercado Pago pendente"

3. **Deletar conta** — Chamar a edge function `delete-auth-user-by-email` que já existe e faz a limpeza completa (profiles, premium_users, premium_artes_users, user_pack_purchases, user_roles + auth.users)

Todas essas são operações de dados, não mudanças de schema. Usarei o insert tool para as duas primeiras e curl para a edge function.

