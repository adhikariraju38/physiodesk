"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type Anchored = {
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  panelRef: React.RefObject<HTMLDivElement | null>;
  style: React.CSSProperties | undefined;
};

/**
 * Positions a popover against its trigger using fixed coordinates.
 *
 * The panel is rendered in a portal rather than next to the trigger, because
 * the toolbars and cards it opens from clip their overflow and would cut it in
 * half. That means measuring the trigger by hand and flipping upward when there
 * is not enough room below.
 */
export function useAnchoredPanel(open: boolean, onClose: () => void, minHeight = 240): Anchored {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<React.CSSProperties | undefined>(undefined);

  const measure = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom;
    const flip = below < minHeight && rect.top > below;

    setStyle({
      position: "fixed",
      left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
      minWidth: rect.width,
      ...(flip
        ? { bottom: window.innerHeight - rect.top + 6, maxHeight: rect.top - 16 }
        : { top: rect.bottom + 6, maxHeight: below - 16 }),
    });
  }, [minHeight]);

  useLayoutEffect(() => {
    if (!open) return;
    measure();

    // capture phase, so scrolling the main column also repositions the panel
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      onClose();
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, onClose]);

  return { triggerRef, panelRef, style };
}
