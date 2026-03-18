

# Plano: Corrigir Tela Branca em Todo o Site

## Problema
Todas as páginas ficam travadas em branco por 10-20+ segundos. A causa raiz é o **AuthContext** que bloqueia toda a renderização do app até completar 6 queries ao banco de dados (com retry + exponential backoff). Se qualquer query falhar, o retry com backoff pode levar até **8 segundos** (safety timeout) antes de liberar o render.

A página `/ferramenta-ia-artes/upscaller-arcano/v2` (ToolVersionLessons) depende de `premiumLoading` do AuthContext — enquanto `isLoading=true`, mostra spinner, mas o problema é que o AuthContext demora demais para sair de loading.

## Causa Raiz Detalhada

1. **AuthContext serializa 2 batches com retry** (linhas 128-158): Batch 1 (3 queries) → espera → Batch 2 (3 queries). Cada batch tem 3 retries com exponential backoff (1s, 2s, 4s + jitter). No pior caso: ~14 segundos bloqueando.

2. **Safety timeout de 8s** (linha 313-316): Mesmo o fallback é lento demais.

3. **CreditsProvider** também faz queries ao banco (expire_landing_trial_credits + get_upscaler_credits_breakdown) — mais bloqueio encadeado.

4. **`NotFound.tsx`** — não vou alterar, conforme solicitado.

## Correções Planejadas

### 1. AuthContext — Liberar render mais cedo (~80% do impacto)
**Arquivo:** `src/contexts/AuthContext.tsx`

- Separar "sessão conhecida" de "dados enriquecidos"
- Assim que `getSession()` retornar, setar `isLoading=false` imediatamente
- Carregar status premium/packs/musicos/planos2 em **background** (não bloqueia render)
- Adicionar estado `isEnriching` para componentes que precisam saber se dados estão carregando
- Reduzir safety timeout de 8s para 4s
- Trocar retry serial (3 tentativas) para apenas 1 retry por batch
- Executar ambos os batches em **paralelo** em vez de serializado

```text
ANTES:
getSession() → checkAllStatuses() [Batch1 + retry] → [Batch2 + retry] → setIsLoading(false)
                    ↑ pode levar 8-14s

DEPOIS:
getSession() → setIsLoading(false) ← render liberado imediatamente
             → checkAllStatuses() em background (atualiza estados quando pronto)
```

### 2. Páginas protegidas — Trocar `return null` por redirect visual
**Arquivos:** `UpscalerArcanoV1.tsx`, `UpscalerArcanoV2.tsx`, `ForjaSelos3D.tsx`, `MudarRoupa.tsx`, `MudarPose.tsx`

- Trocar `return null` por mostrar o spinner de loading enquanto o redirect acontece
- Isso elimina qualquer branco residual durante navegação

### 3. Boot shell no HTML — Percepção visual imediata
**Arquivo:** `index.html`

- Adicionar um mini-loader dentro de `<div id="root">` com fundo escuro (#0D0221) e spinner
- Será substituído automaticamente quando React hidratar
- Elimina branco puro antes do JS carregar

### 4. CreditsProvider — Não bloquear em query inicial
**Arquivo:** `src/hooks/useUpscalerCredits.tsx`

- Setar `isLoading=false` mais cedo, sem esperar `expire_landing_trial_credits`
- Mover `expire_landing_trial_credits` para background

## Arquivos que NÃO serão alterados
- `src/pages/NotFound.tsx` — conforme solicitado
- `src/integrations/supabase/client.ts` — auto-gerado
- `src/integrations/supabase/types.ts` — auto-gerado

## Resultado Esperado
- Tempo até primeiro conteúdo visível: de 8-20s → <1s
- Dados de premium/packs carregam em background e atualizam a UI quando prontos
- Nenhuma página fica em branco — sempre mostra loader ou conteúdo

