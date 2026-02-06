

# Plano: Redeploy Geral de Todas as Edge Functions

## Resumo da Verificação Realizada

Testei **todas as 35 Edge Functions** do projeto e identifiquei o status atual de cada uma:

### ✅ FUNÇÕES ONLINE (34/35)

| Categoria | Funções | Status |
|-----------|---------|--------|
| **AI Tools** | `runninghub-upscaler`, `runninghub-pose-changer`, `runninghub-veste-ai`, `runninghub-video-upscaler-webhook`, `runninghub-queue-manager`, `runninghub-webhook` | 200/400/500 (Online) |
| **Payment Webhooks** | `webhook-greenn`, `webhook-greenn-artes`, `webhook-greenn-musicos`, `webhook-greenn-creditos`, `webhook-hotmart-artes` | 400 (Online - esperam payload) |
| **User Management** | `create-partner`, `create-partner-artes`, `create-premium-user`, `create-premium-user-artes`, `create-premium-user-musicos`, `delete-auth-user-artes`, `delete-auth-user-by-email`, `update-user-password-artes` | 401 (Online - precisam auth) |
| **Pack System** | `create-pack-client`, `import-pack-clients` | 401 (Online) |
| **Admin** | `manage-admin`, `reset-admin-password`, `admin-add-credit-user`, `send-admin-2fa`, `verify-admin-2fa` | 401/500 (Online) |
| **Notifications** | `send-push-notification`, `send-announcement`, `process-scheduled-notifications` | 200/500 (Online) |
| **Email** | `send-single-email`, `resend-pending-emails`, `email-unsubscribe`, `welcome-email-tracking` | 400/500 (Online) |
| **Credits** | `claim-promo-credits` | 500 (Online) |

### ⚠️ FUNÇÕES OFFLINE (1/35)

| Função | Erro | Impacto |
|--------|------|---------|
| `runninghub-video-upscaler` | **404 Not Found** | 🔴 Video Upscaler não funciona |

---

## Causa do Problema

A função `runninghub-video-upscaler` **existe no código** mas **não está deployada no servidor**, resultando em 404 quando chamada diretamente (sem o sufixo `/run`).

Quando chamada com `/run`, funciona (retorna 400 com parâmetros faltando), então o problema é parcial, mas o deploy deve ser feito para garantir consistência.

---

## Ação: Redeploy Geral Preventivo

Para garantir que todas as funções estejam sincronizadas com o código mais recente, vou fazer redeploy de todas as funções críticas:

### Grupo 1: AI Tools (CRÍTICAS)
```
runninghub-upscaler
runninghub-pose-changer
runninghub-veste-ai
runninghub-video-upscaler      ← OFFLINE
runninghub-video-upscaler-webhook
runninghub-queue-manager
runninghub-webhook
```

### Grupo 2: Payment Webhooks (CRÍTICAS)
```
webhook-greenn
webhook-greenn-artes
webhook-greenn-musicos
webhook-greenn-creditos
webhook-hotmart-artes
```

### Grupo 3: Email & Notifications
```
send-single-email
resend-pending-emails
send-push-notification
process-scheduled-notifications
send-announcement
```

### Grupo 4: Admin & User Management
```
send-admin-2fa
verify-admin-2fa
claim-promo-credits
admin-add-credit-user
create-premium-user-artes
delete-auth-user-artes
```

---

## Verificação Pós-Redeploy

Após o redeploy, farei um teste em cada função para confirmar que todas respondem (não 404).

---

## Resultado Esperado

- **100% das funções online** (zero 404)
- **Video Upscaler restaurado** para os usuários
- **Jobs de IA processando normalmente** (webhook → queue-manager → /finish funcionando)
- **Pagamentos funcionando** (Greenn/Hotmart recebendo confirmações)

