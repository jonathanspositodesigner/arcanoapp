

## Diagnóstico: Checkout Pagar.me — Causas de Lentidão e Falha

### Problemas encontrados no código atual:

**1. Timeout muito curto + poucos retries (causa principal de falha)**
- `timeoutMs: 8000` (8 segundos) com apenas `maxRetries: 1`
- Pagar.me frequentemente demora 5-10s em horários de pico
- Se a primeira tentativa timeout em 8s, há apenas 1 retry → falha total

**2. Crash silencioso no modo lightweight (linha 249)**
- `phone.fullDigits` é acessado sem null-check quando `phone` é null no modo lightweight
- Isso causa `TypeError: Cannot read properties of null` → erro 500 interno antes mesmo de chamar Pagar.me

**3. Dual-fire cria 2 ordens no banco (Upscaler PreCheckoutModal)**
- Dispara 2 chamadas simultâneas (full + lightweight), cada uma cria uma ordem `pending`
- A que perde a "race" fica como ordem fantasma no banco para sempre
- Dobra a carga no Pagar.me e no banco

**4. CORS headers incompletos**
- Faltam headers do Supabase client (`x-supabase-client-platform`, etc.)
- Pode causar falha silenciosa em alguns browsers/versões

**5. Sem tratamento de erros 4xx do Pagar.me**
- Erros 422 (validação) retornam mensagem genérica "Erro ao criar cobrança"
- Usuário não sabe o que corrigir (CPF inválido no gateway, endereço mal formatado, etc.)

### Plano de correção:

**A. Edge Function `create-pagarme-checkout`:**
- Aumentar `timeoutMs` para 15000 (15s) e `maxRetries` para 2
- Corrigir null-check do `phone` na linha 249
- Atualizar CORS headers com headers completos do Supabase
- Parsear erros 4xx do Pagar.me e retornar mensagem específica ao usuário
- Adicionar log de tempo total da chamada Pagar.me para diagnóstico

**B. Frontend `PreCheckoutModal.tsx` (Upscaler):**
- Eliminar dual-fire: usar apenas a chamada full com fallback lightweight sequencial (não paralelo)
- Isso evita ordens duplicadas e reduz carga

**C. Todos os callers frontend (Planos2, PlanosArtes, etc.):**
- Adicionar timeout visual de 20s com mensagem "Processando..." para o usuário não desistir
- Garantir que erros específicos do gateway (CPF rejeitado, etc.) sejam mostrados

### Arquivos afetados:
- `supabase/functions/create-pagarme-checkout/index.ts` (core fixes)
- `src/components/upscaler/PreCheckoutModal.tsx` (eliminar dual-fire)

