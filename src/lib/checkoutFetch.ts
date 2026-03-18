/**
 * Direct fetch to create-pagarme-checkout edge function.
 * Bypasses supabase.functions.invoke() SDK overhead for faster checkout.
 */

const CHECKOUT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-pagarme-checkout`;

/** Default timeout for checkout requests (ms) */
const CHECKOUT_TIMEOUT_MS = 25_000;

export async function invokeCheckout(body: Record<string, any>): Promise<{ data: any; error: any }> {
  let serialized: string;
  try {
    serialized = JSON.stringify(body);
  } catch (serErr) {
    console.error('[invokeCheckout] Falha ao serializar payload:', serErr);
    return { data: null, error: { error_code: 'INVALID_PAYLOAD', message: 'Payload inválido' } };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECKOUT_TIMEOUT_MS);

  try {
    const res = await fetch(CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: serialized,
      signal: controller.signal,
    });
    clearTimeout(timer);

    let data: any;
    try {
      data = await res.json();
    } catch {
      data = { error_code: 'PARSE_ERROR', message: 'Resposta inválida do servidor' };
    }

    if (!res.ok) {
      return { data, error: data };
    }
    return { data, error: null };
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      console.warn('[invokeCheckout] Timeout após', CHECKOUT_TIMEOUT_MS, 'ms');
      return { data: null, error: { error_code: 'TIMEOUT', message: 'Checkout demorou demais' } };
    }
    console.error('[invokeCheckout] Erro de rede:', err);
    return { data: null, error: { error_code: 'NETWORK_ERROR', message: 'Falha na conexão' } };
  }
}

/**
 * Pre-warm the edge function runtime (fire-and-forget).
 * Call inside useEffect with a 3s delay to avoid competing with initial page load.
 */
export function preWarmCheckout(): void {
  fetch(CHECKOUT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"ping":true}',
  }).catch(() => {});
}
