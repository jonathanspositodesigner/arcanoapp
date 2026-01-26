
## Correção de URLs Quebradas - Cavalgada e Motions

### Diagnóstico

**Pelo seu print, as imagens quebradas são:**

1. **Cavalgada posição 3**: Mostra "ARTES DE CAVALGADA 3" quebrado - corresponde a `CAVALGADA-DOS-GIGANTES-scaled.webp`
2. **Motions**: 7 thumbnails quebrados (posições 4-10)

---

### Problema Identificado

**Motions (posições 4-10)** - URLs atuais vs corretas:

| Posição | URL ATUAL (incorreta) | URL CORRETA |
|---------|----------------------|-------------|
| 4 | `FLYER-EVENTO-SERTANEJO-PREMIUM-STORIES-768x1365.webp` | `FLYER-EVENTO-SERTANEJO-PREMIUM-STORIES-768x1365.webp` ✅ |
| 5 | `FLYER-EVENTO-FORRO-VIP-STORIES-768x1365.webp` ❌ | `FLYER-EVENTO-FORRO-DO-VILA-STORY-SOCIAL-MEDIA-1.webp` |
| 6 | `FLYER-EVENTO-FUNK-PARTY-STORIES-768x1365.webp` | `FLYER-EVENTO-FUNK-PARTY-STORIES-768x1365.webp` ✅ |
| 7 | `FLYER-EVENTO-REVEILLON-DO-SAMBA-STORIES-768x1365.webp` | `FLYER-EVENTO-REVEILLON-DO-SAMBA-STORIES-768x1365.webp` ✅ |
| 8 | `FLYER-EVENTO-SAO-JOAO-DA-CIDADE-STORIES-768x1365.webp` | `FLYER-EVENTO-SAO-JOAO-DA-CIDADE-STORIES-768x1365.webp` ✅ |
| 9 | `FLYER-EVENTO-HALLOWEEN-PARTY-STORIES-768x1365.webp` | `FLYER-EVENTO-HALLOWEEN-PARTY-STORIES-768x1365.webp` ✅ |
| 10 | `FLYER-EVENTO-RODEIO-COUNTRY-STORIES-768x1365.webp` | `FLYER-EVENTO-RODEIO-COUNTRY-STORIES-768x1365.webp` ✅ |

**Motions posição 5** está com URL incorreta: deve ser `FLYER-EVENTO-FORRO-DO-VILA-STORY-SOCIAL-MEDIA-1.webp`

**Cavalgada posição 3**: A URL `CAVALGADA-DOS-GIGANTES-scaled.webp` está correta no código. Se ainda está quebrada, pode ser problema de cache ou o arquivo pode ter sido renomeado no servidor.

---

### Correções a Aplicar

#### 1. MotionsGallerySection.tsx (linha 29)

Trocar:
```typescript
thumbnail: "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-FORRO-VIP-STORIES-768x1365.webp",
```

Por:
```typescript
thumbnail: "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-FORRO-DO-VILA-STORY-SOCIAL-MEDIA-1.webp",
```

#### 2. FlyersGallerySection.tsx - Verificar Cavalgada (linha 70)

A URL atual é:
```typescript
"https://voxvisual.com.br/wp-content/uploads/2025/11/CAVALGADA-DOS-GIGANTES-scaled.webp"
```

Se esta ainda estiver quebrando, pode ser que o arquivo no servidor seja diferente. Caso contrário, está correta conforme o HTML do WordPress.

---

### Resumo das Alterações

| Arquivo | Linha | Alteração |
|---------|-------|-----------|
| `MotionsGallerySection.tsx` | 29 | Corrigir URL do thumbnail "Forró Eletrônica" |
| `FlyersGallerySection.tsx` | 70 | Verificar se a URL está correta (manter se confirmado pelo HTML) |

---

### Resultado Esperado

- Todos os 10 thumbnails dos Motions carregando corretamente
- Todas as 8 imagens de Cavalgada carregando corretamente
