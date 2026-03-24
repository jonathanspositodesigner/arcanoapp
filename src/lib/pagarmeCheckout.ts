/**
 * Checkout direto Pagar.me v2 — redireciona para checkout hospedado.
 * Reutilizável em qualquer página de vendas.
 */
import { toast } from "sonner";
import { getSanitizedUtms } from "@/lib/utmUtils";
import { getMetaCookies } from "@/lib/metaCookies";

const CHECKOUT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-pagarme-checkout-v2`;
const TIMEOUT_MS = 20_000;

export async function redirectToCheckout(
  productSlug: string,
  customer?: { name: string; email: string; document: string }
): Promise<void> {
  if (!productSlug || typeof productSlug !== 'string' || !productSlug.trim()) {
    toast.error("Produto inválido. Tente novamente.");
    return;
  }

  const { fbp, fbc } = getMetaCookies();
  const utmData = getSanitizedUtms();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Fire Meta Pixel event (browser-side dedup)
    const eventId = `ic_v2_${Date.now()}`;
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'InitiateCheckout', {}, { eventID: eventId });
    }

    const res = await fetch(CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_slug: productSlug.trim(),
        utm_data: utmData,
        fbp,
        fbc,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    let data: any;
    try {
      data = await res.json();
    } catch {
      toast.error("Resposta inválida do servidor. Tente novamente.");
      return;
    }

    if (!res.ok || !data?.checkout_url) {
      const msg = data?.error || 'Erro ao criar checkout';
      console.error('[pagarmeCheckout] Erro:', msg);
      toast.error(msg);
      return;
    }

    // Redirect to hosted checkout
    window.location.href = data.checkout_url;
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      toast.error("O checkout demorou demais. Tente novamente em alguns segundos.");
    } else {
      console.error('[pagarmeCheckout] Network error:', err);
      toast.error("Falha na conexão. Verifique sua internet e tente novamente.");
    }
  }
}
