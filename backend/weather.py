import datetime

import httpx

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

_CACHE = {}

DAILY = ",".join(
    [
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "precipitation_hours",
        "wind_speed_10m_max",
        "shortwave_radiation_sum",
        "et0_fao_evapotranspiration",
        "sunshine_duration",
    ]
)


def _soil_by_day(hourly):
    sums = {}
    counts = {}
    for stamp, value in zip(hourly.get("time", []), hourly.get("soil_temperature_6cm", [])):
        if value is None:
            continue
        day = stamp[:10]
        sums[day] = sums.get(day, 0.0) + value
        counts[day] = counts.get(day, 0) + 1
    return {day: round(sums[day] / counts[day], 1) for day in sums if counts[day]}


def _num(value, default=0.0):
    return default if value is None else value


def get_weather(lat, lon):
    key = (round(lat, 3), round(lon, 3), datetime.date.today().isoformat())
    if key in _CACHE:
        return _CACHE[key]
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": DAILY,
        "hourly": "soil_temperature_6cm",
        "forecast_days": 14,
        "timezone": "auto",
    }
    response = httpx.get(FORECAST_URL, params=params, timeout=10)
    response.raise_for_status()
    data = response.json()
    daily = data["daily"]
    soil = _soil_by_day(data.get("hourly", {}))

    days = []
    for i, date in enumerate(daily["time"]):
        temp_min = daily["temperature_2m_min"][i]
        solar_mj = daily["shortwave_radiation_sum"][i]
        days.append(
            {
                "date": date,
                "temp_max": daily["temperature_2m_max"][i],
                "temp_min": temp_min,
                "frost": temp_min is not None and temp_min <= 0,
                "rainfall_mm": round(_num(daily["precipitation_sum"][i]), 1),
                "rain_hours": round(_num(daily["precipitation_hours"][i]), 1),
                "wind_max": daily["wind_speed_10m_max"][i],
                "solar_kwh": round(solar_mj / 3.6, 2) if solar_mj is not None else None,
                "et0_mm": round(_num(daily["et0_fao_evapotranspiration"][i]), 2),
                "sunshine_hours": round(_num(daily["sunshine_duration"][i]) / 3600, 1),
                "soil_temp": soil.get(date),
            }
        )
    _CACHE[key] = days
    return days


if __name__ == "__main__":
    import json

    print(json.dumps(get_weather(50.94159, -2.63211), indent=2))
