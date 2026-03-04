

# Plano: Otimizacao de Queries para Reduzir Conexoes ao Banco

## Problema Identificado

O app esta abrindo conexoes simultaneas demais ao banco, causando quedas constantes. Mapeei todas as fontes de queries:

### Conexoes na inicializacao (por usuario logado)

```text
FONTE                          QUERIES    TIPO
─────────────────────────────────────────────────
AuthContext (getSession)         1        auth
AuthContext (checkAllStatuses)   4-6      RPC/select
CreditsProvider (root)           2-3      RPC (expire + breakdown)
CreditsProvider (realtime)       1        websocket channel
─────────────────────────────────────────────────
TOTAL INICIAL:                  8-11     conexoes
```

### Problema critico: queries DUPLICADAS

14 arquivos importam `useUpscalerCredits` diretamente, MAS ja existe um `CreditsProvider` global na raiz do app que faz exatamente a mesma coisa. Cada pagina que usa `useUpscalerCredits(user?.id)` cria:
- +2 RPCs duplicados (expire_landing_trial + get_upscaler_credits_breakdown)
- +1 canal realtime duplicado

Paginas com duplicacao: BibliotecaPrompts, VesteAITool, FlyerMakerTool, CreditHistory, ToolsHeader, GeradorPersonagemTool, FerramentasIA, e mais ~7 outras.

`usePlanos2Access` tambem e chamado em 4 paginas independentemente, cada uma abrindo sua propria query.

## Plano de Otimizacao

### 1. Eliminar useUpscalerCredits duplicados (MAIOR IMPACTO)

Substituir todas as importacoes diretas de `useUpscalerCredits` por `useCredits()` do CreditsContext que ja existe na raiz. Isso elimina ~14 instancias duplicadas.

**Antes:** Cada pagina abre 2-3 conexoes proprias
**Depois:** Todas usam a mesma instancia global (0 conexoes adicionais)

**Reducao: ~28-42 conexoes eliminadas** (por sessao de navegacao)

### 2. Integrar usePlanos2Access ao AuthContext

Mover a query de `planos2_subscriptions` para dentro do `checkAllStatuses` do AuthContext, adicionando ao batch 2 existente. Expor os dados via contexto.

**Reducao: 4 queries independentes → 0** (absorvidas no batch existente)

### 3. Otimizar checkAllStatuses do AuthContext

A query condicional de `premium_users` (linhas 135-200) faz 1-2 queries ADICIONAIS apos os batches. Mover para o batch 1 junto com `is_premium`.

**Antes:**
- Batch 1: is_premium + get_user_packs (2 conexoes)
- Batch 2: get_user_expired_packs + premium_musicos_users (2 conexoes)
- Condicional: premium_users select (1-2 conexoes extras)

**Depois:**
- Batch 1: is_premium + get_user_packs + premium_users (3 conexoes)
- Batch 2: get_user_expired_packs + premium_musicos_users + planos2_subscriptions (3 conexoes)
- Sem queries condicionais extras

### 4. Remover RPC redundante no useUpscalerCredits

O `expire_landing_trial_credits` e chamado TODA VEZ que o saldo e consultado. Isso so e relevante para trial users. Adicionar verificacao para pular quando desnecessario.

## Impacto para os Usuarios

| Metrica | Antes | Depois |
|---------|-------|--------|
| Conexoes simultaneas no login | 8-11 | 6 |
| Conexoes ao navegar para uma pagina | +3-5 por pagina | +0-1 por pagina |
| Canais realtime duplicados | Ate 3-4 | 1 (global) |
| Risco de 544 timeout | Alto | Baixo |
| Velocidade de carregamento | Lento (queries paralelas) | Mais rapido (dados ja em cache) |

**Resultado esperado:** Reducao de ~60-70% nas conexoes simultaneas ao banco. O app vai parar de derrubar o servidor com o plano atual.

**Risco zero de quebrar funcionalidade:** Todas as mudancas sao de ONDE os dados sao buscados (contexto global vs hook local), nao de COMO sao usados. Os componentes recebem os mesmos dados com as mesmas interfaces.

## Arquivos que serao modificados

1. `src/contexts/AuthContext.tsx` - Adicionar planos2 ao batch + otimizar queries condicionais
2. `src/contexts/CreditsContext.tsx` - Sem mudancas (ja funciona corretamente)
3. `src/hooks/useUpscalerCredits.tsx` - Otimizar expire check
4. ~14 paginas/componentes - Trocar `useUpscalerCredits` por `useCredits()`
5. ~4 paginas - Trocar `usePlanos2Access` por dados do AuthContext

