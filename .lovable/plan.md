

# Plano: Corrigir Função de Email de Boas-Vindas Quebrada

## Diagnóstico do Problema

O código foi modificado para usar deduplicação atômica com `dedup_key`, mas **a migração de banco nunca foi executada**. 

A função `sendWelcomeEmail` em todos os 3 webhooks tenta inserir:
```javascript
dedup_key: dedupKey  // ← Esta coluna NÃO EXISTE!
```

Como resultado, o INSERT falha com erro `42703: column does not exist` e **nenhum email é enviado**.

## Clientes Afetados Hoje (8 pessoas)

| Email | Plataforma | Horário Compra |
|-------|------------|----------------|
| markinhosky@hotmail.com | artes-eventos | 15:27 |
| gg.grafica@hotmail.com | artes-eventos | 15:20 |
| studio.2023.inovacao@gmail.com | artes-eventos | 15:18 |
| renatomizaelfotografia@gmail.com | artes-eventos | 14:59 |
| jhonesantozz@gmail.com | artes-eventos | 14:58 |
| filipieodriguesdsgn@gmail.com | artes-eventos | 14:45 |
| fabioxgomes@gmail.com | artes-eventos | 13:56 |
| lekfred@gmail.com | artes-eventos | 13:55 |

## Solução em 2 Partes

### Parte 1: Migração de Banco de Dados

Adicionar a coluna `dedup_key` e o unique constraint:

```sql
-- Adicionar coluna dedup_key
ALTER TABLE welcome_email_logs 
ADD COLUMN IF NOT EXISTS dedup_key TEXT;

-- Criar índice único para deduplicação atômica
CREATE UNIQUE INDEX IF NOT EXISTS idx_welcome_email_dedup_key 
ON welcome_email_logs (dedup_key) 
WHERE dedup_key IS NOT NULL;
```

### Parte 2: Reenviar Emails Pendentes

Após a correção, criar uma edge function temporária para reenviar os emails perdidos para os 8 clientes afetados.

## Arquivos Afetados

| Arquivo | Status | Problema |
|---------|--------|----------|
| `webhook-greenn-artes/index.ts` | Código OK | Aguardando migração DB |
| `webhook-greenn-musicos/index.ts` | Código OK | Aguardando migração DB |
| `webhook-greenn/index.ts` | Código OK | Aguardando migração DB |
| Banco de Dados | **FALTANDO** | Coluna `dedup_key` não existe |

## Resultado Após Correção

- Emails de boas-vindas voltarão a funcionar
- Deduplicação atômica funcionará corretamente
- Race conditions serão eliminadas
- Os 8 clientes afetados receberão seus emails

