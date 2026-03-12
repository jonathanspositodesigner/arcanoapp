import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

const NotFound = () => {
  const location = useLocation();
  const [show404, setShow404] = useState(false);

  useEffect(() => {
    const FLAG = "404_reload_attempted";
    const alreadyTried = sessionStorage.getItem(FLAG);

    if (!alreadyTried) {
      console.log("[NotFound] First 404 hit for", location.pathname, "— clearing cache and reloading...");
      sessionStorage.setItem(FLAG, "1");

      (async () => {
        try {
          // Clear all SW caches
          if ("caches" in window) {
            const names = await caches.keys();
            await Promise.all(names.map((n) => caches.delete(n)));
            console.log("[NotFound] Cleared caches:", names);
          }
          // Update service worker
          if ("serviceWorker" in navigator) {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) {
              await reg.update();
              console.log("[NotFound] SW update triggered");
            }
          }
        } catch (e) {
          console.warn("[NotFound] Cache clear error:", e);
        }
        window.location.reload();
      })();
      return;
    }

    // Already tried reload — this is a real 404
    sessionStorage.removeItem(FLAG);
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    setShow404(true);
  }, [location.pathname]);

  if (!show404) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
