

## Ajustes no Slider de Criatividade e Verificacao da Integracao

### 1. Atualizar o componente CreativitySlider para aceitar `max` e esconder a recomendacao

O componente `CreativitySlider` e compartilhado entre o Arcano Cloner (0-100) e o Flyer Maker (0-5). Para suportar ambos:

- Adicionar prop opcional `max` (default: 100) na interface `CreativitySliderProps`
- Adicionar prop opcional `showRecommendation` (default: true)
- Usar `max` no `<Slider max={max}>` ao inves do valor fixo 100

**Arquivo:** `src/components/arcano-cloner/CreativitySlider.tsx`

### 2. Passar `max={5}` no FlyerMakerTool

No `FlyerMakerTool.tsx`, linha 528, atualizar o uso do slider:

```
<CreativitySlider value={creativity} onChange={setCreativity} disabled={isProcessing} max={5} showRecommendation={false} />
```

Isso garante que o slider do Flyer Maker va de 0 a 5 e nao mostre a recomendacao. O Arcano Cloner continua funcionando de 0 a 100 sem mudancas.

### 3. Verificacao da integracao com a API

Ja verifiquei a Edge Function (`runninghub-flyer-maker/index.ts`) e os inputs estao corretos:

| Campo | Node | fieldName | Status |
|---|---|---|---|
| Fotos artistas 1-5 | 11-15 | image | OK |
| Flyer de referencia | 1 | image | OK |
| Logo do local | 28 | image | OK |
| Data hora e local | 6 | text | OK |
| Nomes dos artistas | 10 | text | OK |
| Titulo | 7 | text | OK |
| Promocao de rodape | 9 | text | OK |
| Endereco | 103 | text | OK |
| Tamanho (aspectRatio) | 68 | aspectRatio | OK |
| Criatividade (0-5) | 111 | value | OK |

O WebApp ID `2025656642724962305` esta correto. A logica de duplicar a primeira foto do artista para preencher os 5 slots (nodes 11-15) tambem esta implementada. O clamp `Math.min(5, Math.max(0, ...))` na Edge Function garante que o valor de criatividade sempre fica entre 0 e 5.

### Resumo das mudancas

Apenas 2 arquivos precisam de alteracao:
1. `CreativitySlider.tsx` - adicionar props `max` e `showRecommendation`
2. `FlyerMakerTool.tsx` - passar `max={5}` e `showRecommendation={false}`

