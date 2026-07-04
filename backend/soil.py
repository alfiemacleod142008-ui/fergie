import time

import httpx

SOILGRIDS_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query"
PROPERTIES = ["phh2o", "clay", "sand", "silt", "soc", "nitrogen"]
RETRY_STATUS = {429, 500, 502, 503, 504}

_CACHE = {}


def _texture(clay, sand):
    if clay is None or sand is None:
        return "unknown"
    if clay >= 40:
        return "clay — heavy, holds water, slow to drain and warm up"
    if sand >= 70:
        return "sandy — light, drains fast, dries out and warms quickly"
    return "loam — balanced moisture and drainage, good for most crops"


def _ph_note(ph):
    if ph is None:
        return "unknown"
    if ph < 5.5:
        return f"acidic (pH {ph}) — good for potatoes/blueberries; lime for brassicas"
    if ph <= 7.5:
        return f"near-neutral (pH {ph}) — suits most crops"
    return f"alkaline (pH {ph}) — suits brassicas; poor for acid-loving crops"


def _fetch(params, attempts=2):
    last_error = None
    for attempt in range(attempts):
        try:
            response = httpx.get(SOILGRIDS_URL, params=params, timeout=3)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as error:
            last_error = error
            if error.response.status_code not in RETRY_STATUS or attempt == attempts - 1:
                raise
            time.sleep(0.4)
        except httpx.RequestError:
            raise
    raise last_error


def get_soil(lat, lon):
    key = (round(lat, 3), round(lon, 3))
    if key in _CACHE:
        return _CACHE[key]
    params = [("lon", lon), ("lat", lat), ("depth", "0-5cm"), ("value", "mean")]
    params += [("property", p) for p in PROPERTIES]
    data = _fetch(params)
    values = {}
    for layer in data["properties"]["layers"]:
        mean = layer["depths"][0]["values"]["mean"]
        factor = layer["unit_measure"]["d_factor"]
        values[layer["name"]] = round(mean / factor, 1) if mean is not None else None
    if not values or all(v is None for v in values.values()):
        raise RuntimeError("SoilGrids returned no data (service may be temporarily degraded)")
    ph, clay, sand = values.get("phh2o"), values.get("clay"), values.get("sand")
    result = {
        "ph": ph,
        "ph_note": _ph_note(ph),
        "texture": _texture(clay, sand),
        "clay_pct": clay,
        "sand_pct": sand,
        "silt_pct": values.get("silt"),
        "organic_carbon": values.get("soc"),
        "nitrogen": values.get("nitrogen"),
    }
    _CACHE[key] = result
    return result


if __name__ == "__main__":
    import json

    print(json.dumps(get_soil(50.94159, -2.63211), indent=2))
