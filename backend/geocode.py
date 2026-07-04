import httpx

POSTCODES_URL = "https://api.postcodes.io/postcodes/"
GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"


def _from_postcode(text):
    response = httpx.get(POSTCODES_URL + text.replace(" ", ""), timeout=10)
    if response.status_code != 200:
        return None
    result = response.json().get("result")
    if not result:
        return None
    return {
        "name": result["postcode"],
        "region": result.get("admin_district") or result.get("region"),
        "country": result.get("country"),
        "latitude": result["latitude"],
        "longitude": result["longitude"],
    }


def _from_place(text):
    params = {"name": text, "count": 1, "language": "en", "format": "json"}
    response = httpx.get(GEOCODE_URL, params=params, timeout=10)
    response.raise_for_status()
    results = response.json().get("results")
    if not results:
        return None
    place = results[0]
    return {
        "name": place["name"],
        "region": place.get("admin1"),
        "country": place.get("country"),
        "latitude": place["latitude"],
        "longitude": place["longitude"],
    }


def geocode(location):
    query = (location or "").strip()
    found = _from_postcode(query) or _from_place(query)
    if not found:
        short = query if len(query) <= 32 else query[:32] + "…"
        raise ValueError(f'Couldn\'t find "{short}". Check the postcode or place name.')
    return found


if __name__ == "__main__":
    import json
    import sys

    query = sys.argv[1] if len(sys.argv) > 1 else "BA20 1AB"
    print(json.dumps(geocode(query), indent=2))
