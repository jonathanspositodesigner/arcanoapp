/**
 * useCheckout — Hook de checkout multi-provider.
 *
 * Decide qual provider executar com base na configuração do produto:
 * - 'pagarme' → abre o fluxo Pagar.me existente (usePagarmeCheckout)
 * - 'stripe'  → redireciona para Stripe Checkout
 * - 'disabled' → não faz nada
 *
 * Uso:
 *   const { executeCheckout, isLoading } = useCheckout();
 *   <Button onClick={() => executeCheckout("slug-do-produto")}>Comprar</Button>
 */

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { getProductBySlug } from '@/config/checkoutProducts';
import { redirectToStripeCheckout } from '@/services/stripeCheckoutService';
import { usePagarmeCheckout } from '@/hooks/usePagarmeCheckout';

export function useCheckout(hookOptions?: { source_page?: string }) {
  const [stripeLoading, setStripeLoading] = useState(false);

  // Reutiliza o hook Pagar.me existente para o provider 'pagarme'
  const {
    openCheckout: openPagarme,
    isLoading: pagarmeLoading,
    PagarmeCheckoutModal,
  } = usePagarmeCheckout(hookOptions);

  const executeCheckout = useCallback(
    async (slug: string) => {
      const product = getProductBySlug(slug);

      if (!product) {
        toast.error('Produto não encontrado.');
        console.error(`[useCheckout] Produto com slug "${slug}" não encontrado em checkoutProducts.ts`);
        return;
      }

      if (!product.isActive) {
        toast.error('Este produto está temporariamente indisponível.');
        return;
      }

      switch (product.provider) {
        case 'pagarme':
          // Delega para o fluxo Pagar.me existente
          openPagarme(slug);
          break;

        case 'stripe':
          setStripeLoading(true);
          try {
            await redirectToStripeCheckout(product);
          } catch (err: any) {
            console.error('[useCheckout] Stripe error:', err);
            toast.error(err.message || 'Erro ao iniciar pagamento via Stripe.');
          } finally {
            setStripeLoading(false);
          }
          break;

        case 'disabled':
          toast.info('Este produto está temporariamente desativado.');
          break;

        default:
          console.error(`[useCheckout] Provider desconhecido: ${product.provider}`);
          toast.error('Erro interno no checkout.');
      }
    },
    [openPagarme]
  );

  return {
    executeCheckout,
    isLoading: stripeLoading || pagarmeLoading,
    /** Renderize este componente para o modal do Pagar.me funcionar */
    PagarmeCheckoutModal,
  };
}
