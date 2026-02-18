
## Problema Identificado

O carrossel do Bônus 01 (+300 Referências Profissionais) tem dois bugs na versão mobile:

**Bug 1 - Reset no meio do caminho**: A animação usa `translateX(-50%)` para criar o loop infinito, mas os 8 cards estão divididos em dois `<div>` filhos separados dentro do track. Isso faz o ponto de "50%" não coincidir com o final do primeiro set, causando o reset visual antes de terminar.

**Bug 2 - Velocidade ainda lenta**: 15s ainda é devagar para mobile. Vamos reduzir para 8s no mobile.

---

## Solução

### 1. Corrigir a estrutura HTML do carrossel

Em vez de dois grupos separados, criar uma **lista flat** com os 16 cards (8 originais + 8 duplicados) todos no mesmo nível:

```
ANTES (bugado):
track > [grupo1: card1..card8] + [grupo2: card1..card8]
                                  ^ translateX(-50%) aponta aqui errado

DEPOIS (correto):
track > card1..card8..card1..card8  (todos no mesmo nível)
                    ^ translateX(-50%) aponta exatamente na metade = loop perfeito
```

### 2. Velocidade mobile

- **Mobile**: `8s` (quase o dobro mais rápido que os 15s atuais)  
- **Desktop**: `30s` (mantém igual)

---

## Alterações Técnicas

**Arquivo**: `src/pages/PlanosArcanoCloner.tsx`

- Substituir o `.map` de 2 sets aninhados por um único array de 16 itens flat (8 + 8 duplicados)
- Mudar `animationDuration` de `'15s'` para `'8s'` no mobile
- Manter `translateX(-50%)` no keyframe (funciona corretamente com lista flat)
