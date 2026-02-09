

## Atualizar pagina /planos-upscaler-arcano-69-es

### 1. Trocar link do checkout (linha 159)

Substituir o link atual do Hotmart pelo novo:
- **Antes:** `https://pay.hotmart.com/R103906553W?off=k7k3jv6j`
- **Depois:** `https://pay.hotmart.com/R103906553W?off=9o6c47no`

### 2. Atualizar preco para $7.90 (linhas 168-170)

- `price`: de `990` para `790` (centavos)
- `originalPrice`: de `1297` para `990` ($9.90 riscado)
- `installmentPrice`: calculado automaticamente (790/3 = ~$2.64)
- Atualizar o valor no evento do Meta Pixel (linha 154): de `9.90` para `7.90`

### 3. Atualizar badge de desconto (linha 466)

Recalcular: $7.90 de $9.90 = ~20% OFF
- **Antes:** `24% OFF`
- **Depois:** `20% OFF`

### 4. Conversao de moeda local em tempo real

Criar um hook `useCurrencyConversion` que:
- Usa a API gratuita do ExchangeRate (exchangerate-api.com ou similar) para buscar o cambio USD para a moeda local do visitante
- Detecta o pais do visitante via `navigator.language` ou API de geolocalizacao gratuita (ex: `ipapi.co/json/`)
- Mapeia pais para moeda (ex: Argentina = ARS, Colombia = COP, Mexico = MXN, Chile = CLP, Peru = PEN, Brasil = BRL)
- Faz cache do resultado no sessionStorage por 1 hora

Na pagina, abaixo do preco em USD, exibir uma linha com o preco convertido:
> Aprox. ARS 7,120.50 en tu moneda

Se a API falhar, simplesmente nao mostra a linha de conversao (graceful fallback).

### Detalhes tecnicos

**Arquivo modificado:** `src/pages/PlanosUpscalerArcano69ES.tsx`
**Arquivo novo:** `src/hooks/useCurrencyConversion.ts`

O hook `useCurrencyConversion`:
- Primeiro busca o pais via `fetch('https://ipapi.co/json/')` (gratuito, sem chave)
- Depois busca o cambio via `fetch('https://open.er-api.com/v6/latest/USD')` (gratuito, sem chave)
- Retorna `{ localCurrency, localPrice, loading }` ou `null` se falhar
- Cache em sessionStorage para evitar chamadas repetidas

Na UI, adiciona abaixo do preco principal:
```
{localPrice && (
  <p className="text-white/50 text-sm mt-1">
    Aprox. {localCurrency} {formattedLocalPrice} en tu moneda
  </p>
)}
```

