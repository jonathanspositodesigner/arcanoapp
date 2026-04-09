import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

/**
 * Redirects non-Brazilian visitors to a target route.
 * - Uses ipapi.co free API to detect country by IP
 * - Only redirects if country !== "BR"
 * - Fails safe: if API errors/timeouts, stays on current page (assumes BR)
 * - ?geo=br parameter bypasses redirect (for testing)
 * - Stores result in sessionStorage to avoid repeated API calls
 */
export const useGeoRedirect = (targetRoute: string) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Allow force override via URL param
    const geoParam = searchParams.get("geo");
    if (geoParam === "br") return;

    // Check sessionStorage to avoid repeated calls
    const cached = sessionStorage.getItem("geo_country");
    if (cached) {
      if (cached !== "BR") {
        navigate(targetRoute, { replace: true });
      }
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    fetch("https://ipapi.co/json/", { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        const country = data?.country_code || "BR";
        sessionStorage.setItem("geo_country", country);
        if (country !== "BR") {
          navigate(targetRoute, { replace: true });
        }
      })
      .catch(() => {
        // Fail safe: assume BR, don't redirect
        sessionStorage.setItem("geo_country", "BR");
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [navigate, targetRoute, searchParams]);
};
