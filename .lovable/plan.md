

## Adicionar Badge "Motion Canva" ou "Motion After Effects" para Vídeos

### Objetivo
Quando o admin sobe ou edita um arquivo de vídeo, ele pode escolher se é **Motion Canva** ou **Motion After Effects**. Esse tipo será exibido como um **badge** no card da arte para o usuário na biblioteca.

---

### Mudanças Necessárias

#### 1) Banco de Dados - Nova coluna `motion_type`

Adicionar coluna na tabela `admin_artes`:

| Coluna | Tipo | Padrão | Descrição |
|--------|------|--------|-----------|
| `motion_type` | TEXT | NULL | `canva`, `after_effects`, ou NULL (para imagens) |

---

#### 2) Upload de Artes (AdminUploadArtes.tsx)

**Interface `MediaData`** - Adicionar campo:
```typescript
motionType: 'canva' | 'after_effects' | '';
```

**UI do Modal de Upload** - Quando `isVideo = true`, mostrar:
```
┌─────────────────────────────────────────┐
│  🎬 Tipo de Motion                      │
│  ┌─────────────────────────────────┐    │
│  │ ○ Motion Canva                  │    │
│  │ ○ Motion After Effects          │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Insert no banco** - Incluir:
```typescript
motion_type: media.isVideo ? media.motionType || null : null
```

---

#### 3) Edição de Artes (AdminManageArtes.tsx)

**Estado de edição** - Adicionar:
```typescript
const [editMotionType, setEditMotionType] = useState<'canva' | 'after_effects' | ''>('');
```

**Carregar valor ao abrir edição**:
```typescript
setEditMotionType(arte.motion_type || '');
```

**UI do Modal de Edição** - Quando o arquivo é vídeo, mostrar o mesmo seletor.

**Update no banco** - Incluir:
```typescript
motion_type: isVideoUrl(editingArte.image_url) ? editMotionType || null : null
```

---

#### 4) Exibição na Biblioteca (BibliotecaArtes.tsx)

**Interface `ArteItem`** - Adicionar campo:
```typescript
motionType?: 'canva' | 'after_effects' | null;
```

**Fetch de Artes** - Mapear o campo:
```typescript
motionType: (item as any).motion_type || null
```

**Função `getBadgeContent`** - Adicionar badge condicional:
```tsx
{arte.motionType && (
  <Badge className={arte.motionType === 'canva' 
    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0 text-[10px] sm:text-xs' 
    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 text-[10px] sm:text-xs'
  }>
    {arte.motionType === 'canva' ? '🎨 Canva' : '🎬 After Effects'}
  </Badge>
)}
```

---

#### 5) Biblioteca de Músicos (BibliotecaArtesMusicos.tsx)

Aplicar a mesma lógica de exibição de badge para manter consistência entre as bibliotecas.

---

### Arquivos que serão modificados

| Arquivo | Mudança |
|---------|---------|
| **Migração SQL** | Adicionar coluna `motion_type` na tabela `admin_artes` |
| `src/pages/AdminUploadArtes.tsx` | Adicionar campo de seleção para vídeos no modal de upload |
| `src/pages/AdminManageArtes.tsx` | Adicionar campo de seleção para vídeos no modal de edição |
| `src/pages/BibliotecaArtes.tsx` | Atualizar interface, fetch e badges para exibir tipo de motion |
| `src/pages/BibliotecaArtesMusicos.tsx` | Atualizar interface, fetch e badges para exibir tipo de motion |

---

### Visualização do Badge na Arte

O usuário verá na biblioteca:

```
┌─────────────────────────────┐
│      [Imagem/Vídeo]         │
│  ┌───────────┐              │
│  │ 🎨 Canva  │ ⭐ Premium   │
│  └───────────┘              │
├─────────────────────────────┤
│ Título da Arte              │
│ [Pack Nome]                 │
│ [Ver Detalhes]              │
└─────────────────────────────┘
```

- **Motion Canva**: Badge azul/ciano com emoji 🎨
- **Motion After Effects**: Badge roxo/rosa com emoji 🎬
- Para imagens estáticas: sem badge de motion

---

### Resultado esperado

1. Admin pode marcar tipo de motion ao subir vídeos
2. Admin pode editar tipo de motion de vídeos existentes
3. Usuários veem badge colorido indicando se é Canva ou After Effects
4. Imagens estáticas não mostram badge de motion

