

# Plano: Melhorar Zoom e Aumentar Visor do Upscaler

## Problemas Identificados

1. **Zoom muito lento**: O `WHEEL_FACTOR = 1.15` requer muitos giros de mouse para aumentar/diminuir
2. **Visor pequeno no desktop**: O container do resultado usa largura total mas poderia ser maior

---

## Solução 1: Zoom Exponencial Mais Rápido

Aumentar o `WHEEL_FACTOR` de `1.15` para `1.40` (quase 3x mais rápido por giro):

| Configuração | Valor Atual | Novo Valor | Efeito |
|--------------|-------------|------------|--------|
| WHEEL_FACTOR | 1.15 | 1.40 | ~3x mais rápido por giro de scroll |
| Animação | 200ms | 150ms | Transição mais fluida |

Cada giro de scroll agora aumenta/diminui 40% ao invés de 15%, fazendo o zoom parecer muito mais responsivo.

---

## Solução 2: Aumentar Container 50% no Desktop

Atualmente o container do resultado ocupa a largura disponível. Para aumentar 50% verticalmente no desktop:

- Trocar o AspectRatio de `16/9` para `4/3` (mais alto)
- Adicionar altura mínima no desktop: `md:min-h-[600px]`

Isso dá mais espaço vertical para visualizar a imagem no desktop sem quebrar mobile.

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/UpscalerArcanoTool.tsx` | Ajustar WHEEL_FACTOR e AspectRatio |

---

## Código a Alterar

### Linha 837 - Zoom mais rápido
```tsx
// Antes:
const WHEEL_FACTOR = 1.15;

// Depois:
const WHEEL_FACTOR = 1.40;
```

### Linha 870 - Animação mais fluida
```tsx
// Antes:
transformRef.setTransform(newPosX, newPosY, newScale, 200, 'easeOut');

// Depois:
transformRef.setTransform(newPosX, newPosY, newScale, 150, 'easeOut');
```

### Linha 873 - Container maior no desktop
```tsx
// Antes:
<AspectRatio ratio={16 / 9}>

// Depois:
<AspectRatio ratio={16 / 9} className="md:!aspect-[4/3]">
```

---

## Resultado Esperado

- Zoom 3x mais rápido e mais fluido
- Visor 50% mais alto no desktop
- Mantém experiência mobile inalterada

