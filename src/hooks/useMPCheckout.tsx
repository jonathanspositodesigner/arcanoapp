/**
 * useMPCheckout — Hook reutilizável para Checkout Mercado Pago.
 *
 * Uso em qualquer página:
 *   const { openCheckout, MPCheckoutModal } = useMPCheckout();
 *   <Button onClick={() => openCheckout("slug-do-produto")}>Comprar</Button>
 *   <MPCheckoutModal />
 *
 * O hook cuida de: modal, validação, coleta de dados (nome/email/CPF),
 * tracking Meta Pixel, redirect para MP, feedback de mp_status na URL.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { redirectToMPCheckout } from "@/lib/mpCheckout";
import { MPEmailModal, type MPCustomerData } from "@/components/checkout/MPEmailModal";

export function useMPCheckout() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Feedback automático de mp_status na URL ──
  useEffect(() => {
    const mpStatus = searchParams.get("mp_status");
    if (!mpStatus) return;

    if (mpStatus === "failure") {
      toast.error("Pagamento não concluído. Tente novamente.");
    } else if (mpStatus === "pending") {
      toast.info("Pagamento pendente. Aguarde a confirmação e você receberá um e-mail.");
    }

    searchParams.delete("mp_status");
    setSearchParams(searchParams, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Abre o modal com o slug do produto ──
  const openCheckout = useCallback((slug: string) => {
    if (!slug?.trim()) {
      toast.error("Produto inválido.");
      return;
    }
    setSelectedSlug(slug);
  }, []);

  // ── Fecha e reseta tudo ──
  const closeCheckout = useCallback(() => {
    if (loading) return; // não fechar durante redirect
    setSelectedSlug(null);
  }, [loading]);

  // ── Handler de confirmação (chamado pelo MPEmailModal) ──
  const handleConfirm = useCallback(async (data: MPCustomerData) => {
    if (!selectedSlug) return;
    setLoading(true);
    try {
      await redirectToMPCheckout(selectedSlug, data);
    } finally {
      setLoading(false);
      setSelectedSlug(null);
    }
  }, [selectedSlug]);

  // ── Componente do modal pronto para renderizar ──
  const MPCheckoutModal = useMemo(() => {
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
    /** Abre o modal de checkout para o produto com o slug informado */
    openCheckout,
    /** Fecha o modal manualmente (normalmente não precisa — o modal fecha sozinho) */
    closeCheckout,
    /** true enquanto aguarda redirect para o Mercado Pago */
    isLoading: loading,
    /** Slug do produto selecionado (ou null) */
    selectedSlug,
    /** Componente do modal — colocar uma vez no JSX: <MPCheckoutModal /> */
    MPCheckoutModal,
  };
}
