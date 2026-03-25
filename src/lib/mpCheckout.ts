/**
 * Mercado Pago checkout redirect — usado exclusivamente na página 69.
 * Chama a edge function create-mp-checkout e redireciona para o checkout hospedado do MP.
 */
import { toast } from "sonner";
import { getSanitizedUtms } from "@/lib/utmUtils";
import { getMetaCookies } from "@/lib/metaCookies";

const CHECKOUT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-mp-checkout`;
const TIMEOUT_MS = 20_000;

export async function redirectToMPCheckout(
  productSlug: string,
  customerData: { name: string; email: string; document: string },
  options?: { source_page?: string }
): Promise<void> {
  if (!productSlug?.trim()) {
    toast.error("Produto inválido. Tente novamente.");
    return;
  }
  const { name, email, document } = customerData;
  if (!name?.trim() || name.trim().length < 3) {
    toast.error("Nome inválido.");
    return;
  }
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    toast.error("E-mail inválido.");
    return;
  }
  if (!document?.trim() || document.replace(/\D/g, "").length !== 11) {
    toast.error("CPF inválido.");
    return;
  }

  const { fbp, fbc } = getMetaCookies();
  const utmData = getSanitizedUtms();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Gerar eventId único e usar no Pixel E no CAPI (sincronizados)
    const eventId = `ic_mp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "InitiateCheckout", {}, { eventID: eventId });
    }

    const res = await fetch(CHECKOUT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_slug: productSlug.trim(),
        user_email: email.trim().toLowerCase(),
        user_name: name.trim(),
        user_document: document.replace(/\D/g, ""),
        utm_data: utmData,
        fbp,
        fbc,
        user_agent: navigator.userAgent,
        event_id: eventId,
        ...(options?.source_page ? { source_page: options.source_page } : {}),
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
      const msg = data?.error || "Erro ao criar checkout";
      console.error("[mpCheckout] Erro:", msg);
      toast.error(msg);
      return;
    }

    window.location.href = data.checkout_url;
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === "AbortError") {
      toast.error("O checkout demorou demais. Tente novamente.");
    } else {
      console.error("[mpCheckout] Network error:", err);
      toast.error("Falha na conexão. Verifique sua internet e tente novamente.");
    }
  }
}
