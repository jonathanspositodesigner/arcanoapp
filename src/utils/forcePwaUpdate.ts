export type UpdateStatus = 'checking' | 'updating' | 'reloading' | 'no-update' | 'error';

interface ForcePwaUpdateOptions {
  onStatus?: (status: UpdateStatus) => void;
}

export async function forcePwaUpdate(options?: ForcePwaUpdateOptions): Promise<void> {
  const { onStatus } = options || {};

  try {
    // If no SW support, just reload with cache-buster
    if (!('serviceWorker' in navigator)) {
      onStatus?.('reloading');
      window.location.replace(`/?v=${Date.now()}`);
      return;
    }

    onStatus?.('checking');

    const registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
      onStatus?.('reloading');
      window.location.replace(`/?v=${Date.now()}`);
      return;
    }

    // Listen for controllerchange BEFORE triggering update
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      onStatus?.('reloading');
      window.location.replace(`/?v=${Date.now()}`);
    });

    // If there's already a waiting SW, activate it
    if (registration.waiting) {
      onStatus?.('updating');
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      // Fallback: if controllerchange doesn't fire in 3s, force reload
      setTimeout(() => {
        if (!reloading) {
          onStatus?.('reloading');
          window.location.replace(`/?v=${Date.now()}`);
        }
      }, 3000);
      return;
    }

    // Try to fetch a new SW
    onStatus?.('updating');
    await registration.update();

    // After update(), check if a new waiting SW appeared
    // Need a small delay for the browser to process
    await new Promise(r => setTimeout(r, 1000));

    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      setTimeout(() => {
        if (!reloading) {
          onStatus?.('reloading');
          window.location.replace(`/?v=${Date.now()}`);
        }
      }, 3000);
      return;
    }

    // Also listen for installing -> waiting transition
    if (registration.installing) {
      registration.installing.addEventListener('statechange', (e) => {
        const sw = e.target as ServiceWorker;
        if (sw.state === 'installed' && registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
      setTimeout(() => {
        if (!reloading) {
          onStatus?.('reloading');
          window.location.replace(`/?v=${Date.now()}`);
        }
      }, 5000);
      return;
    }

    // No new SW found - just reload with cache-buster
    onStatus?.('reloading');
    window.location.replace(`/?v=${Date.now()}`);

  } catch (error) {
    console.error('[forcePwaUpdate] Error:', error);
    onStatus?.('error');
    // Fallback: reload anyway
    window.location.replace(`/?v=${Date.now()}`);
  }
}
