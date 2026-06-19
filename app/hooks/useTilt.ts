import { useRef, useState } from "react";

/**
 * Lightweight 3D tilt-on-hover. Tracks pointer position over an element and
 * returns inline transform style + handlers. Pure pointer math, no deps; resets
 * smoothly on leave. Honors reduced-motion by returning a no-op transform.
 */
export function useTilt(maxDeg = 7) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const onMouseMove = (e: React.MouseEvent) => {
    if (prefersReduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1
    const rotateY = (px - 0.5) * 2 * maxDeg;
    const rotateX = -(py - 0.5) * 2 * maxDeg;
    setStyle({
      transform: `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(1.02)`,
      transition: "transform 80ms ease-out",
    });
  };

  const onMouseLeave = () => {
    setStyle({
      transform: "perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)",
      transition: "transform 400ms cubic-bezier(0.22,1,0.36,1)",
    });
  };

  return { ref, style, onMouseMove, onMouseLeave };
}
