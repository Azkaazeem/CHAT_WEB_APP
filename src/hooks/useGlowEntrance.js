import { useLayoutEffect } from "react";
import gsap from "gsap";

export const useGlowEntrance = (ref, dependencies = []) => {
  useLayoutEffect(() => {
    if (!ref.current) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current.querySelectorAll("[data-animate]"),
        {
          opacity: 0,
          y: 28,
          scale: 0.96,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          ease: "power3.out",
          duration: 0.9,
          stagger: 0.08,
        },
      );
    }, ref);

    return () => ctx.revert();
  }, dependencies);
};
