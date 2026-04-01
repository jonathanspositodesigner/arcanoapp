/**
 * Serviço de integração com Stripe Checkout (client-side).
 *
 * Responsável por:
 * - Carregar o Stripe.js via chave pública (VITE_STRIPE_PUBLISHABLE_KEY)
 * - Redirecionar para o Stripe Checkout Session
 *
 * IMPORTANTE: Este serviço só é chamado quando o provider do produto
 * está configurado como 'stripe' no arquivo checkoutProducts.ts.
 */

import { loadStripe, type Stripe } from '@stripe/stripe-js';
import type { CheckoutProductConfig } from '@/config/checkoutProducts';

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Carrega o Stripe.js uma única vez (singleton).
 * Lança erro se a chave pública não estiver configurada.
 */
function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      throw new Error(
        'VITE_STRIPE_PUBLISHABLE_KEY não está configurada. ' +
        'Adicione a chave pública do Stripe ao arquivo .env antes de ativar qualquer produto.'
      );
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

/**
 * Redireciona o usuário para o Stripe Checkout.
 *
 * @param product - Configuração do produto (deve ter stripePriceId preenchido)
 * @throws Error se stripePriceId estiver vazio, Stripe não carregar, ou checkout falhar
 */
export async function redirectToStripeCheckout(product: CheckoutProductConfig): Promise<void> {
  if (!product.stripePriceId) {
    throw new Error(
      `Stripe Price ID não configurado para o produto "${product.slug}". ` +
      'Preencha o campo stripePriceId no arquivo checkoutProducts.ts.'
    );
  }

  const stripe = await getStripe();
  if (!stripe) {
    throw new Error('Falha ao carregar o Stripe. Verifique sua conexão e tente novamente.');
  }

  const origin = window.location.origin;
  const successUrl = `${origin}/checkout-sucesso?product=${encodeURIComponent(product.slug)}`;
  const cancelUrl = `${origin}/checkout-cancelado?product=${encodeURIComponent(product.slug)}`;

  const { error } = await stripe.redirectToCheckout({
    lineItems: [{ price: product.stripePriceId, quantity: 1 }],
    mode: product.stripeMode,
    successUrl,
    cancelUrl,
  });

  if (error) {
    throw new Error(error.message || 'Erro ao redirecionar para o Stripe Checkout.');
  }
}
