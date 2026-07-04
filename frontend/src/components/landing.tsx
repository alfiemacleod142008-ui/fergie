"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Sprout } from "lucide-react";

export function Landing({ onEnter }: { onEnter: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let time = 0;
    const speed = 0.018;
    const scale = 2;
    const noiseIntensity = 0.7;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const noise = (x: number, y: number) => {
      const g = 2.71828;
      const rx = g * Math.sin(g * x);
      const ry = g * Math.sin(g * y);
      return (rx * ry * (1 + x)) % 1;
    };

    const animate = () => {
      const { width, height } = canvas;
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#08120c");
      gradient.addColorStop(0.5, "#102a1c");
      gradient.addColorStop(1, "#08120c");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      for (let x = 0; x < width; x += 2) {
        for (let y = 0; y < height; y += 2) {
          const u = (x / width) * scale;
          const v = (y / height) * scale;
          const tOffset = speed * time;
          const texX = u;
          const texY = v + 0.03 * Math.sin(8 * texX - tOffset);
          const pattern =
            0.6 +
            0.4 *
              Math.sin(
                5 * (texX + texY + Math.cos(3 * texX + 5 * texY) + 0.02 * tOffset) +
                  Math.sin(20 * (texX + texY - 0.1 * tOffset)),
              );
          const rnd = noise(x, y);
          const intensity = Math.max(0, pattern - (rnd / 15) * noiseIntensity);
          const index = (y * width + x) * 4;
          if (index < data.length) {
            data[index] = Math.floor(46 * intensity);
            data[index + 1] = Math.floor(142 * intensity);
            data[index + 2] = Math.floor(92 * intensity);
            data[index + 3] = 255;
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);

      const overlay = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.max(width, height) / 2,
      );
      overlay.addColorStop(0, "rgba(0,0,0,0.12)");
      overlay.addColorStop(1, "rgba(0,0,0,0.6)");
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, width, height);

      time += 1;
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const reveal = "transition-all duration-1000 ease-out motion-reduce:transition-none";
  const shown = isLoaded ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0";

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 z-0 h-full w-full" />
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/40 via-transparent to-black/70" />
      <div className="relative z-20 mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-8 text-center">
        <div className={`flex items-center gap-2 text-white/75 ${reveal} ${shown}`}>
          <Sprout className="size-5" />
          <span className="text-sm font-medium uppercase tracking-[0.3em]">Fergie</span>
        </div>
        <h1
          className={`mt-6 text-balance text-5xl font-light leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl ${reveal} delay-150 ${shown}`}
        >
          Know when and where to plant
        </h1>
        <p
          className={`mt-6 max-w-md text-base font-light leading-relaxed text-white/70 ${reveal} delay-300 ${shown}`}
        >
          Enter your postcode. Fergie reads the real weather, terrain, soil and satellite data for
          your own land — then shows the best window and the best spot to plant.
        </p>
        <button
          onClick={onEnter}
          className={`group mt-10 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[15px] font-medium text-neutral-900 shadow-[0_12px_44px_-10px_rgba(255,255,255,0.45)] transition hover:bg-white/90 active:scale-[0.98] ${reveal} delay-500 ${shown}`}
        >
          Get planting advice
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
