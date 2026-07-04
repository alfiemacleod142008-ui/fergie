import datetime

RAIN_LIMIT_MM = 10.0
MONTHS = [
    "",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
]


def _in_season(month, start, end):
    if start <= end:
        return start <= month <= end
    return month >= start or month <= end


def _longest_run(weather_data, flags):
    best_start = best_len = 0
    best_end = -1
    i = 0
    while i < len(flags):
        if not flags[i]:
            i += 1
            continue
        j = i
        while j < len(flags) and flags[j]:
            j += 1
        if j - i > best_len:
            best_len, best_start, best_end = j - i, i, j - 1
        i = j
    if best_len == 0:
        return None
    return {"start": weather_data[best_start]["date"], "end": weather_data[best_end]["date"]}


def _weather_window(weather_data, min_temp, frost_sensitive):
    flags = []
    day_reports = []
    for day in weather_data:
        blockers = []
        if frost_sensitive and day["frost"]:
            blockers.append("frost")
        if day["temp_max"] < min_temp:
            blockers.append(f"too cold ({day['temp_max']}°C < {min_temp}°C)")
        if day["rainfall_mm"] > RAIN_LIMIT_MM:
            blockers.append(f"too wet ({day['rainfall_mm']}mm)")
        flags.append(not blockers)
        day_reports.append({"date": day["date"], "plantable": not blockers, "blockers": blockers})
    window = _longest_run(weather_data, flags)
    blocked = [f"{r['date']} ({', '.join(r['blockers'])})" for r in day_reports if r["blockers"]]
    return window, day_reports, blocked


def find_planting_window(weather_data, crop_info=None):
    label = crop_info["name"].capitalize() if crop_info else "General planting"
    name = crop_info["name"] if crop_info else None
    month = int(weather_data[0]["date"][5:7]) if weather_data else datetime.date.today().month

    if crop_info:
        start_m, end_m = crop_info["sow_months"]
        if not _in_season(month, start_m, end_m):
            return {
                "crop": name,
                "best_window": None,
                "reasoning": (
                    f"{label} is sown outdoors {MONTHS[start_m]} to {MONTHS[end_m]}. "
                    f"It's now {MONTHS[month]}, so it's out of season; wait until {MONTHS[start_m]}."
                ),
                "days": [],
            }

    min_temp = crop_info["min_temp"] if crop_info else 5
    frost_sensitive = crop_info["frost_sensitive"] if crop_info else True
    window, day_reports, blocked = _weather_window(weather_data, min_temp, frost_sensitive)

    if window:
        reasoning = (
            f"{label} can go in from {window['start']} to {window['end']}: in season, frost free, "
            f"dry (under {RAIN_LIMIT_MM:.0f}mm rain) and reaching {min_temp}°C or warmer."
        )
        if blocked:
            reasoning += " Avoid: " + "; ".join(blocked) + "."
    else:
        reasoning = (
            f"{label} is in season, but no good day in the next 7: "
            + "; ".join(blocked)
            + ". Wait for a frost free, drier day."
        )

    return {"crop": name, "best_window": window, "reasoning": reasoning, "days": day_reports}
