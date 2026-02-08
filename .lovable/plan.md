
## Resumo
Adicionar busca por palavras-chave na Biblioteca de Fotos (Arcano Cloner) e sistema de tags nos arquivos da categoria "Fotos" para facilitar a pesquisa.

---

## O que será implementado

### 1. Nova coluna `tags` na tabela `admin_prompts`
- Tipo: `TEXT[]` (array de strings)
- Permite até 10 tags por item
- Será usado para busca no modal da biblioteca

### 2. Campo de busca no PhotoLibraryModal
- Adicionar um input com ícone de lupa 🔍
- Busca em tempo real pelo título E pelas tags
- Debounce de 300ms para evitar muitas consultas
- A busca funciona junto com o filtro de gênero

### 3. Campo de Tags no AdminUpload (quando categoria = "Fotos")
- Input que permite adicionar até 10 tags
- Tags aparecem como chips removíveis
- Validação: máximo 10 tags, cada tag max 30 caracteres

### 4. Campo de Tags no AdminManageImages (edição)
- Mesmo comportamento do upload
- Permite editar tags de itens existentes

---

## Sobre identificar imagens automaticamente

⚠️ **Não é possível** eu analisar automaticamente as imagens do banco de dados. Eu não tenho acesso para "ver" as imagens que estão hospedadas. Você precisará:
1. Adicionar as tags manualmente na hora de editar cada item, OU
2. Usar uma ferramenta externa de IA (como GPT Vision) para classificar as imagens

---

## Alterações no Banco de Dados

```sql
ALTER TABLE admin_prompts 
ADD COLUMN tags TEXT[] DEFAULT NULL;
```

---

## Arquivos que serão modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/arcano-cloner/PhotoLibraryModal.tsx` | Adicionar campo de busca + consulta por tags |
| `src/pages/AdminUpload.tsx` | Adicionar campo de tags quando categoria = "Fotos" |
| `src/pages/AdminManageImages.tsx` | Adicionar campo de tags na edição |

---

## Detalhes Técnicos

### 1. PhotoLibraryModal.tsx

**Novo estado para busca:**
```tsx
const [searchTerm, setSearchTerm] = useState('');
const [debouncedSearch, setDebouncedSearch] = useState('');
```

**Debounce effect:**
```tsx
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(searchTerm);
  }, 300);
  return () => clearTimeout(timer);
}, [searchTerm]);
```

**Query atualizada com busca:**
```tsx
let query = supabase
  .from('admin_prompts')
  .select('id, title, image_url, thumbnail_url, gender, tags')
  .eq('category', 'Fotos')
  .eq('gender', filter);

// Adicionar filtro de busca
if (debouncedSearch.trim()) {
  // Busca no título OU nas tags
  query = query.or(`title.ilike.%${debouncedSearch}%,tags.cs.{${debouncedSearch}}`);
}
```

**UI - Input de busca (após filtros de gênero):**
```tsx
<div className="relative mt-3">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/60" />
  <Input
    type="text"
    placeholder="Buscar por palavra-chave..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="pl-10 bg-purple-500/10 border-purple-500/30 text-white placeholder:text-purple-400/50"
  />
</div>
```

### 2. AdminUpload.tsx

**Atualizar interface MediaData:**
```tsx
interface MediaData {
  // ... campos existentes
  tags: string[];
}
```

**Inicializar tags vazias:**
```tsx
tags: []
```

**Componente de tags (quando categoria = "Fotos"):**
```tsx
{currentMedia.category === 'Fotos' && (
  <div className="space-y-2">
    <Label>Tags de Busca (até 10)</Label>
    <div className="flex flex-wrap gap-2 mb-2">
      {currentMedia.tags.map((tag, idx) => (
        <Badge key={idx} variant="secondary" className="flex items-center gap-1">
          {tag}
          <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(idx)} />
        </Badge>
      ))}
    </div>
    {currentMedia.tags.length < 10 && (
      <Input
        placeholder="Digite uma tag e pressione Enter"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
            addTag(e.currentTarget.value.trim());
            e.currentTarget.value = '';
          }
        }}
      />
    )}
    <p className="text-xs text-muted-foreground">
      {currentMedia.tags.length}/10 tags
    </p>
  </div>
)}
```

**Incluir tags no INSERT:**
```tsx
.insert({
  // ... outros campos
  tags: media.category === 'Fotos' && media.tags.length > 0 ? media.tags : null,
})
```

### 3. AdminManageImages.tsx

**Novo estado para edição de tags:**
```tsx
const [editTags, setEditTags] = useState<string[]>([]);
```

**Inicializar no handleEdit:**
```tsx
setEditTags(prompt.tags || []);
```

**UI no modal de edição (quando categoria = "Fotos"):**
Mesmo componente de tags do AdminUpload

**Incluir tags no UPDATE:**
```tsx
if (editingPrompt.type === 'admin') {
  updateData.gender = editCategory === 'Fotos' ? editGender : null;
  updateData.tags = editCategory === 'Fotos' && editTags.length > 0 ? editTags : null;
}
```

---

## Fluxo Visual

```text
Biblioteca de Fotos (PhotoLibraryModal)
┌─────────────────────────────────────────────────────────────┐
│  📷 Biblioteca de Fotos                              [X]    │
├─────────────────────────────────────────────────────────────┤
│  [       Enviar Sua Própria Imagem       ]                  │
│                                                              │
│             ou escolha da biblioteca                         │
│                                                              │
│  [👤 Masculino]  [👤 Feminino]                              │
│                                                              │
│  🔍 [ Buscar por palavra-chave...        ]  ← NOVO          │
│                                                              │
│   ┌────────┐  ┌────────┐  ┌────────┐                        │
│   │  Foto  │  │  Foto  │  │  Foto  │                        │
│   │   1    │  │   2    │  │   3    │                        │
│   └────────┘  └────────┘  └────────┘                        │
└─────────────────────────────────────────────────────────────┘

Admin Upload / Edição (quando categoria = Fotos)
┌─────────────────────────────────────────────────────────────┐
│  Gênero: [Masculino ▼]                                      │
│                                                              │
│  Tags de Busca (até 10):                              ← NOVO│
│  [formal] [cantor] [estúdio] [+]                            │
│  [Digite uma tag e pressione Enter...]                      │
│  3/10 tags                                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Exemplos de Tags Sugeridas

Para a categoria "Fotos", você pode usar tags como:
- **Estilo**: formal, casual, esportivo, elegante
- **Profissão**: cantor, cantora, dj, empresário, médico
- **Ambiente**: estúdio, externo, natureza, urbano
- **Pose**: sentado, em pé, close, corpo inteiro
- **Cores**: escuro, claro, colorido, preto e branco
