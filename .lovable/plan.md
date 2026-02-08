
## Resumo
Replicar o sistema de foto de referência do Arcano Cloner (ReferenceImageCard + PhotoLibraryModal) para as ferramentas **Pose Changer** e **Veste AI**, substituindo os modais atuais (`PoseLibraryModal` e `ClothingLibraryModal`) pelo novo sistema unificado que permite escolher fotos da biblioteca da categoria "Fotos" OU enviar sua própria imagem.

---

## O que será implementado

### Para ambas as ferramentas (Pose Changer e Veste AI):
1. **Substituir o segundo ImageUploadCard** pelo componente `ReferenceImageCard`
2. **Substituir os modais antigos** (`PoseLibraryModal` / `ClothingLibraryModal`) pelo `PhotoLibraryModal`
3. **Adicionar funções** para tratar upload via modal e seleção da biblioteca

---

## Arquivos que serão modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/PoseChangerTool.tsx` | Usar ReferenceImageCard + PhotoLibraryModal |
| `src/pages/VesteAITool.tsx` | Usar ReferenceImageCard + PhotoLibraryModal |

---

## Alterações no PoseChangerTool.tsx

### 1. Imports
```tsx
// Remover:
import PoseLibraryModal from '@/components/pose-changer/PoseLibraryModal';

// Adicionar:
import ReferenceImageCard from '@/components/arcano-cloner/ReferenceImageCard';
import PhotoLibraryModal from '@/components/arcano-cloner/PhotoLibraryModal';
```

### 2. Estado - renomear para consistência
- `showPoseLibrary` → `showPhotoLibrary`

### 3. Funções de handling
```tsx
// Seleção da biblioteca (recebe URL)
const handleSelectFromLibrary = (imageUrl: string) => {
  handleReferenceImageChange(imageUrl);
};

// Upload pelo modal (recebe dataUrl + file)
const handleUploadFromModal = (dataUrl: string, file: File) => {
  setReferenceImage(dataUrl);
  setReferenceFile(file);
};

// Limpar referência
const handleClearReference = () => {
  setReferenceImage(null);
  setReferenceFile(null);
};
```

### 4. JSX - Substituir segundo ImageUploadCard
```tsx
// DE:
<ImageUploadCard
  title="Referência de Pose"
  image={referenceImage}
  onImageChange={handleReferenceImageChange}
  showLibraryButton
  onOpenLibrary={() => setShowPoseLibrary(true)}
  disabled={isProcessing}
/>

// PARA:
<ReferenceImageCard
  image={referenceImage}
  onClearImage={handleClearReference}
  onOpenLibrary={() => setShowPhotoLibrary(true)}
  disabled={isProcessing}
/>
```

### 5. JSX - Substituir modal
```tsx
// DE:
<PoseLibraryModal
  isOpen={showPoseLibrary}
  onClose={() => setShowPoseLibrary(false)}
  onSelectPose={(url) => handleReferenceImageChange(url)}
/>

// PARA:
<PhotoLibraryModal
  isOpen={showPhotoLibrary}
  onClose={() => setShowPhotoLibrary(false)}
  onSelectPhoto={handleSelectFromLibrary}
  onUploadPhoto={handleUploadFromModal}
/>
```

---

## Alterações no VesteAITool.tsx

### 1. Imports
```tsx
// Remover:
import ClothingLibraryModal from '@/components/veste-ai/ClothingLibraryModal';

// Adicionar:
import ReferenceImageCard from '@/components/arcano-cloner/ReferenceImageCard';
import PhotoLibraryModal from '@/components/arcano-cloner/PhotoLibraryModal';
```

### 2. Estado - renomear para consistência
- `showClothingLibrary` → `showPhotoLibrary`
- `clothingImage` → `referenceImage` (opcional, para consistência)
- `clothingFile` → `referenceFile` (opcional, para consistência)

### 3. Funções de handling (mesmo padrão do Pose Changer)
```tsx
const handleSelectFromLibrary = (imageUrl: string) => {
  handleClothingImageChange(imageUrl);
};

const handleUploadFromModal = (dataUrl: string, file: File) => {
  setClothingImage(dataUrl);
  setClothingFile(file);
};

const handleClearClothing = () => {
  setClothingImage(null);
  setClothingFile(null);
};
```

### 4. JSX - Substituir segundo ImageUploadCard
```tsx
// DE:
<ImageUploadCard
  title="Roupa de Referência"
  image={clothingImage}
  onImageChange={handleClothingImageChange}
  showLibraryButton
  libraryButtonLabel="Biblioteca de Roupas"
  onOpenLibrary={() => setShowClothingLibrary(true)}
  disabled={isProcessing}
/>

// PARA:
<ReferenceImageCard
  image={clothingImage}
  onClearImage={handleClearClothing}
  onOpenLibrary={() => setShowPhotoLibrary(true)}
  disabled={isProcessing}
/>
```

### 5. JSX - Substituir modal
```tsx
// DE:
<ClothingLibraryModal
  isOpen={showClothingLibrary}
  onClose={() => setShowClothingLibrary(false)}
  onSelectClothing={handleClothingImageChange}
/>

// PARA:
<PhotoLibraryModal
  isOpen={showPhotoLibrary}
  onClose={() => setShowPhotoLibrary(false)}
  onSelectPhoto={handleSelectFromLibrary}
  onUploadPhoto={handleUploadFromModal}
/>
```

---

## Resultado Final

As três ferramentas (Arcano Cloner, Pose Changer, Veste AI) terão:

1. **O mesmo componente de foto de referência** (`ReferenceImageCard`)
   - Card com "+" para abrir biblioteca
   - Botão de trocar quando já tem imagem
   - Botão X para remover

2. **O mesmo modal de biblioteca** (`PhotoLibraryModal`)
   - Botão destacado "Enviar Sua Própria Imagem"
   - Filtros Masculino/Feminino
   - Busca por palavras-chave/tags
   - Grade de fotos da categoria "Fotos"
   - Paginação com "Carregar mais"

---

## Fluxo Visual Unificado

```text
┌─────────────────────────────────────────────────────────────┐
│  [Pose Changer / Veste AI / Arcano Cloner]                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │  Sua Foto    │  │ Foto de Ref. │                         │
│  │  [upload]    │  │     [+]      │  ← Clica abre modal    │
│  └──────────────┘  └──────────────┘                         │
│                                                              │
│  [   Gerar Imagem (XX créditos)   ]                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Modal (igual para todas):
┌─────────────────────────────────────────────────────────────┐
│  📷 Biblioteca de Fotos                              [X]    │
├─────────────────────────────────────────────────────────────┤
│  [       Enviar Sua Própria Imagem       ]                  │
│                                                              │
│             ou escolha da biblioteca                         │
│                                                              │
│  [👤 Masculino]  [👤 Feminino]                              │
│  🔍 [ Buscar por palavra-chave...        ]                  │
│                                                              │
│   ┌────────┐  ┌────────┐  ┌────────┐                        │
│   │  Foto  │  │  Foto  │  │  Foto  │                        │
│   │   1    │  │   2    │  │   3    │                        │
│   └────────┘  └────────┘  └────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Observação

Os arquivos `PoseLibraryModal.tsx` e `ClothingLibraryModal.tsx` não serão deletados, apenas não serão mais usados. Se quiser, posso removê-los posteriormente.
