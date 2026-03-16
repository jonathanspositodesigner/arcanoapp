/**
 * Direct fetch to create-pagarme-checkout edge function.
 * Bypasses supabase.functions.invoke() SDK overhead for faster checkout.
 */

const CHECKOUT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-pagarme-checkout`;

export async function invokeCheckout(body: Record<string, any>): Promise<{ data: any; error: any }> {
  const res = await fetch(CHECKOUT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    return { data, error: data };
  }
  return { data, error: null };
}

/**
 * Pre-warm the edge function runtime (fire-and-forget).
 * Call inside useEffect with a 3s delay to avoid competing with initial page load.
 */
export function preWarmCheckout(): void {
  fetch(CHECKOUT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ping: true }),
  }).catch(() => {});
}
