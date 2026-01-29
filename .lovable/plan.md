

## Adicionar Pack de Carnaval na Promoção 135338 (Combo Arcano)

### O que vai ser feito

A promoção **135338 (Combo Arcano)** vai passar a liberar:
- pack-arcano-vol-1 (vitalício) ✅ já existe
- pack-arcano-vol-2 (vitalício) ✅ já existe  
- pack-arcano-vol-3 (vitalício) ✅ já existe
- **pack-de-carnaval (vitalício)** 🆕 adicionar

**Não mexe em nada que a pessoa já tem** - se já comprou pack-fim-de-ano antes, continua com acesso normalmente.

---

### Implementação

#### 1) Adicionar pack-de-carnaval na promoção

Inserir na tabela `artes_promotion_items`:

```sql
INSERT INTO artes_promotion_items (promotion_id, pack_slug, access_type)
VALUES ('722bf976-a558-4278-bc01-5e9b4906d935', 'pack-de-carnaval', 'vitalicio');
```

Isso faz com que toda nova compra do 135338 já libere o carnaval automaticamente (o webhook já processa os itens da promoção).

---

#### 2) Correção retroativa (3 clientes dos últimos 3 dias)

Adicionar pack-de-carnaval para quem comprou recentemente:

```sql
INSERT INTO user_pack_purchases (user_id, pack_slug, access_type, has_bonus_access, is_active, product_name)
VALUES 
  ('8eed6705-24ee-4ff4-87f7-a4788495cf1f', 'pack-de-carnaval', 'vitalicio', true, true, 'Combo Arcano'),
  ('096615aa-cde6-4ffe-bd50-552805b6f6ce', 'pack-de-carnaval', 'vitalicio', true, true, 'Combo Arcano'),
  ('e04ea270-ba42-4eb8-a943-c7ac8bf2855f', 'pack-de-carnaval', 'vitalicio', true, true, 'Combo Arcano')
ON CONFLICT (user_id, pack_slug) DO UPDATE SET 
  access_type = 'vitalicio',
  has_bonus_access = true,
  is_active = true;
```

---

### O que NÃO vai ser feito

- ❌ Não remove pack-fim-de-ano de ninguém
- ❌ Não modifica o webhook
- ❌ Não reseta senha de ninguém
- ❌ Não mexe em outros acessos

---

### Resultado

| Compra | Packs liberados |
|--------|-----------------|
| Novas compras do 135338 | vol-1, vol-2, vol-3, **carnaval** |
| 3 clientes recentes | **carnaval** adicionado (demais acessos intactos) |

---

### Arquivos/Mudanças

| Tipo | Descrição |
|------|-----------|
| Migração SQL | INSERT do pack-de-carnaval na promoção + correção retroativa |

Nenhuma mudança de código necessária - o webhook já processa automaticamente os packs configurados na promoção.

