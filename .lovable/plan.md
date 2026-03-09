

# Diagnóstico: Por que o UTMify não está registrando a venda

## O problema

O UTMify está configurado como integração **Greenn**. Isso significa que ele espera receber um payload **exatamente** no formato que a Greenn envia. Nos testes anteriores, o payload estava incompleto — faltavam campos obrigatórios que o parser da Greenn no UTMify precisa para reconhecer como uma venda válida.

### Campos que estão faltando ou errados:

1. **`event`**: a Greenn envia `"sale_status_updated"` — estávamos omitindo ou colocando errado
2. **`contract.id`**: a Greenn sempre envia um ID de contrato — é por isso que o UTMify identifica a venda como única
3. **`offer`**: precisa ter `name` e `id`
4. **`product.id`**: a Greenn envia como **número** (ex: `89608`), nós mandamos string `"mp_upscaler..."`
5. **`sale.amount`**: a Greenn envia em **centavos** (3990 = R$39,90), nós mandamos em reais (39.90)
6. **`sale.currency`**: precisa ser `"BRL"`

Basicamente, o UTMify respondeu "SUCCESS" porque recebeu um POST válido, mas **descartou** o payload porque não conseguiu parsear como uma venda real da Greenn.

## Plano de correção

### 1. Corrigir o payload no `webhook-mercadopago/index.ts`

Montar o payload no formato **exato** da Greenn:

```json
{
  "event": "sale_status_updated",
  "currentStatus": "paid",
  "contract": { "id": 123456 },
  "client": { "name": "", "email": "comprador@email.com" },
  "product": { "name": "Upscaler Arcano Vitalício", "id": 999001 },
  "offer": { "name": "Upscaler Arcano Vitalício", "id": 999001 },
  "sale": { 
    "id": 123456, 
    "amount": 3990, 
    "currency": "BRL",
    "created_at": "2026-03-09T..." 
  },
  "saleMetas": [
    { "meta_key": "utm_source", "meta_value": "FB" },
    { "meta_key": "xcod", "meta_value": "FBhQwK..." }
  ]
}
```

Para gerar IDs numéricos consistentes, vamos usar um hash do UUID da ordem para criar um número inteiro único (a Greenn usa IDs numéricos).

### 2. Enviar teste real com valor R$ 39,90

Criar uma edge function temporária que envia exatamente esse payload para o UTMify, com:
- **Produto**: "Upscaler Arcano Vitalício"
- **Valor**: 3990 (centavos)
- **Email**: teste-lovable@voxvisual.com.br
- **UTMs de teste**: utm_source=FB, utm_campaign=teste-mp

### Arquivos editados
- `supabase/functions/webhook-mercadopago/index.ts` (corrigir formato do payload UTMify)
- Edge function temporária de teste (criar, executar, deletar)

