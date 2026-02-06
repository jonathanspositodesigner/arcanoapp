
# Plano: Fazer Redeploy das 4 Funções Offline

## Situação Atual

Das 35 Edge Functions, **4 estão offline (404)**:

| Função | Impacto |
|--------|---------|
| `runninghub-pose-changer` | 🔴 **CRÍTICO** - Ferramenta de IA não funciona |
| `send-single-email` | 🟠 Envio de e-mails individuais |
| `resend-pending-emails` | 🟡 Reenvio de e-mails pendentes |
| `process-sending-campaigns` | 🟡 Campanhas de e-mail (nota: só existe no config.toml, não tem pasta) |

## Ação Necessária

### 1. Fazer redeploy das 3 funções que existem:

```
runninghub-pose-changer
send-single-email
resend-pending-emails
```

### 2. Investigar `process-sending-campaigns`:
- Está listada no `config.toml` mas não existe pasta `supabase/functions/process-sending-campaigns/`
- Opções:
  - Remover do config.toml se não é mais usada
  - Criar a função se for necessária

## Resultado Esperado

Após redeploy:
- **Pose Changer** volta a funcionar para todos os usuários
- **E-mails** voltam a ser enviados corretamente
- Zero funções offline
