

# Plano: Deletar Edge Function `ai-jobs-cancel-pending`

## Resumo da Análise

### O que essa função faz
Função de **emergência manual** criada durante o incidente dos 404 para cancelar em massa jobs travados (`pending`/`queued`) nas 4 tabelas de AI:
- `upscaler_jobs`
- `pose_changer_jobs`  
- `veste_ai_jobs`
- `video_upscaler_jobs`

### Verificação de Segurança

| Verificação | Resultado |
|-------------|-----------|
| Chamada no frontend? | ❌ Nenhuma referência em `/src/` |
| Chamada por outras Edge Functions? | ❌ Nenhuma |
| Listada no config.toml? | ❌ Não está |
| Usada por algum cron/scheduler? | ❌ Não |
| Dependência de lógica crítica? | ❌ Não |

### Por que pode deletar sem problemas

1. **Isolada**: Ninguém chama essa função - era para uso manual via API
2. **Substituída**: O sistema já tem `cleanup_all_stale_ai_jobs()` no QueueManager que faz limpeza automática de jobs travados (>10 min)
3. **Sem integração**: Não está conectada a nenhum fluxo de usuário (upload, pagamento, login)
4. **Emergência resolvida**: O incidente que motivou sua criação já foi corrigido

### Potencial problema se NÃO deletar

A função existe no servidor e pode ser chamada por qualquer usuário autenticado, o que teoricamente permite que alguém cancele seus próprios jobs pendentes sem passar pelo fluxo normal (mas isso não é um problema de segurança grave, apenas redundância).

---

## Ação

| Arquivo/Pasta | Ação |
|---------------|------|
| `supabase/functions/ai-jobs-cancel-pending/` | **DELETAR** pasta completa |

Após deletar, a função será automaticamente removida do deploy.

---

## Resultado Esperado

- Função removida do servidor
- Nenhum impacto no app (ninguém usa)
- Menos código para manter

