

# Diagnóstico: diegobranddesigner@gmail.com — Compra não registrada

## O que descobri

1. **Profile existe**: `4a010f4e-91bf-4d52-b726-5c9a30c103c8`, criado em 2026-03-04 18:10
2. **user_pack_purchases**: VAZIO — zero registros para esse user_id
3. **webhook_logs**: ZERO entradas para esse email em QUALQUER plataforma (Greenn, Hotmart, créditos, artes)
4. **Conclusão**: O webhook da Greenn simplesmente **nunca chegou** ao sistema para esse email

## Por que o webhook não chegou

Possíveis causas (precisa verificar no painel da Greenn):
- **Webhook não configurado** para o produto específico que esse cliente comprou
- **Falha de rede** no momento do disparo (Greenn → sistema) sem retry
- **Produto com ID diferente** não mapeado no sistema (se for um produto novo que não está nos IDs 156954/156957/156960)
- **O comprador usou checkout de um produto diferente** que não tem webhook configurado

## Plano de ação

### 1. Inserir registro de compra manualmente (SQL INSERT via insert tool)

```sql
INSERT INTO user_pack_purchases (user_id, pack_slug, access_type, is_active, purchased_at)
VALUES ('4a010f4e-91bf-4d52-b726-5c9a30c103c8', 'upscaller-arcano', 'vitalicio', true, NOW());
```

Depois disso, o usuário poderá ir em `/resgatar-creditos` e resgatar os 1.500 créditos normalmente.

### 2. Investigar no painel da Greenn

Verificar no painel da Greenn:
- Qual **Product ID** exato essa compra usa
- Se o webhook está configurado apontando para a URL correta do sistema
- Se houve tentativa de disparo com erro

Isso está fora do alcance do código — precisa ser feito diretamente no painel da Greenn.

