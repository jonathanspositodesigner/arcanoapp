
# Plano: Renomear Botão para "Biblioteca de Roupas" no Veste AI

## Problema Identificado

O componente `ImageUploadCard.tsx` possui o texto **hardcoded** "Biblioteca de Poses" (linha 170), que é exibido tanto na ferramenta Pose Changer quanto na Veste AI. Como a Veste AI é para trocar **roupas**, o botão deveria mostrar "Biblioteca de Roupas".

## Solução

Adicionar uma prop `libraryButtonLabel` ao componente `ImageUploadCard` para permitir customização do texto do botão. O texto padrão será "Biblioteca de Poses" para manter compatibilidade com o Pose Changer.

---

## Mudanças Planejadas

### Arquivo 1: `src/components/pose-changer/ImageUploadCard.tsx`

#### 1.1 Adicionar nova prop na interface

```text
interface ImageUploadCardProps {
  title: string;
  subtitle?: string;
  image: string | null;
  onImageChange: (image: string | null, file?: File) => void;
  showLibraryButton?: boolean;
  onOpenLibrary?: () => void;
  libraryButtonLabel?: string;  // ← NOVO
  className?: string;
  disabled?: boolean;
}
```

#### 1.2 Adicionar na desestruturação do componente

```text
const ImageUploadCard: React.FC<ImageUploadCardProps> = ({
  title,
  subtitle,
  image,
  onImageChange,
  showLibraryButton = false,
  onOpenLibrary,
  libraryButtonLabel = 'Biblioteca de Poses',  // ← NOVO com valor padrão
  className,
  disabled = false,
}) => {
```

#### 1.3 Usar a prop no botão (linha 170)

```text
// Antes
<Library className="w-3 h-3 mr-1" />
Biblioteca de Poses

// Depois
<Library className="w-3 h-3 mr-1" />
{libraryButtonLabel}
```

---

### Arquivo 2: `src/pages/VesteAITool.tsx`

#### 2.1 Adicionar a prop no ImageUploadCard de roupa (linha 427-434)

```text
// Antes
<ImageUploadCard
  title="Roupa de Referência"
  image={clothingImage}
  onImageChange={handleClothingImageChange}
  showLibraryButton
  onOpenLibrary={() => setShowClothingLibrary(true)}
  disabled={isProcessing}
/>

// Depois
<ImageUploadCard
  title="Roupa de Referência"
  image={clothingImage}
  onImageChange={handleClothingImageChange}
  showLibraryButton
  libraryButtonLabel="Biblioteca de Roupas"  // ← NOVO
  onOpenLibrary={() => setShowClothingLibrary(true)}
  disabled={isProcessing}
/>
```

---

## Resultado Visual

### Pose Changer (não muda):
```text
┌─────────────────────────┐
│ Pose de Referência      │
│ [imagem]                │
│ ┌─────────────────────┐ │
│ │ 📚 Biblioteca de Poses│ │  ← Mantém "Poses"
│ └─────────────────────┘ │
└─────────────────────────┘
```

### Veste AI (corrigido):
```text
┌─────────────────────────┐
│ Roupa de Referência     │
│ [imagem]                │
│ ┌──────────────────────┐│
│ │ 📚 Biblioteca de Roupas│ │  ← Agora mostra "Roupas"
│ └──────────────────────┘│
└─────────────────────────┘
```

---

## Resumo das Mudanças

| Arquivo | Mudança |
|---------|---------|
| `ImageUploadCard.tsx` | + Prop `libraryButtonLabel` com default "Biblioteca de Poses" |
| `ImageUploadCard.tsx` | Usar `{libraryButtonLabel}` no texto do botão |
| `VesteAITool.tsx` | Passar `libraryButtonLabel="Biblioteca de Roupas"` |

---

## Arquivos que NÃO mudam

- `PoseChangerTool.tsx` - Continua usando o padrão "Biblioteca de Poses"
- `ClothingLibraryModal.tsx` - Já tem título correto "Biblioteca de Roupas" (linha 103)
