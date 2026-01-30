
## Objetivo (correção direta, sem firula)
Consertar o zoom no **resultado do upscale** em `/upscaler-arcano-tool` para:

- **Não** pular de **100% direto para 600%**
- Fazer zoom **aos poucos (progressivo)** até o máximo
- Manter **máximo = 600% (6x)**, sem travar em “só 100 ou 600”
- Garantir que isso funcione igual tanto no **Standard** quanto no **PRO** (mesmo resultado/mesmo componente)

---

## Diagnóstico (por que está pulando 100% → 600%)
No `src/pages/UpscalerArcanoTool.tsx`, o `TransformWrapper` está assim:

```ts
smooth={true}
wheel={{ smoothStep: 0.08 }}
maxScale={6}
```

No `react-zoom-pan-pinch`, quando `smooth={true}`, ele calcula o passo do wheel assim:

- `zoomStep = smoothStep * Math.abs(event.deltaY)`
- e o zoom de wheel é **linear**: `newScale = scale + delta * zoomStep`

Como `event.deltaY` normalmente é ~100 por “notch” do mouse:
- `zoomStep = 0.08 * 100 = 8`
- então `scale` vai de `1` para `1 + 8 = 9`
- e aí **clampa** em `maxScale = 6`
Resultado: **pula de 100% para 600% em 1 scroll**.

Ou seja: não é “função limitando a 600” dando bug; é o `smoothStep` alto demais que força o clamp instantâneo.

---

## Correção proposta (simples e robusta)
### Estratégia
1. **Desligar o wheel zoom interno** do `react-zoom-pan-pinch` (porque o `smoothStep` é a origem do pulo).
2. Implementar um **wheel zoom próprio** com fator multiplicativo fixo (ex.: 15% por passo), clampando em `[1..6]`:
   - zoom in: `scale *= 1.15`
   - zoom out: `scale /= 1.15`
   - clamp final: `scale = min(max(scale, 1), 6)`
3. Aplicar o zoom mantendo o ponto do mouse estável (mesma matemática que a lib usa):
   - `newPosX = positionX - mouseX * (newScale - oldScale)`
   - `newPosY = positionY - mouseY * (newScale - oldScale)`
4. Ajustar também **double click** e botões `zoomIn/zoomOut` para um step pequeno (sem saltar).

Isso entrega exatamente o que você pediu: **zoom gradual/“exponencial”** (multiplicativo) até 600%.

---

## Mudanças no código (arquivo único)
### Arquivo: `src/pages/UpscalerArcanoTool.tsx`

#### 1) Adicionar refs/constantes para controlar zoom
- Criar um `transformRef` para guardar o `ref` do `TransformWrapper` via `onInit`.
- Criar constantes:
  - `MIN_ZOOM = 1`
  - `MAX_ZOOM = 6`
  - `WHEEL_FACTOR = 1.15` (15% por passo)

#### 2) Atualizar `onInit` e `onTransformed`
- Em `onInit`, salvar `ref` no `transformRef.current = ref`
- Manter o que já existe (setZoomLevel e sync do `beforeTransformRef`)

#### 3) Desativar wheel interno do TransformWrapper
Trocar:
```tsx
wheel={{ smoothStep: 0.08 }}
```
por:
```tsx
wheel={{ disabled: true }}
```

(Assim a lib não intercepta o wheel e não cria o salto para o maxScale.)

#### 4) Implementar `onWheel` no container do resultado
Adicionar `onWheel` no container que envolve a área do preview (ex.: o `div ref={sliderRef} ...` ou o wrapper do preview) para:

- `preventDefault()` e `stopPropagation()`
- Ler estado atual:
  - `scale`, `positionX`, `positionY` de `transformRef.current.state`
- Calcular mouseX/mouseY em coordenadas do conteúdo:
  - usando `wrapperRect` do `transformRef.current.instance.wrapperComponent`
- Calcular novo scale multiplicativo e clamp:
  - `scale * 1.15` ou `scale / 1.15`
  - clamp em `[1..6]`
- Calcular novas posições com a fórmula
- Aplicar com:
  - `transformRef.current.instance.setTransformState(newScale, newPosX, newPosY)`
    - (isso atualiza UI, dispara `onTransformed`, e mantém o before/after sincronizado)

#### 5) Ajustar double click e botões para não darem “saltos”
Hoje está:
```tsx
doubleClick={{ mode: 'zoomIn', step: 1.5 }}
onClick={() => zoomIn(0.3)}
onClick={() => zoomOut(0.3)}
```

- `doubleClick step 1.5` é agressivo (pode ir muito alto em poucos cliques).
- Vamos reduzir para um step pequeno e consistente com o wheel.
- Para manter coerência com o fator 1.15:
  - `STEP = Math.log(1.15)` ≈ `0.14` (porque o zoom do botão usa `scale * exp(step)` quando `smooth=true`)

Então:
- `zoomIn(0.14)` / `zoomOut(0.14)`
- `doubleClick step: 0.14`

---

## Critérios de pronto (checklist)
1. No resultado do upscale, scroll do mouse:
   - 100% → 115% → 132%… (progressivo)
   - nunca mais 100% → 600% em 1 scroll
2. Zoom máximo continua **600%** (clamp).
3. Botões +/− também sobem/descem progressivamente (sem pulo).
4. Double click não dá salto absurdo.
5. Testar com:
   - Standard e PRO (toggle) com resultado renderizado
   - Mouse wheel
   - Trackpad/pinch (se possível)

---

## Risco / Observação
- A única “mudança de comportamento” é que a gente para de usar o wheel interno da lib (porque ele é o causador do pulo com `smoothStep` alto) e passa a usar wheel controlado com fator fixo.
- Isso é a forma mais direta de garantir “zoom progressivo até 600” sem voltar o bug.

---