"use client";

import { useEffect, useState } from "react";

import { Logo } from "@/components/logo";

export function Thinking({ steps }: { steps: string[] }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    setI(0);
    if (steps.length <= 1) return;
    const id = setInterval(() => {
      setI((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1700);
    return () => clearInterval(id);
  }, [steps]);

  const label = steps[i] ?? "Thinking";

  return (
    <div className="flex items-center gap-2 py-1 text-[13px] text-white/35" aria-live="polite">
      <Logo className="size-3.5 shrink-0 animate-pulse text-emerald-400/80 motion-reduce:animate-none" />
      <span key={i} className="animate-in fade-in duration-500 motion-reduce:animate-none">
        {label}…
      </span>
    </div>
  );
}
