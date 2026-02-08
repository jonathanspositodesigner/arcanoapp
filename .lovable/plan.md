
## Diagnóstico (por que está falhando)
- O erro não está no modal nem no botão em si; está na função de backend **`claim-promo-credits`**.
- Nos logs do backend aparece:
  - `Error fetching pack: PGRST116 ... Results contain 3 rows ... requires 1 row`
- Isso acontece porque a função está fazendo:
  - `user_pack_purchases ... .maybeSingle()`
- Só que o seu usuário (`jonathan.lifecazy@gmail.com`) tem **3 registros ativos** para o pack `upscaller-arcano` (todos vitalício).  
  Resultado: o `.maybeSingle()` quebra e a função responde **500**, e o `supabase.functions.invoke` no frontend transforma isso em `FunctionsHttpError`.

## Objetivo
1. Fazer o resgate funcionar mesmo se existirem **várias compras ativas** do mesmo pack (caso comum em integrações/webhooks/imports).
2. Manter a regra: só resgata quem tem o pack `upscaller-arcano` ativo (e idealmente vitalício).
3. Evitar erros 500 em casos esperados e deixar o fluxo igual/mais robusto que o da página `/resgatar-creditos`.

## Mudanças planejadas

### 1) Corrigir a consulta do pack na função `claim-promo-credits`
Arquivo: `supabase/functions/claim-promo-credits/index.ts`

**Hoje (problema):**
- Busca o pack com `.maybeSingle()` → explode se vier mais de 1 linha.

**Ajuste:**
- Buscar como lista e escolher 1 registro (ex.: o mais recente), assim:
  - `.select(...)`
  - filtros: `user_id`, `pack_slug`, `is_active`
  - (recomendado) também filtrar `access_type = 'vitalicio'` para garantir elegibilidade correta
  - `.order('purchased_at', { ascending: false })`
  - `.limit(1)`
- Em vez de `pack` objeto direto, usar:
  - `const pack = packs?.[0]`
- Se houverem múltiplos registros, **não é erro**: loga a quantidade (para diagnóstico) e segue.

**Resultado esperado:**
- Para o Jonathan, a função deixa de retornar 500 e passa a seguir o fluxo normal (checar `promo_claims`, adicionar créditos via RPC, inserir em `promo_claims`, retornar 200 com `eligible: true`).

### 2) (Opcional, mas recomendado) Padronizar respostas “esperadas” para não virar non-2xx
Motivo: o `supabase.functions.invoke()` trata qualquer non-2xx como erro, o que piora a UX.

Ajuste sugerido:
- Para casos de negócio/validação (ex.: `not_found`, `no_pack`, `already_claimed`, `invalid promo`), retornar **status 200** com `eligible:false` e `reason` apropriado.
- Reservar 500 apenas para falha realmente inesperada (ex.: exceção sem tratamento).

Observação: isso já acontece em parte (not_found/no_pack/already_claimed já são 200), então aqui é só “fechar as brechas” para evitar 400/500 desnecessário em cenários esperados.

### 3) Pequena melhoria no frontend (robustez e mensagens)
Arquivo: `src/pages/FerramentasIAAplicativo.tsx`

- Manter o `invoke('claim-promo-credits'...)` (está correto).
- Adicionar um guard simples:
  - se `user?.email` estiver vazio por algum motivo (carregamento), mostrar toast e não chamar a função.
- Melhorar o handling quando `invoke` retorna erro:
  - hoje o toast é sempre genérico.
  - depois que o backend parar de responder 500 nesse caso, isso já resolve o principal.
  - se ainda existir algum erro “real”, continuamos com a mensagem genérica (ok).

## Como vou validar (checklist)
1. Logar como `jonathan.lifecazy@gmail.com`.
2. Ir em `/ferramentas-ia-aplicativo`.
3. Abrir o modal do Upscaler Arcano → clicar “Resgatar 1.500 créditos”.
4. Esperado:
   - não dar erro,
   - fechar modal,
   - navegar para `/upscaler-selection`,
   - `promo_claims` passar a ter o registro `UPSCALER_1500`,
   - o botão virar “Acessar Ferramenta” nas próximas vezes.
5. Testar também com:
   - usuário que já resgatou → deve ir direto “Acessar Ferramenta”
   - email sem compra → deve retornar “Compra não encontrada” (sem 500)

## Impacto / risco de quebrar algo
- Mudança é localizada e segura:
  - só altera a forma de ler `user_pack_purchases` dentro da função de resgate.
  - não mexe no sistema de créditos, nem em rotas principais.
- Benefício extra: mesmo se houver duplicidade de registros (como já existe), o resgate passa a funcionar normalmente.
