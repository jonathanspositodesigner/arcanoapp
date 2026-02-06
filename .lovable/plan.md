
# Plano: Exibir Motivo da Falha no Admin + Corrigir Créditos do Cliente

## Resumo

1. Adicionar a coluna `error_message` na RPC `get_ai_tools_usage`
2. Exibir ícone de "!" com tooltip mostrando o erro quando status = `failed`
3. Reembolsar os 80 créditos do cliente afetado

---

## Problema 1: Erro não aparece no Admin

### Causa
A função RPC `get_ai_tools_usage` não retorna a coluna `error_message`, mesmo que ela exista nas tabelas de jobs.

### Solução
Alterar a RPC para incluir `error_message` em todos os SELECTs e no RETURNS TABLE.

---

## Problema 2: Cliente cobrado sem reembolso

### Job Afetado
- **Email:** eternalente@outlook.com
- **Job ID:** `f137beec-7d3a-42e7-b1cc-e1a063ec7a19`
- **Créditos:** 80 (não reembolsados)

### Solução
Script SQL para reembolsar os créditos.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| Nova migration SQL | Alterar RPC `get_ai_tools_usage` para incluir `error_message` |
| `src/components/admin/AdminAIToolsUsageTab.tsx` | Adicionar tooltip com ícone de exclamação |

---

## Detalhes Técnicos

### 1. Migration - Atualizar RPC

A RPC precisa:
- Adicionar `error_message TEXT` no `RETURNS TABLE`
- Adicionar `uj.error_message`, `pcj.error_message`, `vaj.error_message`, `vuj.error_message` em cada SELECT do UNION

### 2. Frontend - Tooltip com Erro

Na função `getStatusBadge`, quando status = `failed`:

```tsx
case "failed":
  return (
    <div className="flex items-center gap-1.5">
      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Falhou</Badge>
      {record.error_message && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <AlertCircle className="h-4 w-4 text-red-400 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{record.error_message}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
```

Isso requer:
- Mudar `getStatusBadge(status)` para `getStatusBadge(record)` para ter acesso ao `error_message`
- Adicionar imports do Tooltip e AlertCircle
- Adicionar `error_message: string | null` na interface `UsageRecord`

### 3. Reembolso do Cliente

```sql
-- Reembolsar 80 créditos para o cliente
INSERT INTO upscaler_credit_transactions (user_id, amount, transaction_type, description)
SELECT user_id, 80, 'refund', 'Reembolso manual - job falhou sem estorno automático (f137beec)'
FROM upscaler_jobs WHERE id = 'f137beec-7d3a-42e7-b1cc-e1a063ec7a19';

-- Marcar job como reembolsado
UPDATE upscaler_jobs 
SET credits_refunded = true 
WHERE id = 'f137beec-7d3a-42e7-b1cc-e1a063ec7a19';
```

---

## Resultado Final

1. ✅ Erro aparece como tooltip ao passar o mouse sobre o ícone "!" 
2. ✅ Cliente recebe seus 80 créditos de volta
3. ✅ Histórico mostra exatamente o que aconteceu em cada job falho

---

## Exemplo Visual do Resultado

```
┌──────────────────────────────────────────────────────────┐
│ Status: [Falhou] ⚠️  ← Ao passar o mouse no ⚠️:          │
│                      ┌────────────────────────────┐      │
│                      │ Failed to start workflow   │      │
│                      └────────────────────────────┘      │
└──────────────────────────────────────────────────────────┘
```
