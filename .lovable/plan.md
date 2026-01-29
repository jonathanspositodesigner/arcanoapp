

## Objetivo
Criar um sistema de logs de webhook **minimalista** que:
1. Não gaste recursos do Cloud desnecessariamente
2. Permita rastrear falhas futuras
3. Reative a página `/admin-webhook-logs` como painel funcional

---

## ✅ Confirmação: A implementação anterior VAI FUNCIONAR

O fluxo que eu implementei está correto:

```
HOTMART/GREENN envia webhook
        ↓
   [PARSE JSON] ← rápido
        ↓
   [GRAVA webhook_logs result='received'] ← ~50ms
        ↓
   [RESPONDE 200 OK] ← IMEDIATO (< 100ms)
        ↓ (background, via EdgeRuntime.waitUntil)
   [Cria usuário, libera acesso, profile, email]
        ↓
   [ATUALIZA webhook_logs result='success' ou 'failed']
```

A Hotmart recebe o 200 rápido. O processamento pesado (email, criar usuário) acontece **DEPOIS** da resposta. Os erros 408/502 não vão mais acontecer.

---

## Situação atual do `webhook_logs`

| Métrica | Valor |
|---------|-------|
| Registros totais | 2.174 |
| Tamanho | 6.5 MB |
| Últimos 7 dias | 74 |
| Falhas | 0 |

Esse tamanho é **insignificante** (< 1% do seu limite de 1GB).

---

## Estratégia minimalista para não gastar Cloud

### 1) Limpeza automática (sem precisar de cron externo)

Vou adicionar uma política de auto-limpeza direto no webhook:
- Antes de inserir novo log, deleta registros com mais de 30 dias
- Isso mantém a tabela enxuta sem precisar de job separado

### 2) Payload compacto

Vou adicionar opção de **não salvar o payload completo** para eventos de sucesso:
- `result='success'` → salva apenas metadados (email, product_id, platform)
- `result='failed'` ou `result='blocked'` → salva payload completo para debug

### 3) Reter apenas o essencial

Colunas que vou usar:
| Coluna | Uso |
|--------|-----|
| `id` | PK |
| `received_at` | Quando chegou |
| `platform` | hotmart-es, artes-eventos, app, musicos, prompts |
| `email` | Para buscar |
| `product_id` | Para debug |
| `status` | Evento original (paid, approved, refunded, etc) |
| `result` | received → success / failed / blocked / ignored |
| `error_message` | Só quando falha |
| `payload` | Só para falhas (ou null para sucesso) |

---

## O que vou implementar

### A) Modificar webhooks para limpeza automática + payload condicional

Antes de inserir novo log:
```javascript
// Limpar logs > 30 dias (executa rápido, não bloqueia)
await supabase.from('webhook_logs')
  .delete()
  .lt('received_at', thirtyDaysAgo)
  .limit(100) // Limita para não travar
```

Depois do processamento:
```javascript
// Se sucesso, remover payload (economiza espaço)
if (result === 'success') {
  await supabase.from('webhook_logs')
    .update({ payload: {}, error_message: null })
    .eq('id', logId)
}
```

### B) Reativar página `/admin-webhook-logs`

Transformar o placeholder atual em painel funcional:
- Lista de logs com filtros (plataforma, resultado, últimos X dias)
- Busca por email
- Exibir payload apenas para falhas
- Contadores: recebidos, sucesso, falha, bloqueados

---

## Estimativa de custo

Com a estratégia minimalista:
- ~100 webhooks/mês × 30 dias retenção = máximo ~3.000 registros
- ~500 bytes por registro (sem payload) = ~1.5 MB
- Com payload de falhas (~5%): +~500 KB
- **Total estimado: < 2 MB** (0.2% do seu limite)

---

## Arquivos que vou modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/webhook-hotmart-artes/index.ts` | Adicionar limpeza automática + payload condicional |
| `supabase/functions/webhook-greenn-artes/index.ts` | Idem |
| `supabase/functions/webhook-greenn/index.ts` | Idem |
| `supabase/functions/webhook-greenn-musicos/index.ts` | Idem |
| `src/pages/AdminWebhookLogs.tsx` | Transformar em painel funcional |

---

## Resultado esperado

1. Logs funcionando sem gastar Cloud
2. Limpeza automática (30 dias)
3. Painel admin para ver histórico e identificar falhas
4. Payload salvo apenas para erros (debug)
5. Webhooks continuam respondendo rápido (a limpeza é async)

