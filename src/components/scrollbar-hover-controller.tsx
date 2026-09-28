"use client";

import { useEffect } from "react";

const HOVER_CLASS = "scrollbar-hover-active";

const isScrollable = (
  element: HTMLElement,
  axis: "vertical" | "horizontal",
) => {
  const style = window.getComputedStyle(element);
  const overflow = axis === "vertical" ? style.overflowY : style.overflowX;
  const contentSize = axis === "vertical" ? element.scrollHeight : element.scrollWidth;
  const viewportSize = axis === "vertical" ? element.clientHeight : element.clientWidth;

  return contentSize > viewportSize && ["auto", "scroll", "overlay"].includes(overflow);
};

const scrollbarUnderPointer = (event: PointerEvent): HTMLElement | null => {
  const candidates: HTMLElement[] = [];
  let current = event.target instanceof Element ? event.target : null;

  while (current) {
    if (current instanceof HTMLElement) candidates.push(current);
    current = current.parentElement;
  }

  const root = document.scrollingElement;
  if (root instanceof HTMLElement && !candidates.includes(root)) candidates.push(root);

  for (const element of candidates) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    const borderLeft = Number.parseFloat(style.borderLeftWidth) || 0;
    const borderRight = Number.parseFloat(style.borderRightWidth) || 0;
    const borderTop = Number.parseFloat(style.borderTopWidth) || 0;
    const borderBottom = Number.parseFloat(style.borderBottomWidth) || 0;
    const vertical = isScrollable(element, "vertical");
    const horizontal = isScrollable(element, "horizontal");
    const verticalGutter = element.offsetWidth - element.clientWidth - borderLeft - borderRight;
    const horizontalGutter = element.offsetHeight - element.clientHeight - borderTop - borderBottom;
    const verticalWidth = vertical ? Math.max(verticalGutter, 8) : 0;
    const horizontalHeight = horizontal ? Math.max(horizontalGutter, 8) : 0;

    if (
      vertical &&
      event.clientX >= rect.right - borderRight - verticalWidth &&
      event.clientX <= rect.right - borderRight &&
      event.clientY >= rect.top + borderTop &&
      event.clientY <= rect.bottom - borderBottom
    ) {
      return element;
    }

    if (
      horizontal &&
      event.clientX >= rect.left + borderLeft &&
      event.clientX <= rect.right - borderRight &&
      event.clientY >= rect.bottom - borderBottom - horizontalHeight &&
      event.clientY <= rect.bottom - borderBottom
    ) {
      return element;
    }
  }

  return null;
};

export const ScrollbarHoverController = () => {
  useEffect(() => {
    let activeElement: HTMLElement | null = null;

    const setActiveElement = (element: HTMLElement | null) => {
      if (activeElement === element) return;
      activeElement?.classList.remove(HOVER_CLASS);
      element?.classList.add(HOVER_CLASS);
      activeElement = element;
    };

    const handlePointerMove = (event: PointerEvent) => {
      setActiveElement(event.pointerType === "touch" ? null : scrollbarUnderPointer(event));
    };

    const clearActiveElement = () => setActiveElement(null);

    document.addEventListener("pointermove", handlePointerMove, { capture: true, passive: true });
    window.addEventListener("blur", clearActiveElement);
    window.addEventListener("pointerleave", clearActiveElement);

    return () => {
      document.removeEventListener("pointermove", handlePointerMove, true);
      window.removeEventListener("blur", clearActiveElement);
      window.removeEventListener("pointerleave", clearActiveElement);
      clearActiveElement();
    };
  }, []);

  return null;
};