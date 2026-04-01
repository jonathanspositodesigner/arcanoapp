/**
 * Serviço de integração com Stripe Checkout (client-side).
 *
 * Responsável por:
 * - Carregar o Stripe.js via chave pública (VITE_STRIPE_PUBLISHABLE_KEY)
 * - Criar uma Checkout Session via Edge Function e redirecionar
 *
 * IMPORTANTE: Este serviço só é chamado quando o provider do produto
 * está configurado como 'stripe' no arquivo checkoutProducts.ts.
 *
 * O fluxo é:
 * 1. Client chama a Edge Function 'create-stripe-checkout' com o slug do produto
 * 2. A Edge Function cria uma Checkout Session no Stripe e retorna o sessionId
 * 3. Client usa stripe.redirectToCheckout({ sessionId }) para redirecionar
 *
 * NOTA: A Edge Function 'create-stripe-checkout' será criada quando o primeiro
 * produto for migrado para Stripe. Enquanto nenhum produto usar Stripe,
 * este serviço nunca será chamado.
 */

import { loadStripe } from '@stripe/stripe-js';
import type { CheckoutProductConfig } from '@/config/checkoutProducts';
import { supabase } from '@/integrations/supabase/client';

let stripePromise: ReturnType<typeof loadStripe> | null = null;

/**
 * Carrega o Stripe.js uma única vez (singleton).
 * Lança erro se a chave pública não estiver configurada.
 */
function getStripe() {
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
 * Fluxo:
 * 1. Chama Edge Function para criar Checkout Session
 * 2. Recebe URL de redirect
 * 3. Redireciona o navegador
 *
 * @param product - Configuração do produto (deve ter stripePriceId preenchido)
 * @throws Error se stripePriceId estiver vazio, session falhar, etc.
 */
export async function redirectToStripeCheckout(product: CheckoutProductConfig): Promise<void> {
  if (!product.stripePriceId) {
    throw new Error(
      `Stripe Price ID não configurado para o produto "${product.slug}". ` +
      'Preencha o campo stripePriceId no arquivo checkoutProducts.ts.'
    );
  }

  // Garante que o Stripe.js está carregado (valida a chave pública)
  const stripe = await getStripe();
  if (!stripe) {
    throw new Error('Falha ao carregar o Stripe. Verifique sua conexão e tente novamente.');
  }

  const origin = window.location.origin;
  const successUrl = `${origin}/checkout-sucesso?product=${encodeURIComponent(product.slug)}`;
  const cancelUrl = `${origin}/checkout-cancelado?product=${encodeURIComponent(product.slug)}`;

  // Chama Edge Function para criar a Checkout Session
  const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
    body: {
      priceId: product.stripePriceId,
      mode: product.stripeMode,
      productSlug: product.slug,
      successUrl,
      cancelUrl,
    },
  });

  if (error) {
    throw new Error(error.message || 'Erro ao criar sessão de checkout no Stripe.');
  }

  if (!data?.url) {
    throw new Error('URL de checkout não recebida do servidor.');
  }

  // Redireciona para a página de checkout do Stripe
  // Usa window.location.href para compatibilidade com WebViews
  window.location.href = data.url;
}
