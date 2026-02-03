

## Recuperação dos Jobs do Upscaler sem user_id

### Situação Atual

Identifiquei **9 jobs** do Upscaler que podem ter o `user_id` recuperado através da correlação por timestamp com a tabela `upscaler_credit_transactions`:

| Job ID | User ID | Status |
|--------|---------|--------|
| 30af6594-b974-4abd-82fe-9f55d07b45df | 43f2f4c1... | completed |
| 30d7017d-1064-4e09-815e-65c11ea87579 | 43f2f4c1... | completed |
| 48f3c1a6-6e7a-4d3f-a212-4d15732cce58 | 8f5fb835... | completed |
| 7807d840-49b2-4efd-9138-09e6a55957b4 | 43f2f4c1... | completed |
| 842a8af4-401f-4217-bd87-00c7db7dacae | 8f5fb835... | completed |
| 9f007a5e-20d1-42b6-a13c-c9d97c2674cf | 61597c56... | completed |
| bd856177-3518-4eb9-94cb-7016779dd0c9 | 8f5fb835... | completed |
| d792d179-b866-45d0-8344-8d698a82763c | 61597c56... | completed |
| e858b610-c088-4956-bbf3-ebe9003734c1 | 43f2f4c1... | completed |

### Jobs que NÃO podem ser recuperados

- **3 jobs com status failed/cancelled** - não geraram transação de crédito
- **5 jobs antigos (29-30 Jan)** - testes iniciais sem sistema de créditos completo
- **1 job em running** - ainda não completou

---

## Plano de Implementação

### Passo 1: Executar UPDATE via Migration

Vou criar uma migration SQL para atualizar os 9 jobs identificados:

```sql
-- Recuperar user_id dos jobs do Upscaler via correlação de timestamp
UPDATE upscaler_jobs SET user_id = '43f2f4c1-fd7b-4a10-b6b8-1c39874c296a' 
WHERE id IN (
  '30af6594-b974-4abd-82fe-9f55d07b45df',
  '30d7017d-1064-4e09-815e-65c11ea87579', 
  '7807d840-49b2-4efd-9138-09e6a55957b4',
  'e858b610-c088-4956-bbf3-ebe9003734c1'
);

UPDATE upscaler_jobs SET user_id = '8f5fb835-2c26-400e-8826-2639eb1e0521'
WHERE id IN (
  '48f3c1a6-6e7a-4d3f-a212-4d15732cce58',
  '842a8af4-401f-4217-bd87-00c7db7dacae',
  'bd856177-3518-4eb9-94cb-7016779dd0c9'
);

UPDATE upscaler_jobs SET user_id = '61597c56-6d48-44d3-b236-5cb9cffcf995'
WHERE id IN (
  '9f007a5e-20d1-42b6-a13c-c9d97c2674cf',
  'd792d179-b866-45d0-8344-8d698a82763c'
);
```

---

## Resultado Esperado

Após a execução:
- **9 jobs** do Upscaler passarão a aparecer no painel de Custos IA
- O Upscaler será exibido junto com Pose Changer e Veste AI
- Métricas de custo RH, créditos e lucro serão calculadas corretamente

---

## Detalhes Técnicos

A correlação foi feita usando:
- Diferença de tempo < 15 segundos entre criação do job e transação de crédito
- Filtro por `transaction_type = 'consumption'` e `description LIKE 'Upscaler%'`
- Jobs com `status = 'completed'` (apenas estes geram transação)

