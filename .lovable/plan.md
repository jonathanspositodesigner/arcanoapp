

# Plano: Aumentar Cards de Upload com Aspect Ratio 3:4

## Objetivo

Ampliar os componentes de upload de imagem no desktop e usar aspect ratio 3:4 para exibição das imagens.

---

## Alteração 1: ImageUploadCard.tsx

**Mudanças na área de upload:**

```text
Antes:  h-16 (64px) fixo para mobile e desktop
Depois: h-20 para mobile, lg:h-auto com aspect-[3/4] para desktop
```

### Detalhes Técnicos:

```typescript
// Área de Upload - Antes
<div className="relative h-16 flex flex-col items-center justify-center ...">

// Área de Upload - Depois
<div className="relative h-20 lg:aspect-[3/4] flex flex-col items-center justify-center ...">
```

### Exibição da Imagem:

```typescript
// Antes
<img src={image} className="w-full h-full object-contain" />

// Depois - Centralizada com aspect ratio
<div className="w-full h-full flex items-center justify-center p-2">
  <img src={image} className="max-w-full max-h-full object-contain" />
</div>
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/pose-changer/ImageUploadCard.tsx` | Alterar altura para `lg:aspect-[3/4]` e ajustar layout da imagem |

---

## Resultado Visual

```text
Desktop:
┌────────────────┐
│ 📷 Sua Foto    │
├────────────────┤
│                │
│    [IMAGEM]    │  ← Aspect 3:4 (~180-200px altura)
│                │
└────────────────┘
┌────────────────┐
│ 📷 Ref. Pose   │
├────────────────┤
│                │
│    [IMAGEM]    │  ← Aspect 3:4 (~180-200px altura)
│                │
├────────────────┤
│ Biblioteca...  │
└────────────────┘

Mobile: Mantém compacto (h-20 = 80px)
```

