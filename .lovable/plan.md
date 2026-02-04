

# Plano: Arquitetura Multi-API RunningHub Escalável (2-N Contas)

## Visão Geral

Preparar toda a infraestrutura para suportar **múltiplas contas RunningHub** (2, 3, 4, 5 ou mais), sem ativar a segunda conta ainda. O sistema será extensível e configurável.

---

## Sobre Webhooks (Sua Dúvida)

**Não precisa de webhooks separados!** O mesmo webhook funciona para todas as contas porque:

1. O RunningHub envia o callback com o `taskId` do job
2. O webhook busca o job pelo `taskId` no banco de dados
3. Não importa de qual conta veio - o `taskId` é único

Então o fluxo será:
```text
Conta A processa job → RunningHub envia callback → Webhook recebe → Busca por taskId → Encontra job → Atualiza
Conta B processa job → RunningHub envia callback → Webhook recebe → Busca por taskId → Encontra job → Atualiza
```

O webhook não precisa saber de qual conta veio. Funciona automaticamente!

---

## Arquitetura Proposta

### Conceito de "API Pool"

```text
┌───────────────────────────────────────────────────────────────────┐
│                     API POOL (Configurável)                        │
├───────────────────────────────────────────────────────────────────┤
│  Conta 1: RUNNINGHUB_API_KEY     → 3 slots  ✓ (ativa hoje)        │
│  Conta 2: RUNNINGHUB_API_KEY_2   → 3 slots  ○ (preparada)         │
│  Conta 3: RUNNINGHUB_API_KEY_3   → 3 slots  ○ (preparada)         │
│  Conta 4: RUNNINGHUB_API_KEY_4   → 3 slots  ○ (preparada)         │
│  Conta 5: RUNNINGHUB_API_KEY_5   → 3 slots  ○ (preparada)         │
├───────────────────────────────────────────────────────────────────┤
│  TOTAL: slots_por_conta × contas_ativas                           │
│  Ex: 3 × 2 = 6 slots simultâneos                                  │
└───────────────────────────────────────────────────────────────────┘
```

### Fluxo de Balanceamento

```text
Novo Job chega
      │
      ▼
┌─────────────────────┐
│ Verificar Conta 1   │──(tem slot?)──▶ Usar Conta 1
│ (3 slots)           │
└─────────────────────┘
      │ (lotada)
      ▼
┌─────────────────────┐
│ Verificar Conta 2   │──(tem slot?)──▶ Usar Conta 2
│ (3 slots)           │
└─────────────────────┘
      │ (lotada)
      ▼
┌─────────────────────┐
│ Verificar Conta 3   │──(tem slot?)──▶ Usar Conta 3
│ (3 slots)           │
└─────────────────────┘
      │ (lotada)
      ▼
    ... continua para contas 4, 5, etc.
      │ (todas lotadas)
      ▼
┌─────────────────────┐
│    FILA GLOBAL      │
│  (aguarda slot)     │
└─────────────────────┘
```

---

## Implementação Técnica

### 1. Migração SQL - Adicionar Coluna `api_account`

Adicionar em todas as 4 tabelas de jobs:

| Coluna | Tipo | Default | Descrição |
|--------|------|---------|-----------|
| `api_account` | TEXT | 'primary' | Qual conta processou ('primary', 'account_2', 'account_3', etc.) |

Jobs existentes serão marcados como 'primary' automaticamente.

### 2. Secrets Preparadas

| Secret Name | Descrição | Status |
|-------------|-----------|--------|
| `RUNNINGHUB_API_KEY` | Conta 1 (principal) | Ativa |
| `RUNNINGHUB_API_KEY_2` | Conta 2 | Preparada (não cadastrada) |
| `RUNNINGHUB_API_KEY_3` | Conta 3 | Preparada (não cadastrada) |
| `RUNNINGHUB_API_KEY_4` | Conta 4 | Preparada (não cadastrada) |
| `RUNNINGHUB_API_KEY_5` | Conta 5 | Preparada (não cadastrada) |

O código detectará automaticamente quais secrets existem e usará apenas as configuradas.

### 3. Refatoração do Queue Manager

Criar estrutura de dados para múltiplas contas:

```text
SLOTS_PER_ACCOUNT = 3

function getAvailableApiAccounts():
    accounts = []
    
    if RUNNINGHUB_API_KEY exists:
        accounts.push({
            name: 'primary',
            apiKey: RUNNINGHUB_API_KEY,
            maxSlots: 3
        })
    
    if RUNNINGHUB_API_KEY_2 exists:
        accounts.push({
            name: 'account_2', 
            apiKey: RUNNINGHUB_API_KEY_2,
            maxSlots: 3
        })
    
    // ... continua para 3, 4, 5
    
    return accounts
```

Lógica de seleção de conta:

```text
function getAccountWithAvailableSlot():
    for each account in getAvailableApiAccounts():
        runningCount = COUNT jobs WHERE status='running' AND api_account=account.name
        
        if runningCount < account.maxSlots:
            return account
    
    return null  // Todas lotadas, vai pra fila
```

### 4. Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `runninghub-queue-manager/index.ts` | Adicionar lógica multi-conta, tracking por api_account |
| `runninghub-upscaler/index.ts` | Receber apiKey dinâmica do Queue Manager |
| `runninghub-pose-changer/index.ts` | Receber apiKey dinâmica do Queue Manager |
| `runninghub-veste-ai/index.ts` | Receber apiKey dinâmica do Queue Manager |
| `runninghub-video-upscaler/index.ts` | Receber apiKey dinâmica do Queue Manager |
| `runninghub-webhook/index.ts` | Nenhuma mudança necessária |
| `runninghub-video-upscaler-webhook/index.ts` | Nenhuma mudança necessária |

### 5. Endpoint `/status` Atualizado

Retornará informações por conta:

```text
{
  "totalMaxSlots": 6,
  "totalRunning": 4,
  "totalQueued": 2,
  "accounts": [
    { "name": "primary", "running": 3, "maxSlots": 3, "available": 0 },
    { "name": "account_2", "running": 1, "maxSlots": 3, "available": 2 }
  ]
}
```

---

## Funcionamento Sem Segunda Conta

Quando `RUNNINGHUB_API_KEY_2` não existir:
- Sistema funciona exatamente como hoje
- Apenas 3 slots disponíveis
- Toda lógica de fallback simplesmente não é executada

Quando você adicionar a segunda conta:
- Basta cadastrar `RUNNINGHUB_API_KEY_2` nas secrets
- Sistema automaticamente detecta e começa a usar
- Nenhuma mudança de código necessária

---

## Considerações de Custo

| Contas | Slots Totais | Custo RunningHub |
|--------|--------------|------------------|
| 1 | 3 | 1x |
| 2 | 6 | 2x |
| 3 | 9 | 3x |
| 4 | 12 | 4x |
| 5 | 15 | 5x |

O dashboard de métricas já soma os custos de todos os jobs independente da conta, então o custo total continuará sendo calculado corretamente.

---

## Passos de Implementação

1. **Migração SQL**: Adicionar coluna `api_account` nas 4 tabelas
2. **Queue Manager**: Implementar detecção dinâmica de contas e balanceamento
3. **Edge Functions individuais**: Adaptar para receber apiKey do Queue Manager
4. **Testar**: Verificar que funciona com apenas 1 conta (comportamento atual)
5. **Documentar**: Instruções de como adicionar novas contas

---

## Resumo Executivo

- Arquitetura preparada para 1 até N contas RunningHub
- Detecção automática de contas configuradas
- Balanceamento round-robin com fallback
- Webhooks funcionam sem modificação
- Fila global continua centralizada
- Zero mudança necessária quando adicionar conta 2, 3, 4 ou 5

