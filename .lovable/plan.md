

## O Problema

O componente do Hero (`HeroBeforeAfterSlider`) funciona porque passa um `style` explicitamente para o `ResilientImage` com dimensoes forcadas:

```tsx
// Hero - FUNCIONA
<ResilientImage 
  src={afterImage} 
  className="absolute inset-0"
  style={{
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center'
  }}
/>
```

Ja o `BeforeAfterSlider` (usado nos depoimentos) **nao** passa esse `style`:

```tsx
// Depoimentos - QUEBRADO
<ResilientImage 
  src={afterImage} 
  className="absolute inset-0"
  // SEM style! As imagens nao tem dimensoes forcadas
/>
```

O `style` prop e aplicado no `div` wrapper do `ResilientImage`, nao no `<img>` diretamente. Sem ele, o wrapper nao tem dimensoes explicitadas e as imagens ficam com tamanhos diferentes.

## A Solucao

Replicar exatamente o que o Hero faz: adicionar o prop `style` com `width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center'` nas duas chamadas de `ResilientImage` dentro do `BeforeAfterSlider.tsx`.

## Mudanca

**Arquivo:** `src/components/upscaler/BeforeAfterSlider.tsx`

1. Na imagem "After" (linha ~112-122), adicionar o prop `style`:
```tsx
<ResilientImage 
  src={afterImage} 
  alt={locale === 'es' ? "Después" : "Depois"}
  className="absolute inset-0"
  style={{
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center'
  }}
  timeout={8000}
  compressOnFailure={true}
  showDownloadOnFail={!!onDownloadClick}
  onDownloadClick={onDownloadClick}
  downloadFileName={downloadFileName}
  locale={locale}
/>
```

2. Na imagem "Before" (linha ~129-137), adicionar o mesmo prop `style`:
```tsx
<ResilientImage 
  src={beforeImage} 
  alt={locale === 'es' ? "Antes" : "Antes"}
  className="absolute inset-0"
  style={{
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center'
  }}
  timeout={8000}
  compressOnFailure={true}
  showDownloadOnFail={false}
  locale={locale}
/>
```

Isso e **exatamente** o que o Hero faz e resolve o problema das imagens com tamanhos diferentes.
