import * as React from "react";

const TABLET_BREAKPOINT = 1024;

export function useIsTabletViewport() {
  const [isTabletViewport, setIsTabletViewport] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < TABLET_BREAKPOINT;
  });

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${TABLET_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsTabletViewport(window.innerWidth < TABLET_BREAKPOINT);
    };

    mql.addEventListener("change", onChange);
    setIsTabletViewport(window.innerWidth < TABLET_BREAKPOINT);

    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isTabletViewport;
}
