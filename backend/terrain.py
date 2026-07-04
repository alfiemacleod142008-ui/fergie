import math
from io import BytesIO

import httpx
from PIL import Image

ELEVATION_URL = "https://api.open-meteo.com/v1/elevation"
SATELLITE_URL = "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export"

OFFSET_M = 150.0
FIELD_M = 150.0
GRID_N = 6
GREEN_THRESHOLD = 16
GREEN_FRACTION_MIN = 0.15

_TERRAIN_CACHE = {}
_FIELD_CACHE = {}


def _sample_elevations(lat, lon):
    dlat = OFFSET_M / 111320.0
    dlon = OFFSET_M / (111320.0 * math.cos(math.radians(lat)))
    points = [
        (lat, lon),
        (lat + dlat, lon),
        (lat - dlat, lon),
        (lat, lon + dlon),
        (lat, lon - dlon),
    ]
    lats = ",".join(str(p[0]) for p in points)
    lons = ",".join(str(p[1]) for p in points)
    response = httpx.get(ELEVATION_URL, params={"latitude": lats, "longitude": lons}, timeout=10)
    response.raise_for_status()
    return response.json()["elevation"]


def _aspect(grad_ns, grad_ew):
    if grad_ns == 0 and grad_ew == 0:
        return "flat"
    bearing = math.degrees(math.atan2(-grad_ew, -grad_ns)) % 360
    names = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    return names[int((bearing + 22.5) % 360 // 45)]


def _drainage(slope_degrees):
    if slope_degrees < 2:
        return "flat, water may collect and drainage can be poor"
    if slope_degrees < 8:
        return "gentle slope with good natural drainage"
    return "steep, drains fast and can dry out or erode"


def get_terrain(lat, lon):
    key = (round(lat, 4), round(lon, 4))
    if key in _TERRAIN_CACHE:
        return _TERRAIN_CACHE[key]
    center, north, south, east, west = _sample_elevations(lat, lon)
    span = 2 * OFFSET_M
    grad_ns = (north - south) / span
    grad_ew = (east - west) / span
    slope_degrees = math.degrees(math.atan(math.hypot(grad_ns, grad_ew)))
    result = {
        "elevation_m": round(center, 1),
        "slope_degrees": round(slope_degrees, 1),
        "aspect": _aspect(grad_ns, grad_ew),
        "drainage": _drainage(slope_degrees),
    }
    _TERRAIN_CACHE[key] = result
    return result


def _field_deltas(lat):
    dlat = FIELD_M / 111320.0
    dlon = FIELD_M / (111320.0 * math.cos(math.radians(lat)))
    return dlat, dlon


def _image_url(lat, lon):
    dlat, dlon = _field_deltas(lat)
    bbox = f"{lon - dlon},{lat - dlat},{lon + dlon},{lat + dlat}"
    return f"{SATELLITE_URL}?bbox={bbox}&bboxSR=4326&size=600,600&format=jpg&f=image"


def _greenness_grid(lat, lon):
    response = httpx.get(_image_url(lat, lon), timeout=12)
    response.raise_for_status()
    image = Image.open(BytesIO(response.content)).convert("RGB").resize((GRID_N, GRID_N))
    pixels = image.load()
    return [[2 * pixels[i, j][1] - pixels[i, j][0] - pixels[i, j][2] for i in range(GRID_N)] for j in range(GRID_N)]


def analyse_field(lat, lon):
    key = (round(lat, 4), round(lon, 4))
    if key in _FIELD_CACHE:
        return _FIELD_CACHE[key]
    green_fraction = None
    plantable = None
    try:
        green = _greenness_grid(lat, lon)
        vegetated = sum(green[j][i] > GREEN_THRESHOLD for j in range(GRID_N) for i in range(GRID_N))
        green_fraction = round(vegetated / (GRID_N * GRID_N), 2)
        plantable = green_fraction >= GREEN_FRACTION_MIN
    except Exception:
        pass

    result = {
        "image_url": _image_url(lat, lon),
        "green_fraction": green_fraction,
        "plantable": plantable,
    }
    _FIELD_CACHE[key] = result
    return result


if __name__ == "__main__":
    import json

    print(json.dumps(get_terrain(50.94159, -2.63211), indent=2))
    print(json.dumps(analyse_field(50.94159, -2.63211), indent=2))
