/**
 * CheckoutButton — Botão universal de checkout.
 *
 * Recebe o slug do produto e usa o hook useCheckout para
 * decidir automaticamente qual provider executar.
 *
 * Uso simples:
 *   <CheckoutButton productSlug="upscaler-arcano-starter" />
 *
 * Customizado:
 *   <CheckoutButton productSlug="vol1-vitalicio" variant="outline" size="lg">
 *     Comprar agora
 *   </CheckoutButton>
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { useCheckout } from '@/hooks/useCheckout';
import { getProductBySlug, formatPrice } from '@/config/checkoutProducts';

interface CheckoutButtonProps {
  /** Slug do produto (obrigatório) */
  productSlug: string;
  /** Variante visual do botão */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  /** Tamanho do botão */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Classes CSS adicionais */
  className?: string;
  /** Conteúdo customizado do botão (senão mostra preço formatado) */
  children?: React.ReactNode;
  /** Página de origem para tracking */
  sourcePage?: string;
}

export function CheckoutButton({
  productSlug,
  variant = 'default',
  size = 'default',
  className,
  children,
  sourcePage,
}: CheckoutButtonProps) {
  const { executeCheckout, isLoading, PagarmeCheckoutModal } = useCheckout({
    source_page: sourcePage,
  });

  const product = getProductBySlug(productSlug);
  const isDisabled = !product || !product.isActive || isLoading;

  const buttonContent = children ?? (
    product ? `Comprar por ${formatPrice(product.priceInCents)}` : 'Produto indisponível'
  );

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled={isDisabled}
        onClick={() => executeCheckout(productSlug)}
      >
        {isLoading ? 'Processando...' : buttonContent}
      </Button>
      <PagarmeCheckoutModal />
    </>
  );
}
