

## Problema encontrado

Os dados estão corretos no banco — ambos os packs foram concedidos:
- `pack-arcano-vol-4` ✅
- `pack-de-sao-joao` ✅

O problema é um **bug de slug mismatch** entre o frontend e o backend.

### Causa raiz

Na `BibliotecaArtes.tsx` (linha 775), o acesso ao pack é verificado assim:

```text
pack.name = "Pack de São João"
  → toPackSlug("Pack de São João")
  → "pack-de-são-joão"  (COM acentos)

Mas no banco (user_pack_purchases):
  → pack_slug = "pack-de-sao-joao"  (SEM acentos)
```

A função `toPackSlug` em `src/lib/utils.ts` converte espaços em hífens mas **não remove acentos**. Então `hasAccessToPack("pack-de-são-joão")` nunca encontra `"pack-de-sao-joao"` na lista de packs do usuário.

### Correção

**Arquivo: `src/lib/utils.ts`** — Adicionar normalização de acentos na função `toPackSlug`:

```typescript
export function toPackSlug(packName: string | null | undefined): string {
  if (!packName) return '';
  return packName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/\./g, '-')
    .replace(/\+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
```

Essa mesma função é usada em toda a biblioteca de artes (pack cards, arte cards, cursos, modal de detalhes), então a correção resolve o problema em todos os lugares de uma vez.

### Impacto

| Antes | Depois |
|-------|--------|
| `"Pack de São João"` → `"pack-de-são-joão"` ❌ | `"Pack de São João"` → `"pack-de-sao-joao"` ✅ |
| `"Pack de Carnaval"` → `"pack-de-carnaval"` ✅ | Sem mudança ✅ |

Nenhuma alteração no banco é necessária — o slug no `user_pack_purchases` já está correto (`pack-de-sao-joao`).

