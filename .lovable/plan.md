
## Reformular Input de Foto de Referência

### Problema Atual
O card de referência usa o mesmo `ImageUploadCard` padrão que mostra área de upload + botão de biblioteca embaixo. O usuário quer que a biblioteca seja a opção principal e o upload seja secundário.

---

### Nova Estrutura do Componente

**Criar novo componente: `ReferenceImageCard.tsx`**

```text
┌──────────────────────────────┐
│  🖼️ Foto de Referência       │
├──────────────────────────────┤
│                              │
│     ┌────────────────┐       │
│     │                │       │
│     │       ➕       │       │ ← Quadrado grande com "+"
│     │                │       │    Ao clicar, abre modal
│     └────────────────┘       │
│                              │
│  "Escolha da biblioteca"     │ ← Texto explicativo
│                              │
└──────────────────────────────┘
```

**Quando imagem selecionada:**
```text
┌──────────────────────────────┐
│  🖼️ Foto de Referência       │
├──────────────────────────────┤
│   ┌────────────────┐  [X]    │
│   │                │         │
│   │   [Imagem]     │         │
│   │                │         │
│   └────────────────┘         │
│                              │
│  [🔄 Trocar]                 │ ← Botão para trocar
└──────────────────────────────┘
```

---

### Alterações no Modal da Biblioteca

**Adicionar botão de upload no topo do modal:**
```text
┌─────────────────────────────────────────┐
│  🖼️ Biblioteca de Fotos de Referência   │
├─────────────────────────────────────────┤
│  ┌────────────────────────────────────┐ │
│  │  📤 Enviar Sua Própria Imagem      │ │ ← Botão chamativo
│  └────────────────────────────────────┘ │
│                                         │
│  ── ou escolha da biblioteca ──         │ ← Separador
│                                         │
│  [Masculino] [Feminino]                 │ ← Filtros
│                                         │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐               │
│  │📷│ │📷│ │📷│ │📷│               │ ← Grid de fotos
│  └───┘ └───┘ └───┘ └───┘               │
└─────────────────────────────────────────┘
```

---

### Arquivos a Modificar

1. **`src/components/arcano-cloner/ReferenceImageCard.tsx`** (CRIAR)
   - Novo componente com quadrado "+" que abre modal direto
   - Visual diferente, focado em abrir biblioteca

2. **`src/components/arcano-cloner/PhotoLibraryModal.tsx`** (MODIFICAR)
   - Adicionar input de arquivo oculto
   - Adicionar botão "Enviar Sua Própria Imagem" no topo
   - Prop callback para upload de arquivo próprio

3. **`src/pages/ArcanoClonerTool.tsx`** (MODIFICAR)
   - Trocar `ImageUploadCard` do input de referência pelo novo `ReferenceImageCard`
   - Ajustar handlers para receber tanto URL (biblioteca) quanto File (upload próprio)

---

### Fluxo do Usuário

1. Usuário clica no quadrado com "+" → Abre modal da biblioteca
2. No modal:
   - Opção destacada: "Enviar Sua Própria Imagem" (com ícone de upload)
   - Grid de fotos da biblioteca com filtros Masc/Fem
3. Se escolher da biblioteca → URL da imagem vai para o input
4. Se escolher upload próprio → Abre seletor de arquivo, processa e vai para o input
5. Com imagem selecionada, card mostra preview + botão "Trocar"

---

### Detalhes Técnicos

**ReferenceImageCard props:**
```typescript
interface ReferenceImageCardProps {
  image: string | null;
  onImageChange: (dataUrl: string | null, file?: File) => void;
  onOpenLibrary: () => void;
  disabled?: boolean;
}
```

**PhotoLibraryModal props atualizadas:**
```typescript
interface PhotoLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPhoto: (imageUrl: string) => void;
  onUploadPhoto: (dataUrl: string, file: File) => void;  // NOVO
}
```

**Visual do botão "+":**
- Quadrado com bordas tracejadas roxas
- Ícone "+" grande centralizado
- Efeito hover com brilho fúcsia
- Texto abaixo: "Escolha da biblioteca"
