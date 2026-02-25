

## Bloquear fotos premium na Biblioteca de Fotos das ferramentas de IA

### Resumo
A `PhotoLibraryModal` (usada pelo Pose Changer, Arcano Cloner e Veste AI) mostra fotos da tabela `admin_prompts` (categoria "Fotos") mas ignora completamente o campo `is_premium`. Vamos adicionar controle de acesso para que:

- **Todas as fotos aparecem** na biblioteca (premium e gratuitas)
- **Fotos premium para usuarios premium**: exibem uma badge "Premium" discreta, mas podem ser selecionadas normalmente
- **Fotos premium para usuarios gratuitos**: exibem um overlay com cadeado e botao "Torne-se Premium", bloqueando a selecao. Ao clicar, redireciona para a pagina de planos

### Mudancas

#### 1. `src/components/arcano-cloner/PhotoLibraryModal.tsx`

- Adicionar `is_premium` ao select da query e a interface `PhotoItem`
- Receber `isPremiumUser` como prop (booleano)
- Para cada foto no grid:
  - Se `photo.is_premium && !isPremiumUser`: overlay escuro com icone de cadeado + texto "Exclusivo Premium" + botao "Torne-se Premium" que navega para `/planos-upscaler-creditos`
  - Se `photo.is_premium && isPremiumUser`: badge pequena "Premium" no canto superior direito (estilo dourado)
  - Se `!photo.is_premium`: sem alteracao, funciona normalmente
- Bloquear `handleSelectPhoto` para fotos premium quando usuario nao e premium

#### 2. Paginas que usam o PhotoLibraryModal (3 arquivos)

Passar a prop `isPremiumUser` para o modal:

- `src/pages/PoseChangerTool.tsx` - ja importa `usePremiumStatus`, extrair `isPremium`
- `src/pages/ArcanoClonerTool.tsx` - ja importa `usePremiumStatus`, extrair `isPremium`
- `src/pages/VesteAITool.tsx` - ja importa `usePremiumStatus`, extrair `isPremium`

Em cada um, mudar de `const { user } = usePremiumStatus()` para `const { user, isPremium } = usePremiumStatus()` e passar `isPremiumUser={isPremium}` ao `PhotoLibraryModal`.

### Detalhes tecnicos

**Interface PhotoItem atualizada:**
```typescript
interface PhotoItem {
  id: string;
  title: string;
  image_url: string;
  thumbnail_url?: string | null;
  gender?: string | null;
  is_premium?: boolean;
}
```

**Query atualizada:**
```typescript
.select('id, title, image_url, thumbnail_url, gender, tags, is_premium')
```

**Logica de bloqueio no grid:**
```typescript
const handleSelectPhoto = (photo: PhotoItem) => {
  if (photo.is_premium && !isPremiumUser) {
    toast.error('Esta foto e exclusiva para usuarios Premium');
    return;
  }
  onSelectPhoto(photo.image_url);
  onClose();
};
```

**Visual da foto premium bloqueada:**
- Overlay semi-transparente escuro
- Icone de cadeado centralizado
- Badge "Premium" no topo
- Ao clicar: toast + nao seleciona

**Visual da foto premium liberada (usuario premium):**
- Badge dourada "Premium" pequena no canto superior direito
- Selecao funciona normalmente

### Arquivos afetados
- `src/components/arcano-cloner/PhotoLibraryModal.tsx` (logica principal)
- `src/pages/PoseChangerTool.tsx` (passar isPremium)
- `src/pages/ArcanoClonerTool.tsx` (passar isPremium)
- `src/pages/VesteAITool.tsx` (passar isPremium)
