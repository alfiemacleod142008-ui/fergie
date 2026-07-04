import datetime
import os

import httpx

TOKEN_URL = (
    "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
)
STATS_URL = "https://sh.dataspace.copernicus.eu/api/v1/statistics"

EVALSCRIPT = """//VERSION=3
function setup() {
  return {
    input: [{bands: ["B04", "B08", "SCL", "dataMask"]}],
    output: [{id: "ndvi", bands: 1}, {id: "dataMask", bands: 1}],
  };
}
function evaluatePixel(s) {
  let ndvi = (s.B08 - s.B04) / (s.B08 + s.B04);
  let clear = [3, 8, 9, 10].includes(s.SCL) ? 0 : 1;
  return {ndvi: [ndvi], dataMask: [s.dataMask * clear]};
}
"""


def _token(client_id, client_secret):
    response = httpx.post(
        TOKEN_URL,
        data={
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
        },
        timeout=20,
    )
    response.raise_for_status()
    return response.json()["access_token"]


def get_ndvi(lat, lon):
    client_id = os.getenv("CDSE_CLIENT_ID")
    client_secret = os.getenv("CDSE_CLIENT_SECRET")
    if not (client_id and client_secret):
        return {
            "available": False,
            "reason": "no Copernicus credentials (set CDSE_CLIENT_ID / CDSE_CLIENT_SECRET)",
        }
    try:
        d = 0.002
        end = datetime.date.today()
        start = end - datetime.timedelta(days=60)
        token = _token(client_id, client_secret)
        body = {
            "input": {
                "bounds": {
                    "bbox": [lon - d, lat - d, lon + d, lat + d],
                    "properties": {"crs": "http://www.opengis.net/def/crs/EPSG/0/4326"},
                },
                "data": [{"type": "sentinel-2-l2a", "dataFilter": {"mosaickingOrder": "leastCC"}}],
            },
            "aggregation": {
                "timeRange": {"from": f"{start}T00:00:00Z", "to": f"{end}T23:59:59Z"},
                "aggregationInterval": {"of": "P60D"},
                "evalscript": EVALSCRIPT,
                "resx": 10,
                "resy": 10,
            },
            "calculations": {"ndvi": {}},
        }
        response = httpx.post(
            STATS_URL, json=body, headers={"Authorization": f"Bearer {token}"}, timeout=60
        )
        response.raise_for_status()
        intervals = response.json()["data"]
        mean = intervals[-1]["outputs"]["ndvi"]["bands"]["B0"]["stats"]["mean"]
        return {
            "available": True,
            "ndvi_mean": round(mean, 3),
            "note": "0 = bare soil, 0.2-0.4 grass, >0.6 dense vegetation",
        }
    except Exception as error:
        return {"available": False, "reason": f"NDVI fetch failed: {error}"}


if __name__ == "__main__":
    import json

    from dotenv import load_dotenv

    load_dotenv()
    print(json.dumps(get_ndvi(50.94159, -2.63211), indent=2))
