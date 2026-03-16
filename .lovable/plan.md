

## Problem Analysis

The `planos-upscaler-arcano` page uses **only** `PreCheckoutModal` for all users — this component already has the credit card auto-submit logic built in and working. When users click "Cartão", it immediately fires `handleCreditCardAutoSubmit` which sends a minimal payload (`product_slug`, `billing_type`, `utm_data`, `fbp`, `fbc`) and redirects.

The `arcanocloner-teste` page has **two different flows**:
1. **Unauthenticated or incomplete profile** → `PreCheckoutModal` (same as upscaler — works fine)
2. **Authenticated with complete profile** → `PaymentMethodModal` → `handlePaymentMethodSelected` (a separate, redundant implementation)

This second flow is the problem source — it's a separate code path that has been repeatedly breaking. The upscaler page avoids this entirely by routing ALL users through `PreCheckoutModal`.

## Plan

**Single change in `src/components/arcano-cloner/LandingPricingSection.tsx`:**

1. **Remove `PaymentMethodModal` entirely** — delete the import, the state (`showPaymentMethodModal`), the `handlePaymentMethodSelected` function, and the modal JSX.

2. **Simplify `handlePurchase`** — for ALL cases (logged in or not, profile complete or not), just set `preCheckoutSlug` and open `PreCheckoutModal`. This is exactly what `planos-upscaler-arcano` does. Remove the profile-checking logic that routes to `PaymentMethodModal`.

3. **Remove `pendingProfile` state** — no longer needed since we're not using `PaymentMethodModal`.

This makes the arcanocloner page use the exact same single flow as the upscaler page: `PreCheckoutModal` handles everything — payment method selection, data collection for PIX, and credit card auto-submit.

### Files to modify
- `src/components/arcano-cloner/LandingPricingSection.tsx` — remove ~60 lines of redundant code, simplify `handlePurchase`

### Files NOT touched
- `src/components/upscaler/PreCheckoutModal.tsx` — zero changes
- `src/components/checkout/PaymentMethodModal.tsx` — zero changes
- `supabase/functions/create-pagarme-checkout/index.ts` — zero changes
- Any file related to `planos-upscaler-arcano` — zero changes

