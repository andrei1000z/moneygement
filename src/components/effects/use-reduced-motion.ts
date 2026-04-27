"use client";

import { useSyncExternalStore } from "react";

function subscribeMq(callback: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  // Observe `html.a11y-reduce-motion` toggle (settings-driven).
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => {
    mq.removeEventListener("change", callback);
    observer.disconnect();
  };
}

function getMqSnapshot(): boolean {
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.classList.contains("a11y-reduce-motion")
  );
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Hook care returnează `true` dacă userul preferă reduced motion fie prin
 * media query, fie prin toggle-ul Banii din settings (`html.a11y-reduce-motion`).
 */
export function useReducedMotionPref(): boolean {
  return useSyncExternalStore(subscribeMq, getMqSnapshot, getServerSnapshot);
}
