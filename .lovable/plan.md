

# Correção: Imagem "Depois" Quebrada no Upscaler na Segunda Utilização

## Problema Identificado

Na segunda vez que você usa o Upscaler Arcano, a imagem "DEPOIS" no comparador antes/depois aparece quebrada (ícone de imagem quebrada), mesmo que o job tenha sido concluído com sucesso.

## Causa Raiz

O problema está no componente `TransformWrapper` (biblioteca de zoom/pan) que **não está sendo remontado** quando uma nova imagem é recebida:

- **Pose Changer**: usa `key={outputImage}` → força remontagem quando a imagem muda ✅
- **Upscaler Arcano**: **NÃO** usa `key` → mantém estado interno antigo ❌

Quando o estado interno do componente de zoom não é resetado, ele pode manter referências ou transformações da imagem anterior, causando o bug visual.

## Solução

Adicionar `key={outputImage}` no `TransformWrapper` do Upscaler para forçar a remontagem quando uma nova imagem de resultado é recebida.

## Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/UpscalerArcanoTool.tsx` | Adicionar `key={outputImage}` na linha 1162 |

## Mudança Específica

**Antes (linha 1162):**
```tsx
<TransformWrapper
  initialScale={1}
  minScale={1}
  ...
```

**Depois:**
```tsx
<TransformWrapper
  key={outputImage}
  initialScale={1}
  minScale={1}
  ...
```

## Por Que Funciona

O React usa a prop `key` para identificar elementos únicos. Quando o `key` muda (nova URL de imagem), o React:
1. Desmonta o componente antigo completamente
2. Monta um novo componente "limpo"
3. Todo o estado interno é resetado
4. A nova imagem carrega corretamente

## Impacto

- ✅ Correção de 1 linha
- ✅ Segue o mesmo padrão já usado no Pose Changer
- ✅ Não afeta nenhuma outra funcionalidade
- ✅ Resolve o bug da imagem quebrada na segunda utilização

