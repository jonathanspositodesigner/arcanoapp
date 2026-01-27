
# Plano: Restaurar FeaturesSection + Corrigir CLS

## O Problema
A seção `FeaturesSection` com os 6 cards (Acesso Imediato, 7 Dias de Garantia, Grupo VIP, Suporte Técnico, Plataforma de Membros, Atualizações Constantes) está importada mas **não está sendo renderizada** na página.

O componente existe e funciona perfeitamente - só precisa ser adicionado de volta no JSX.

---

## Solução

### Arquivo: `src/pages/ComboArtesArcanas.tsx`

Adicionar `<FeaturesSection />` logo após o `HeroSectionCombo` e antes do scroll indicator:

```text
Estrutura ATUAL (errada):
  HeroSectionCombo
  ChevronDown
  FlyersGallerySection...

Estrutura CORRIGIDA:
  HeroSectionCombo
  FeaturesSection       ← ADICIONAR AQUI
  ChevronDown
  FlyersGallerySection...
```

### Código a adicionar (entre linhas 75-77):

```tsx
return (
  <div className="min-h-screen bg-black">
    {/* Above the fold - carrega imediatamente */}
    <HeroSectionCombo />
    
    {/* Features Section - RESTAURAR AQUI */}
    <FeaturesSection />
    
    {/* Animated scroll indicator */}
    <div className="flex justify-center pb-4 bg-black">
      ...
```

---

## Também vou aplicar as correções de CLS

Como você também pediu para corrigir o Layout Shift, vou aproveitar e fazer as duas coisas juntas:

1. **Restaurar FeaturesSection** logo após o Hero
2. **Corrigir glow effect** no Hero (causa 0.294 CLS)
3. **Adicionar dimensões nas imagens** do Hero
4. **Remover min-h-screen** do Hero (já que a FeaturesSection vai aparecer abaixo)

---

## Arquivos a modificar

| Arquivo | Mudança |
|---------|---------|
| `ComboArtesArcanas.tsx` | Adicionar `<FeaturesSection />` após o Hero |
| `HeroSectionCombo.tsx` | Corrigir glow + adicionar width/height nas imagens |

---

## Resultado Final

A página vai ter a estrutura correta:
1. Hero com logo + título + imagem
2. **FeaturesSection com os 6 cards** ← Restaurado
3. Seta de scroll
4. Galeria de Flyers
5. Resto das seções...
