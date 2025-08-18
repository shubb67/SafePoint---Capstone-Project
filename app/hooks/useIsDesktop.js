import { useEffect, useState } from "react";

export default function useIsDesktop(breakpoint = 1024) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia(`(min-width:${breakpoint}px)`);
    const update = () => {
      // treat wide screens OR explicit non‑mobile UA as desktop
      const uaDesktop = navigator.userAgentData?.mobile === false;
      setIsDesktop(mq.matches || uaDesktop);
    };

    update();
    // Safari fallback for older addListener/removeListener
    if (mq.addEventListener) mq.addEventListener("change", update);
    else mq.addListener(update);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", update);
      else mq.removeListener(update);
    };
  }, [breakpoint]);

  return isDesktop;
}
