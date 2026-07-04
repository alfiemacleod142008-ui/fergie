"use client";

import { useEffect, useState } from "react";

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function cap(text?: string) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "—";
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-neutral-950 px-4 py-3">
      <dt className="text-xs text-white/55">{label}</dt>
      <dd className="mt-0.5 text-[17px] font-medium tracking-tight text-white">{value}</dd>
    </div>
  );
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
            <Metric label="Soil at 6cm" value={value(analysis.soil_temp, "°C")} />
            <Metric label="Degree days, week" value={value(analysis.gdd_week)} />
            <Metric label="Rain minus loss" value={value(analysis.moisture_balance, " mm")} />
            <Metric label="Sunshine, week" value={value(analysis.sunshine_hours, " h")} />
            <Metric label="Frost nights" value={value(analysis.frost_nights)} />
            <Metric label="Wind peak" value={value(analysis.wind_max, " km/h")} />
            {analysis.soil_ph != null && <Metric label="Soil pH" value={value(analysis.soil_ph)} />}
            {analysis.soil_ph != null && (
              <Metric
                label="Soil type"
                value={analysis.soil_texture ? cap(analysis.soil_texture) : "—"}
              />
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
