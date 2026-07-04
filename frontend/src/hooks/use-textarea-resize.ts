"use client";

import { useLayoutEffect, useRef } from "react";

export function useTextareaResize(value: string, rows = 1) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const style = window.getComputedStyle(textarea);
    const lineHeight = Number.parseInt(style.lineHeight, 10) || 20;
    const paddingTop = Number.parseInt(style.paddingTop, 10) || 0;
    const paddingBottom = Number.parseInt(style.paddingBottom, 10) || 0;
    const minHeight = lineHeight * rows + paddingTop + paddingBottom;
    textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`;
  }, [value, rows]);

  return ref;
}
