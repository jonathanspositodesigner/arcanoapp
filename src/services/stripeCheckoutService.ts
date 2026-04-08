/**
 * Serviço de integração com Stripe Checkout (client-side).
 * Captura atribuição Meta (fbp, fbc, fbclid, IP) antes do redirect.
 */

import type { CheckoutProductConfig } from '@/config/checkoutProducts';
import { supabase } from '@/integrations/supabase/client';
import { getMetaCookies } from '@/lib/metaCookies';

/**
 * Redireciona o usuário para o Stripe Checkout.
 */
export async function redirectToStripeCheckout(product: CheckoutProductConfig): Promise<void> {
  if (!product.stripePriceId) {
    throw new Error(
      `Stripe Price ID não configurado para o produto "${product.slug}". ` +
      'Preencha o campo stripePriceId no arquivo checkoutProducts.ts.'
    );
  }

  const origin = window.location.origin;
  const successUrl = `${origin}/checkout-sucesso?product=${encodeURIComponent(product.slug)}`;
  const cancelUrl = `${origin}/checkout-cancelado?product=${encodeURIComponent(product.slug)}`;

  // Captura cookies Meta para atribuição CAPI
  const { fbp, fbc } = getMetaCookies();
  const userAgent = (navigator.userAgent || '').substring(0, 490);

  // Send clean origin URL without UTM/fbclid bloat (those go as separate metadata)
  const eventSourceUrl = window.location.origin + window.location.pathname;

  // Extract fbclid and UTM params individually (truncated for Stripe 500-char limit)
  let fbclid = '';
  try {
    const urlParams = new URLSearchParams(window.location.search);
    fbclid = (urlParams.get('fbclid') || '').substring(0, 200);
  } catch { /* ignore */ }

  // Gera event_id para deduplicação Pixel ↔ CAPI
  const eventId = `ic_stripe_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // Dispara Pixel InitiateCheckout no browser (com eventID para dedup)
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', 'InitiateCheckout', {
      content_name: product.slug,
      content_category: 'Stripe Checkout',
      currency: 'USD',
    }, { eventID: eventId });
  }

  // Chama Edge Function para criar a Checkout Session
  const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
    body: {
      priceId: product.stripePriceId,
      mode: product.stripeMode,
      productSlug: product.slug,
      successUrl,
      cancelUrl,
      fbp: fbp || '',
      fbc: fbc || '',
      fbclid: fbclid || '',
      userAgent,
      eventSourceUrl,
      eventId,
    },
  });

  if (error) {
    throw new Error(error.message || 'Erro ao criar sessão de checkout no Stripe.');
  }

  if (!data?.url) {
    throw new Error('URL de checkout não recebida do servidor.');
  }

  // Redireciona para a página de checkout do Stripe
  window.location.href = data.url;
}
