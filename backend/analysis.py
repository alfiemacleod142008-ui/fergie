import datetime


def _fmt(date):
    try:
        return datetime.date.fromisoformat(date).strftime("%-d %b")
    except Exception:
        return date


def _mean(values):
    clean = [v for v in values if v is not None]
    return sum(clean) / len(clean) if clean else None


def _clamp(value):
    return max(0, min(100, round(value)))


def _gdd_base(min_temp):
    if min_temp >= 12:
        return 10
    if min_temp >= 8:
        return 7
    return 5


def _texture_word(soil):
    if not soil:
        return None
    clay = soil.get("clay_pct")
    sand = soil.get("sand_pct")
    if clay is not None and clay >= 35:
        return "clay"
    if sand is not None and sand >= 65:
        return "sandy"
    return "loam"


def _day_score(day, base, frost_sensitive):
    score = 100.0
    if frost_sensitive and day["frost"]:
        score -= 60
    if day["temp_max"] is not None and day["temp_max"] < base:
        score -= 35
    soil = day.get("soil_temp")
    if soil is not None and soil < base:
        score -= 20
    rain = day.get("rainfall_mm") or 0
    if rain > 10:
        score -= 25
    elif rain > 4:
        score -= 10
    wind = day.get("wind_max") or 0
    if wind > 45:
        score -= 12
    return max(0.0, score)


def analyse_weather(weather, terrain, satellite, soil, crop_info):
    if not weather:
        return None

    full = weather
    weather = weather[:7]
    hot = [d for d in full if d.get("temp_max") is not None and d["temp_max"] >= 29]
    heat_peak = None
    heat_day = None
    if hot:
        peak = max(hot, key=lambda d: d["temp_max"])
        heat_peak = round(peak["temp_max"])
        heat_day = _fmt(peak["date"])

    base = crop_info["min_temp"] if crop_info else 6
    frost_sensitive = crop_info["frost_sensitive"] if crop_info else True
    name = crop_info["name"] if crop_info else None

    highs = [d["temp_max"] for d in weather if d["temp_max"] is not None]
    lows = [d["temp_min"] for d in weather if d["temp_min"] is not None]
    avg_high = round(_mean(highs)) if highs else None
    gdd_base = _gdd_base(base)
    gdd = round(sum(max(0.0, (d["temp_max"] + d["temp_min"]) / 2 - gdd_base) for d in weather if d["temp_max"] is not None and d["temp_min"] is not None))
    frost_nights = sum(1 for d in weather if d["frost"])
    frost_dates = [_fmt(d["date"]) for d in weather if d["frost"]]
    coldest = round(min(lows)) if lows else None

    avg_soil_temp = _mean([d.get("soil_temp") for d in weather])
    avg_soil_temp = round(avg_soil_temp, 1) if avg_soil_temp is not None else None
    soil_warm = avg_soil_temp is not None and avg_soil_temp >= base

    rain_total = round(sum((d.get("rainfall_mm") or 0) for d in weather), 1)
    rain_days = sum(1 for d in weather if (d.get("rainfall_mm") or 0) >= 1)
    et0_total = round(sum((d.get("et0_mm") or 0) for d in weather), 1)
    moisture_balance = round(rain_total - et0_total, 1)
    sunshine_total = round(sum((d.get("sunshine_hours") or 0) for d in weather))
    wind_peak = max([(d.get("wind_max") or 0) for d in weather], default=0)

    soil_ph = soil.get("ph") if soil else None
    texture = _texture_word(soil)

    day_scores = [(d["date"], _day_score(d, base, frost_sensitive)) for d in weather]
    best = max(day_scores, key=lambda item: item[1])
    best_day = best[0] if best[1] >= 45 else None

    soil_score = 100 if soil_warm else (100 - (base - avg_soil_temp) * 15 if avg_soil_temp is not None else 55)
    frost_score = 100 - frost_nights * (25 if frost_sensitive else 8)
    moisture_score = 100
    if rain_total > 30:
        moisture_score -= 30
    elif rain_total > 18:
        moisture_score -= 12
    dry_penalty = 15 if texture == "sandy" else 8
    if moisture_balance < -18:
        moisture_score -= dry_penalty
    sun_score = min(100, (sunshine_total / 42) * 100)
    ph_penalty = 0
    if soil_ph is not None and (soil_ph < 5.5 or soil_ph > 7.8):
        ph_penalty = 8

    score = _clamp(
        0.30 * _clamp(soil_score)
        + 0.28 * _clamp(frost_score)
        + 0.20 * _clamp(moisture_score)
        + 0.22 * sun_score
        - ph_penalty
    )
    verdict = "Good" if score >= 70 else "Fair" if score >= 45 else "Poor"

    parts = []
    if avg_soil_temp is not None:
        parts.append(
            f"Soil at 6cm is averaging {avg_soil_temp}°C, "
            + ("warm enough for" if soil_warm else f"still under the {base}°C")
            + (f" {name} to germinate." if name else " germination.")
        )
    if avg_high is not None:
        parts.append(f"Daytime highs average {avg_high}°C, banking about {gdd} growing degree days this week.")
    if frost_nights == 0:
        parts.append("No frost is forecast.")
    else:
        parts.append(
            f"Frost on {' and '.join(frost_dates)} down to {coldest}°C"
            + (", a real risk for this tender crop." if frost_sensitive else ", which this hardy crop shrugs off.")
        )
    balance_word = "surplus" if moisture_balance >= 0 else "deficit"
    moisture_line = (
        f"About {rain_total}mm of rain across {rain_days} day(s) against {et0_total}mm lost to evaporation, "
        f"a {abs(moisture_balance)}mm {balance_word}"
    )
    if texture:
        moisture_line += f", on {texture} ground"
        if texture == "clay" and moisture_balance < 0:
            moisture_line += " that holds moisture well."
        elif texture == "sandy" and moisture_balance < -10:
            moisture_line += " that drains fast, so keep it watered."
        else:
            moisture_line += "."
    else:
        moisture_line += (", so the ground may want watering." if moisture_balance < -12 else ".")
    parts.append(moisture_line)
    parts.append(f"Around {sunshine_total} hours of sunshine over the week.")
    if soil_ph is not None:
        band = "acidic" if soil_ph < 5.8 else "alkaline" if soil_ph > 7.3 else "near neutral"
        parts.append(f"Soil pH is about {soil_ph} ({band}).")
    if wind_peak and wind_peak > 38:
        parts.append(f"Winds peak near {round(wind_peak)} km/h, so shelter tender transplants.")
    if terrain:
        parts.append(f"The ground sits {terrain['elevation_m']}m up, faces {terrain['aspect']}, {terrain['drainage']}.")
    if best_day:
        parts.append(f"The strongest day to get going looks like {_fmt(best_day)}.")
    if heat_peak is not None:
        parts.append(
            f"Looking further ahead, a hot spell builds to around {heat_peak}°C by {heat_day}, "
            "so keep new sowings and seedlings well watered."
        )

    return {
        "score": score,
        "verdict": verdict,
        "heat_peak": heat_peak,
        "heat_day": heat_day,
        "headline": f"{verdict} growing week" + (f" for {name}" if name else ""),
        "detail": " ".join(parts),
        "soil_temp": avg_soil_temp,
        "soil_warm": soil_warm,
        "soil_ph": soil_ph,
        "soil_texture": texture,
        "gdd_week": gdd,
        "gdd_base": gdd_base,
        "frost_nights": frost_nights,
        "frost_dates": frost_dates,
        "coldest": coldest,
        "rain_mm": rain_total,
        "rain_days": rain_days,
        "et0_mm": et0_total,
        "moisture_balance": moisture_balance,
        "sunshine_hours": sunshine_total,
        "wind_max": round(wind_peak) if wind_peak else None,
        "best_day": _fmt(best_day) if best_day else None,
        "factors": {
            "soil": _clamp(soil_score),
            "frost": _clamp(frost_score),
            "moisture": _clamp(moisture_score),
            "sun": _clamp(sun_score),
        },
    }
