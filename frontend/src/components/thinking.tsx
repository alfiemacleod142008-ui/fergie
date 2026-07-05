"use client";

import { useEffect, useState } from "react";

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
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/50" />
        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400/70" />
      </span>
      <span key={i} className="animate-in fade-in duration-500 motion-reduce:animate-none">
        {label}…
      </span>
    </div>
  );
}
