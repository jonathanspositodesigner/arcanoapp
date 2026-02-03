
# Adicionar 1.500 Créditos Vitalícios para marketingcursosj@gmail.com

## Situação Atual da Conta

| Informação | Valor |
|------------|-------|
| **Nome** | Janaina Martins |
| **Email** | marketingcursosj@gmail.com |
| **User ID** | 43f2f4c1-fd7b-4a10-b6b8-1c39874c296a |
| **Pack Comprado** | Pack Arcano Vol 3 (6 meses) |
| **Expira em** | 27/01/2027 |
| **Créditos Atuais** | 0 (nenhum registro) |

## O Que Será Feito

Executar a função RPC `add_lifetime_credits` para:
1. Criar um registro na tabela `upscaler_credits` para este usuário
2. Adicionar 1.500 créditos no campo `lifetime_balance`
3. Registrar a transação em `upscaler_credit_transactions`

## Comando SQL a Executar

```sql
SELECT * FROM add_lifetime_credits(
  '43f2f4c1-fd7b-4a10-b6b8-1c39874c296a'::uuid,
  1500,
  'Créditos vitalícios - Compra de pack'
);
```

## Resultado Esperado

Após a execução:
- A usuária terá **1.500 créditos vitalícios**
- Ela aparecerá automaticamente na aba **"Créditos IA"** do painel admin
- Você poderá gerenciar os créditos dela (adicionar/remover) diretamente pelo painel

## Onde Gerenciar Depois

Acesse: `/admin-premium-dashboard` → Aba **"Créditos IA"** → Busque por "marketingcursosj" → Editar
