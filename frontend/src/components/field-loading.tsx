"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const STEPS = [
  "Locating the field",
  "Reading the forecast",
  "Checking the terrain",
  "Scanning the satellite",
  "Finding the window",
];

export function FieldLoading({ place }: { place?: string }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setStep((value) => Math.min(value + 1, STEPS.length - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mt-16 flex w-full flex-col items-center text-center">
      <div className="grid size-12 place-items-center rounded-full border border-emerald-400/30">
        <Loader2 className="size-5 animate-spin text-emerald-400" aria-hidden="true" />
      </div>

      <p className="mt-6 text-lg font-light tracking-tight text-white">
        Reading your land{place ? `, ${place}` : ""}
      </p>

      <div className="mt-6 flex items-center justify-center gap-2" aria-hidden="true">
        {STEPS.map((label, index) => (
          <span
            key={label}
            className={`size-2 rounded-full transition-colors duration-500 ${
              index <= step ? "bg-emerald-400" : "bg-white/15"
            }`}
          />
        ))}
      </div>

      <p className="mt-4 h-5 text-sm text-white/60">{STEPS[step]}</p>
    </div>
  );
}
