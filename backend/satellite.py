import datetime

import httpx

POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"

_CACHE = {}


def _avg(series):
    valid = [v for v in series.values() if v != -999]
    return round(sum(valid) / len(valid), 2) if valid else None


def _sun_level(solar):
    if solar is None:
        return "unknown"
    if solar < 2:
        return "low"
    if solar < 4:
        return "moderate"
    return "high"


def get_satellite(lat, lon):
    key = (round(lat, 3), round(lon, 3))
    if key in _CACHE:
        return _CACHE[key]
    end = datetime.date.today() - datetime.timedelta(days=10)
    start = end - datetime.timedelta(days=30)
    params = {
        "parameters": "ALLSKY_SFC_SW_DWN,T2M,PRECTOTCORR",
        "community": "AG",
        "longitude": lon,
        "latitude": lat,
        "start": start.strftime("%Y%m%d"),
        "end": end.strftime("%Y%m%d"),
        "format": "JSON",
    }
    response = httpx.get(POWER_URL, params=params, timeout=30)
    response.raise_for_status()
    parameter = response.json()["properties"]["parameter"]
    solar_mj = _avg(parameter["ALLSKY_SFC_SW_DWN"])
    solar = round(solar_mj / 3.6, 2) if solar_mj is not None else None
    result = {
        "source": "NASA POWER (satellite + reanalysis)",
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "avg_solar_kwh_m2_day": solar,
        "sun_level": _sun_level(solar),
        "avg_air_temp_c": _avg(parameter["T2M"]),
        "avg_daily_rain_mm": _avg(parameter["PRECTOTCORR"]),
    }
    _CACHE[key] = result
    return result


if __name__ == "__main__":
    import json

    print(json.dumps(get_satellite(50.94159, -2.63211), indent=2))
