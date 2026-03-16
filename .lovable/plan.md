

## Plano Unificado: Checkout Pagar.me Ultra-Rápido

### O que já está aplicado (plano anterior):
- ✅ Timeout 15s + 2 retries com backoff
- ✅ Null-check do `phone?.fullDigits` (linha 249)
- ✅ CORS headers completos
- ✅ Parsing de erros 4xx do Pagar.me
- ✅ Dual-fire eliminado no PreCheckoutModal (agora é sequencial: full → lightweight fallback)

### O que falta aplicar (novas otimizações):

**A. Edge Function — Ping handler + Rate limit fire-and-forget**

No `create-pagarme-checkout/index.ts`:

1. **Ping handler** (logo após OPTIONS check): Se o body contém `{ ping: true }`, retornar `{ pong: true }` imediatamente sem executar nenhuma lógica. Isso aquece o runtime Deno.

2. **Rate limit fire-and-forget**: Atualmente o `check_rate_limit` está no `Promise.all` bloqueante (linhas 186-199). Mover para fire-and-forget — disparar o RPC sem `await`, e só logar se rate-limited (sem bloquear o fluxo). A busca do produto continua com `await` normal.

**B. Frontend — Pre-warm com delay de 3s**

Adicionar `useEffect` em 4 páginas de planos para disparar um `fetch()` fire-and-forget 3 segundos após montar, usando `{ ping: true }`:

- `src/pages/PlanosUpscalerArcano.tsx`
- `src/pages/Planos2.tsx`
- `src/pages/PlanosArtes.tsx`
- `src/pages/PlanosArtesMembro.tsx`

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-pagarme-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ping: true })
    }).catch(() => {});
  }, 3000);
  return () => clearTimeout(timer);
}, []);
```

**C. Frontend — `fetch()` direto em vez de `supabase.functions.invoke()`**

Substituir `supabase.functions.invoke('create-pagarme-checkout', { body })` por `fetch()` nativo nos seguintes arquivos, eliminando overhead do SDK e headers extras:

- `src/components/upscaler/PreCheckoutModal.tsx` (2 chamadas: full + lightweight)
- `src/pages/Planos2.tsx`
- `src/pages/PlanosArtes.tsx`
- `src/pages/PlanosArtesMembro.tsx`
- `src/components/combo-artes/GuaranteeSectionCombo.tsx`
- `src/components/combo-artes/PricingCardsSection.tsx`
- `src/components/combo-artes/MotionsGallerySection.tsx`
- `src/components/prevenda-pack4/PricingCardsSectionPack4.tsx`
- `src/components/prevenda-pack4/GuaranteeSectionPack4.tsx`
- `src/components/prevenda-pack4/MotionsGallerySectionPack4.tsx`

Padrão de substituição:
```typescript
// ANTES:
const response = await supabase.functions.invoke('create-pagarme-checkout', { body });
const data = response.data;
const error = response.error;

// DEPOIS:
const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-pagarme-checkout`;
const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const data = await res.json();
const error = !res.ok ? data : null;
```

### Arquivos afetados (14 total):
1. `supabase/functions/create-pagarme-checkout/index.ts` — ping handler + rate limit fire-and-forget
2. `src/pages/PlanosUpscalerArcano.tsx` — pre-warm
3. `src/pages/Planos2.tsx` — pre-warm + fetch direto
4. `src/pages/PlanosArtes.tsx` — pre-warm + fetch direto
5. `src/pages/PlanosArtesMembro.tsx` — pre-warm + fetch direto
6. `src/components/upscaler/PreCheckoutModal.tsx` — fetch direto (2x)
7. `src/components/combo-artes/GuaranteeSectionCombo.tsx` — fetch direto
8. `src/components/combo-artes/PricingCardsSection.tsx` — fetch direto
9. `src/components/combo-artes/MotionsGallerySection.tsx` — fetch direto
10. `src/components/prevenda-pack4/PricingCardsSectionPack4.tsx` — fetch direto
11. `src/components/prevenda-pack4/GuaranteeSectionPack4.tsx` — fetch direto
12. `src/components/prevenda-pack4/MotionsGallerySectionPack4.tsx` — fetch direto

### Resultado esperado:
- Cold start eliminado (pre-warm 3s após carregar)
- Rate limit não bloqueia mais o fluxo (-300-800ms)
- SDK overhead eliminado (-200ms)
- **Tempo total: ~1.5-2.5s** (vs 5-10s atual)

