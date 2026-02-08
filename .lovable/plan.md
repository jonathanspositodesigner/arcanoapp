
## Resumo
Adicionar funcionalidade para categorizar fotos por gênero (Masculino/Feminino) na página de gerenciamento de imagens e no upload de arquivos, permitindo que o Arcano Cloner filtre as fotos diretamente pelo campo de gênero ao invés de procurar palavras-chave no título.

---

## O que será implementado

### 1. Filtro por Categoria na página de Gerenciamento (`/admin-manage-images`)
- Adicionar um seletor de categoria ao lado dos filtros existentes (Todos, Envios de Administradores, etc.)
- Opções: Todos, Fotos, Movies para Telão, Selos 3D, Cenários, Logos, Controles de Câmera

### 2. Campo de Gênero para itens da categoria "Fotos"
- Adicionar coluna `gender` na tabela `admin_prompts` (valores: 'masculino', 'feminino', ou null)
- No modal de edição:
  - Quando a categoria selecionada for "Fotos", exibir um seletor de gênero (Masculino/Feminino)
  - O campo só aparece quando categoria = "Fotos"

### 3. Campo de Gênero no Upload (`/admin-upload`)
- Quando a categoria selecionada for "Fotos", exibir opção de gênero
- O campo só aparece quando categoria = "Fotos"

### 4. Atualização do Arcano Cloner (PhotoLibraryModal)
- Alterar a busca para usar o novo campo `gender` ao invés de palavras-chave no título
- Consulta mais simples e precisa: `WHERE category = 'Fotos' AND gender = 'masculino'`

---

## Alterações no Banco de Dados

```sql
ALTER TABLE admin_prompts 
ADD COLUMN gender TEXT DEFAULT NULL;
```

---

## Arquivos que serão modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/AdminManageImages.tsx` | Adicionar filtro por categoria + campo gênero no modal de edição |
| `src/pages/AdminUpload.tsx` | Adicionar campo gênero quando categoria = "Fotos" |
| `src/components/arcano-cloner/PhotoLibraryModal.tsx` | Usar campo `gender` ao invés de keywords no título |

---

## Detalhes Técnicos

### AdminManageImages.tsx

1. **Novo estado para filtro de categoria**:
```tsx
const [categoryFilter, setCategoryFilter] = useState<string>('all');
```

2. **Novo estado para edição de gênero**:
```tsx
const [editGender, setEditGender] = useState<string | null>(null);
```

3. **Interface Prompt atualizada**:
```tsx
interface Prompt {
  // ... campos existentes
  gender?: string | null;
}
```

4. **Filtro no grid de arquivos** - adicionar filtro por categoria:
```tsx
const filteredAndSortedPrompts = prompts
  .filter(p => {
    const matchesSearch = ...;
    const matchesType = ...;
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  })
```

5. **UI de filtro por categoria** - botões na área de filtros existente

6. **No modal de edição** - quando categoria = "Fotos", exibir seletor de gênero:
```tsx
{editCategory === 'Fotos' && (
  <div className="flex items-center justify-between p-4 rounded-lg border ...">
    <Label>Gênero da Foto</Label>
    <Select value={editGender || ''} onValueChange={setEditGender}>
      <SelectItem value="masculino">Masculino</SelectItem>
      <SelectItem value="feminino">Feminino</SelectItem>
    </Select>
  </div>
)}
```

### AdminUpload.tsx

1. **Atualizar interface MediaData**:
```tsx
interface MediaData {
  // ... campos existentes
  gender: string | null;
}
```

2. **Adicionar campo gênero no modal de upload quando categoria = "Fotos"**

3. **Incluir `gender` no INSERT**:
```tsx
.insert({
  // ... outros campos
  gender: media.category === 'Fotos' ? media.gender : null,
})
```

### PhotoLibraryModal.tsx

1. **Simplificar a query** - usar campo `gender` diretamente:
```tsx
let query = supabase
  .from('admin_prompts')
  .select('id, title, image_url, thumbnail_url')
  .eq('category', 'Fotos')
  .eq('gender', filter) // 'masculino' ou 'feminino'
  .range(...)
  .order('created_at', { ascending: false });
```

2. **Remover filtragem client-side por keywords no título**

---

## Fluxo Visual

```text
┌─────────────────────────────────────────────────────────────┐
│            Gerenciar Arquivos Enviados                      │
├─────────────────────────────────────────────────────────────┤
│ [Todos] [Admins] [Comunidade] [Parceiros]                   │
│                                                              │
│ Categoria: [Todos ▼] [Fotos] [Telão] [Cenários] ...        │  ← NOVO
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│   │  Ensaio    │  │  Carna     │  │  Bloquinho │           │
│   │  Formal    │  │  Dany      │  │  Vinicius  │           │
│   │            │  │            │  │            │           │
│   │  [Editar]  │  │  [Editar]  │  │  [Editar]  │           │
│   └────────────┘  └────────────┘  └────────────┘           │
└─────────────────────────────────────────────────────────────┘

Modal de Edição (quando categoria = Fotos):
┌─────────────────────────────────────────────────────────────┐
│  Editar Arquivo                                              │
├─────────────────────────────────────────────────────────────┤
│  Título: [Ensaio Formal Autoridade           ]              │
│  Categoria: [Fotos ▼]                                        │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 👤 Gênero da Foto                                       ││  ← NOVO
│  │                         [Masculino ▼]                    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  [★ Conteúdo Premium/Gratuito]                              │
│  [Salvar Alterações]                                         │
└─────────────────────────────────────────────────────────────┘
```
