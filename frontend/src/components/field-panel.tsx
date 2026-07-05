"use client";

import { useEffect, useState } from "react";

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function cap(text?: string) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "—";
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-neutral-950 px-4 py-3">
      <dt className="text-xs text-white/55">{label}</dt>
      <dd className="mt-0.5 text-[17px] font-medium tracking-tight text-white">{value}</dd>
      {note && <p className="mt-1 text-[11px] leading-snug text-white/40">{note}</p>}
    </div>
  );
}

function num(v: any): number | null {
  return v === null || v === undefined || v === "" ? null : Number(v);
}

function soilTempNote(t: number | null) {
  if (t === null) return undefined;
  if (t >= 14) return "Warm enough to sow most crops";
  if (t >= 8) return "Cool: only hardy crops will germinate";
  return "Too cold for most seeds to germinate";
}

function warmthNote(gdd: number | null) {
  if (gdd === null) return undefined;
  if (gdd >= 90) return "Strong warmth: crops growing fast";
  if (gdd >= 45) return "Steady warmth for growth";
  return "Little heat: growth is slow";
}

function moistureValue(mm: number | null) {
  if (mm === null) return "—";
  const r = Math.round(Math.abs(mm) * 10) / 10;
  if (mm < -1) return `${r} mm short`;
  if (mm > 1) return `${r} mm spare`;
  return "Balanced";
}

function moistureNote(mm: number | null) {
  if (mm === null) return undefined;
  if (mm <= -25) return "Ground drying out: crops may need watering";
  if (mm < -1) return "A bit more lost to evaporation than fell as rain";
  if (mm <= 15) return "Rain and evaporation roughly even";
  return "Wet: ground is holding plenty of water";
}

function sunNote(h: number | null) {
  if (h === null) return undefined;
  const perDay = Math.round((h / 7) * 10) / 10;
  return `About ${perDay} h of sun a day`;
}

function frostNote(nights: number | null) {
  if (nights === null) return undefined;
  if (nights === 0) return "No frost expected";
  return `Protect tender crops on ${nights} cold night${nights > 1 ? "s" : ""}`;
}

function windNote(kmh: number | null) {
  if (kmh === null) return undefined;
  if (kmh >= 55) return "Gales: shelter or stake tender plants";
  if (kmh >= 32) return "Breezy: some drying and wind chill";
  return "Light winds";
}

function phNote(ph: number | null) {
  if (ph === null) return undefined;
  if (ph < 5.5) return "Acidic: lime for most veg and grass";
  if (ph <= 7.5) return "In the ideal range for most crops";
  return "Alkaline: suits brassicas, not acid lovers";
}

export function FieldPanel({
  advice,
  land,
  cropLabel,
}: {
  advice: any;
  land: any;
  cropLabel: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const field = advice?.field;

  useEffect(() => {
    setImgFailed(false);
  }, [field?.image_url]);

  const planting = advice?.planting_window?.best_window;
  const reasoning = advice?.planting_window?.reasoning;
  const analysis = advice?.analysis;
  const builtUp = land ? land.plantable === false : field?.plantable === false;

  const verdictColor =
    analysis?.verdict === "Good"
      ? "bg-emerald-400/15 text-emerald-300"
      : analysis?.verdict === "Poor"
        ? "bg-red-400/15 text-red-300"
        : "bg-amber-400/15 text-amber-300";

  const value = (v: any, suffix = "") => (v === null || v === undefined ? "—" : `${v}${suffix}`);

  return (
    <div className="space-y-5">
      {field && !imgFailed && (
        <figure className="relative overflow-hidden rounded-2xl border border-white/10">
          <img
            src={field.image_url}
            alt={`Satellite view of the land for ${cropLabel}`}
            onError={() => setImgFailed(true)}
            className="aspect-[4/3] w-full object-cover"
          />
          {builtUp && (
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 pt-8 text-[13px] font-medium text-white">
              Looks built up. Drag the pin onto your field
            </figcaption>
          )}
        </figure>
      )}

      <div>
        {planting ? (
          <span className="inline-flex rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
            Plant now
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-medium text-amber-300">
            Hold off
          </span>
        )}
        {planting ? (
          <p className="mt-2 text-3xl font-light tracking-tight text-white">
            {fmt(planting.start)} to {fmt(planting.end)}
          </p>
        ) : (
          <p className="mt-2 text-[15px] font-light leading-relaxed text-white/85">{reasoning}</p>
        )}
        {planting && analysis?.best_day && (
          <p className="mt-1.5 text-sm text-white/55">Best day to sow: {analysis.best_day}</p>
        )}
      </div>

      {analysis && (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <span className="text-sm text-white/60">Growing analysis</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${verdictColor}`}>
              {analysis.verdict} · {analysis.score}/100
            </span>
          </div>
          {analysis.detail && (
            <p className="border-t border-white/10 px-4 py-3 text-[14px] font-light leading-relaxed text-white/85">
              {analysis.detail}
            </p>
          )}
          <dl className="grid grid-cols-2 gap-px border-t border-white/10 bg-white/10">
            <Metric
              label="Soil temperature"
              value={value(analysis.soil_temp, "°C")}
              note={soilTempNote(num(analysis.soil_temp))}
            />
            <Metric
              label="Growing warmth, 7 days"
              value={value(analysis.gdd_week)}
              note={warmthNote(num(analysis.gdd_week))}
            />
            <Metric
              label="Water balance, 7 days"
              value={moistureValue(num(analysis.moisture_balance))}
              note={moistureNote(num(analysis.moisture_balance))}
            />
            <Metric
              label="Sunshine, 7 days"
              value={value(analysis.sunshine_hours, " h")}
              note={sunNote(num(analysis.sunshine_hours))}
            />
            <Metric
              label="Frost nights ahead"
              value={value(analysis.frost_nights)}
              note={frostNote(num(analysis.frost_nights))}
            />
            <Metric
              label="Strongest wind"
              value={value(analysis.wind_max, " km/h")}
              note={windNote(num(analysis.wind_max))}
            />
            {analysis.soil_ph != null && (
              <Metric label="Soil pH" value={value(analysis.soil_ph)} note={phNote(num(analysis.soil_ph))} />
            )}
            {analysis.soil_ph != null && (
              <Metric
                label="Soil type"
                value={analysis.soil_texture ? cap(analysis.soil_texture) : "—"}
                note={analysis.soil_texture ? "Affects drainage and how it works" : undefined}
              />
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
