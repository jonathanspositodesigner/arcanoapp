

## Correções no Painel Admin de Gerenciamento de Artes

### Problemas identificados

1. **Pack e Categoria não aparecem pré-selecionados na edição**
2. **Falta filtro para ver apenas imagens ou apenas vídeos**
3. **Botão "Baixar PSD" deve mostrar "Arquivo PSD e After" quando é motion After Effects**

---

### 1) Garantir que Pack e Categoria venham pré-selecionados

**Problema:** O `handleEdit` já define `setEditCategory(arte.category)` e `setEditPack(arte.pack || "")`, mas para garantir que funcione corretamente, precisamos verificar se os valores estão sendo passados corretamente e se os Selects estão exibindo o valor.

**Arquivo:** `src/pages/AdminManageArtes.tsx`

O código atual na função `handleEdit` (linhas 246-261):
```typescript
const handleEdit = (arte: Arte) => {
  setEditingArte(arte);
  setEditTitle(arte.title);
  setEditDescription(arte.description || "");
  setEditCategory(arte.category);  // Já está configurado
  setEditPack(arte.pack || "");    // Já está configurado
  ...
};
```

**Verificação:** O Select de categoria usa `value={editCategory}` e os items usam `value={cat.name}`. Isso significa que `editCategory` precisa ser exatamente igual ao `cat.name`. O mesmo para pack.

**Solução:** Adicionar um fallback para garantir que se a categoria/pack existir no banco mas não na lista de options, ele ainda apareça selecionado. Além disso, garantir que o `SelectValue` mostre o valor atual.

Atualizar os Selects para usar `placeholder` apropriado:

```typescript
// Categoria
<SelectTrigger className="mt-1">
  <SelectValue placeholder="Selecione a categoria" />
</SelectTrigger>

// Pack  
<SelectTrigger className="mt-1">
  <SelectValue placeholder="Selecione o pack" />
</SelectTrigger>
```

E adicionar a categoria/pack atual como opção caso não exista na lista:

```typescript
// Adicionar item para categoria atual se não existir na lista
{editCategory && !categories.find(c => c.name === editCategory) && (
  <SelectItem value={editCategory}>{editCategory}</SelectItem>
)}
```

---

### 2) Adicionar filtro de Imagem/Vídeo

**Arquivo:** `src/pages/AdminManageArtes.tsx`

**Adicionar novo estado:**
```typescript
const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'image' | 'video'>('all');
```

**Atualizar o filtro de artes (linhas 232-244):**
```typescript
const filteredAndSortedArtes = artes
  .filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || a.type === typeFilter;
    const matchesBroken = !brokenFilter || brokenIds.has(a.id);
    
    // Novo filtro de tipo de mídia
    const isVideo = isVideoUrl(a.image_url);
    const matchesMediaType = mediaTypeFilter === 'all' || 
      (mediaTypeFilter === 'video' && isVideo) || 
      (mediaTypeFilter === 'image' && !isVideo);
    
    return matchesSearch && matchesType && matchesBroken && matchesMediaType;
  })
  ...
```

**Adicionar botões de filtro na UI (após os botões de tipo existentes):**
```typescript
<div className="flex flex-wrap gap-2 mb-4">
  <span className="text-sm text-muted-foreground self-center mr-2">Tipo de mídia:</span>
  <Button 
    variant={mediaTypeFilter === 'all' ? 'default' : 'outline'} 
    size="sm" 
    onClick={() => setMediaTypeFilter('all')}
  >
    Todos
  </Button>
  <Button 
    variant={mediaTypeFilter === 'image' ? 'default' : 'outline'} 
    size="sm" 
    onClick={() => setMediaTypeFilter('image')}
    className={mediaTypeFilter === 'image' ? 'bg-blue-500 hover:bg-blue-600' : ''}
  >
    🖼️ Imagens
  </Button>
  <Button 
    variant={mediaTypeFilter === 'video' ? 'default' : 'outline'} 
    size="sm" 
    onClick={() => setMediaTypeFilter('video')}
    className={mediaTypeFilter === 'video' ? 'bg-purple-500 hover:bg-purple-600' : ''}
  >
    🎬 Vídeos
  </Button>
</div>
```

---

### 3) Botão "Arquivo PSD e After" para vídeos After Effects

**Arquivo:** `src/pages/BibliotecaArtes.tsx`

**Problema:** O botão de download do Drive sempre mostra "Baixar PSD" (tradução `buttons.downloadPsd`), mas quando o vídeo é `motion_type = 'after_effects'`, deve mostrar "Arquivo PSD e After".

**Localização:** Linhas 1464-1469 no modal de detalhes:

```typescript
{selectedArte.driveLink && <Button onClick={() => {
  window.open(selectedArte.driveLink, '_blank');
}} className="w-full bg-[#31A8FF] hover:bg-[#2196F3] text-white">
  <Download className="h-4 w-4 mr-2" />
  {t('buttons.downloadPsd')}
</Button>}
```

**Solução:** Verificar se é motion After Effects e mostrar texto diferente:

```typescript
{selectedArte.driveLink && <Button onClick={() => {
  window.open(selectedArte.driveLink, '_blank');
}} className="w-full bg-[#31A8FF] hover:bg-[#2196F3] text-white">
  <Download className="h-4 w-4 mr-2" />
  {selectedArte.motionType === 'after_effects' 
    ? 'Arquivo PSD e After' 
    : t('buttons.downloadPsd')}
</Button>}
```

**Também aplicar em:** `src/pages/BibliotecaArtesMusicos.tsx` (linha 449) para manter consistência.

---

### Arquivos a modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/AdminManageArtes.tsx` | 1) Adicionar fallback para categoria/pack atual nos Selects <br> 2) Adicionar filtro de imagem/vídeo |
| `src/pages/BibliotecaArtes.tsx` | Alterar texto do botão de download para "Arquivo PSD e After" quando é motion After Effects |
| `src/pages/BibliotecaArtesMusicos.tsx` | Alterar texto do botão de download para "Arquivo PSD e After" quando é motion After Effects |

---

### Resultado esperado

1. **Edição de artes:** Pack e categoria já vêm selecionados com os valores atuais
2. **Painel admin:** Novos botões de filtro para ver só imagens ou só vídeos
3. **Biblioteca do usuário:** Quando a arte é vídeo com motion After Effects, o botão mostra "Arquivo PSD e After" em vez de "Baixar PSD"

