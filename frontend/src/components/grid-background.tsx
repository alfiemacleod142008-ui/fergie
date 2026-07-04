"use client";

import { useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useAnimationFrame,
} from "framer-motion";

function GridPattern({ offsetX, offsetY }: { offsetX: any; offsetY: any }) {
  return (
    <svg className="h-full w-full text-primary">
      <defs>
        <motion.pattern
          id="fergie-grid"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
        </motion.pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#fergie-grid)" />
    </svg>
  );
}

export function GridBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(-500);
  const mouseY = useMotionValue(-500);
  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);

  useEffect(() => {
    const move = (event: MouseEvent) => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      mouseX.set(event.clientX - rect.left);
      mouseY.set(event.clientY - rect.top);
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [mouseX, mouseY]);

  useAnimationFrame(() => {
    offsetX.set((offsetX.get() + 0.35) % 40);
    offsetY.set((offsetY.get() + 0.35) % 40);
  });

  const maskImage = useMotionTemplate`radial-gradient(320px circle at ${mouseX}px ${mouseY}px, black, transparent)`;

  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.12]">
        <GridPattern offsetX={offsetX} offsetY={offsetY} />
      </div>
      <motion.div
        className="absolute inset-0 opacity-50 motion-reduce:hidden"
        style={{ maskImage, WebkitMaskImage: maskImage }}
      >
        <GridPattern offsetX={offsetX} offsetY={offsetY} />
      </motion.div>
      <div className="absolute right-[-15%] top-[-10%] size-[45%] rounded-full bg-primary/25 blur-[120px]" />
      <div className="absolute left-[-15%] top-[25%] size-[35%] rounded-full bg-emerald-400/20 blur-[120px]" />
      <div className="absolute bottom-[-15%] left-[20%] size-[45%] rounded-full bg-lime-500/15 blur-[130px]" />
    </div>
  );
}
