

# Plano: Melhorar Velocidade de Zoom no Comparador de Imagens

## Problema

O zoom está usando incremento **fixo** (`step: 0.2`), que funciona assim:
- Zoom 1x → 1.2x = +20% (parece rápido)
- Zoom 50x → 50.2x = +0.4% (parece travado!)

Por isso quanto mais zoom você dá, mais lento parece - precisa girar a roda muitas vezes pra avançar.

## Solução

Usar o modo **smooth** da biblioteca `react-zoom-pan-pinch` que faz zoom **proporcional/exponencial**:
- Zoom 1x → 1.1x = +10%
- Zoom 50x → 55x = +10%

Mesma velocidade perceptível em qualquer nível!

## Mudança Técnica

No arquivo `src/pages/UpscalerArcanoTool.tsx`, trocar:

```typescript
// ANTES:
<TransformWrapper
  initialScale={1}
  minScale={1}
  maxScale={100}
  wheel={{ step: 0.2 }}
  ...
>

// DEPOIS:
<TransformWrapper
  initialScale={1}
  minScale={1}
  maxScale={100}
  smooth={true}
  wheel={{ smoothStep: 0.15 }}
  ...
>
```

## Parâmetros

| Parâmetro | Valor | Efeito |
|-----------|-------|--------|
| `smooth` | `true` | Ativa zoom exponencial |
| `smoothStep` | `0.15` | 15% por scroll (ajustável se quiser mais/menos rápido) |

## Arquivos

- `src/pages/UpscalerArcanoTool.tsx` - Comparador antes/depois

## Resultado

- Zoom fluido e consistente em qualquer nível
- Menos giros de roda pra chegar onde quer
- Experiência muito mais suave

