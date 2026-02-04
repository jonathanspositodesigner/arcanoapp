
# Liberar Versão 2.5 do Upscaler Arcano para ronyodesigner@gmail.com

## Objetivo
Atualizar a data de compra do pack `upscaller-arcano` para o usuário **Ronilson Bastos da gama** (ronyodesigner@gmail.com), colocando como se a compra tivesse sido feita 8 dias atrás, liberando assim acesso à versão 2.5.

## Dados do Usuário
- **Email**: ronyodesigner@gmail.com
- **User ID**: 66a7ae62-1dcd-4851-b108-a4eb846870aa
- **Pack**: upscaller-arcano

## Ação
Executar uma migration SQL para atualizar o campo `purchased_at`:

```sql
UPDATE user_pack_purchases 
SET purchased_at = NOW() - INTERVAL '8 days',
    updated_at = NOW()
WHERE user_id = '66a7ae62-1dcd-4851-b108-a4eb846870aa' 
AND pack_slug = 'upscaller-arcano';
```

## Resultado Esperado
- O usuário terá acesso imediato à versão 2.5 do Upscaler Arcano
- A data de compra será registrada como 8 dias atrás (suficiente para desbloquear v2.0 que requer 7 dias)
