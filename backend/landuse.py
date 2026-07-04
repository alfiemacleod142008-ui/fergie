import httpx

OVERPASS_URLS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]

_CACHE = {}

GROWABLE = {
    "farmland": "farmland",
    "meadow": "meadow",
    "orchard": "orchard",
    "allotments": "allotments",
    "vineyard": "vineyard",
    "farmyard": "farmyard",
    "greenhouse_horticulture": "horticulture",
    "plant_nursery": "nursery",
    "village_green": "green",
    "recreation_ground": "grass",
    "grass": "grass",
}
BUILT = {
    "residential": "houses",
    "commercial": "commercial buildings",
    "industrial": "industrial land",
    "retail": "shops",
    "construction": "a construction site",
    "railway": "railway land",
    "garages": "garages",
    "military": "military land",
    "landfill": "landfill",
    "quarry": "a quarry",
    "brownfield": "brownfield",
}


def _classify(landuse, natural, leisure):
    if landuse in GROWABLE:
        return {"class": landuse, "label": GROWABLE[landuse], "plantable": True}
    if landuse in BUILT:
        return {"class": landuse, "label": BUILT[landuse], "plantable": False}
    if landuse == "forest" or natural == "wood":
        return {"class": "wood", "label": "woodland", "plantable": False}
    if natural in ("water", "wetland", "bay", "beach") or landuse == "reservoir":
        return {"class": "water", "label": "water", "plantable": False}
    if natural in ("grassland", "scrub", "heath"):
        return {"class": natural, "label": natural, "plantable": True}
    if leisure in ("garden", "allotment"):
        return {"class": leisure, "label": leisure, "plantable": True}
    if leisure in ("park", "pitch", "golf_course"):
        return {"class": leisure, "label": leisure, "plantable": None}
    return {"class": None, "label": None, "plantable": None}


def _from_elements(elements):
    landuse = natural = leisure = None
    for element in elements:
        tags = element.get("tags", {})
        if landuse is None and "landuse" in tags:
            landuse = tags["landuse"]
        if natural is None and "natural" in tags:
            natural = tags["natural"]
        if leisure is None and "leisure" in tags:
            leisure = tags["leisure"]
    return _classify(landuse, natural, leisure)


def get_landuse(lat, lon):
    key = (round(lat, 4), round(lon, 4))
    if key in _CACHE:
        return _CACHE[key]
    query = f"[out:json][timeout:12];is_in({lat},{lon});out tags;"
    last_error = None
    for url in OVERPASS_URLS:
        try:
            response = httpx.post(
                url,
                data={"data": query},
                headers={"User-Agent": "Fergie/1.0 (crop advisor)"},
                timeout=6,
            )
            response.raise_for_status()
            result = _from_elements(response.json().get("elements", []))
            _CACHE[key] = result
            return result
        except Exception as error:
            last_error = error
    raise last_error


if __name__ == "__main__":
    import json

    print(json.dumps(get_landuse(50.9506, -2.86), indent=2))
    print(json.dumps(get_landuse(55.9533, -3.1883), indent=2))
