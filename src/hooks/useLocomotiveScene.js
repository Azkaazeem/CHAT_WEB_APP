import { useEffect } from "react";
import LocomotiveScroll from "locomotive-scroll";

export const useLocomotiveScene = (containerRef, enabled = true) => {
  useEffect(() => {
    if (!enabled || !containerRef.current || window.innerWidth < 1024) {
      return undefined;
    }

    const scroll = new LocomotiveScroll({
      el: containerRef.current,
      smooth: true,
      multiplier: 0.75,
      smartphone: { smooth: false },
      tablet: { smooth: false },
    });

    return () => {
      scroll.destroy();
    };
  }, [containerRef, enabled]);
};
