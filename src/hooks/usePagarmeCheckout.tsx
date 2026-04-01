/**
 * usePagarmeCheckout — Hook reutilizável para Checkout Pagar.me.
 *
 * API espelho do useMPCheckout para facilitar migração:
 *   const { openCheckout, PagarmeCheckoutModal } = usePagarmeCheckout();
 *   <Button onClick={() => openCheckout("slug-do-produto")}>Comprar</Button>
 *   <PagarmeCheckoutModal />
 */

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { redirectToCheckout } from "@/lib/pagarmeCheckout";
import { MPEmailModal, type MPCustomerData } from "@/components/checkout/MPEmailModal";

export function usePagarmeCheckout(hookOptions?: { source_page?: string }) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openCheckout = useCallback((slug: string) => {
    if (!slug?.trim()) {
      toast.error("Produto inválido.");
      return;
    }
    setSelectedSlug(slug);
  }, []);

  const closeCheckout = useCallback(() => {
    if (loading) return;
    setSelectedSlug(null);
  }, [loading]);

  const handleConfirm = useCallback(async (data: MPCustomerData) => {
    if (!selectedSlug) return;
    setLoading(true);
    try {
      await redirectToCheckout(selectedSlug, {
        name: data.name,
        email: data.email,
        document: data.document,
      });
    } finally {
      setLoading(false);
      setSelectedSlug(null);
    }
  }, [selectedSlug]);

  const PagarmeCheckoutModal = useMemo(() => {
    return () => (
      <MPEmailModal
        open={!!selectedSlug}
        onClose={closeCheckout}
        onConfirm={handleConfirm}
        loading={loading}
      />
    );
  }, [selectedSlug, closeCheckout, handleConfirm, loading]);

  return {
    openCheckout,
    closeCheckout,
    isLoading: loading,
    selectedSlug,
    PagarmeCheckoutModal,
  };
}
