import asyncio

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from analysis import analyse_weather
from geocode import geocode
from landuse import get_landuse
from llm import chat, identify, remember, summarise
from ndvi import get_ndvi
from planting import find_planting_window
from resolve import resolve
from satellite import get_satellite
from soil import get_soil
from terrain import analyse_field, get_terrain
from weather import get_weather

load_dotenv()

app = FastAPI(title="Fergie")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SOURCE_TIMEOUT = 7


async def _run(function, *args, timeout=SOURCE_TIMEOUT):
    try:
        result = await asyncio.wait_for(asyncio.to_thread(function, *args), timeout)
        return result, None
    except asyncio.TimeoutError:
        return None, f"timed out after {timeout}s"
    except Exception as error:
        return None, str(error)


def _conditions(place, weather, terrain, satellite):
    summary = {"place": place.get("name"), "region": place.get("region")}
    if weather:
        summary["temp_low"] = round(min(day["temp_min"] for day in weather))
        summary["temp_high"] = round(max(day["temp_max"] for day in weather))
        summary["rain_mm"] = round(sum(day["rainfall_mm"] for day in weather), 1)
        summary["frost_nights"] = sum(1 for day in weather if day["frost"])
    if terrain:
        summary["elevation_m"] = terrain["elevation_m"]
        summary["aspect"] = terrain["aspect"]
        summary["slope_degrees"] = terrain["slope_degrees"]
    if satellite:
        summary["sun_level"] = satellite.get("sun_level")
        summary["solar_kwh"] = satellite.get("avg_solar_kwh_m2_day")
    return summary


@app.get("/geocode")
async def geocode_place(location: str):
    place, place_error = await _run(geocode, location)
    if place is None:
        return {"error": place_error or "could not find that location"}
    return place


@app.get("/landuse")
async def landuse(lat: float, lon: float):
    result, error = await _run(get_landuse, lat, lon)
    if result is None:
        return {"class": None, "label": None, "plantable": None, "error": error}
    return result


@app.get("/field")
async def field_view(lat: float, lon: float):
    result, error = await _run(analyse_field, lat, lon)
    if result is None:
        return {"image_url": None, "error": error}
    return result


@app.post("/summary")
async def summary(advice: dict):
    text, error = await _run(summarise, advice, timeout=20)
    return {"summary": text, "error": error}


@app.post("/chat")
async def chat_reply(payload: dict):
    weather = None
    lat, lon = payload.get("lat"), payload.get("lon")
    if lat is not None and lon is not None:
        weather, _ = await _run(get_weather, lat, lon, timeout=8)
    reply, error = await _run(
        chat,
        payload.get("advice") or {},
        payload.get("messages") or [],
        payload.get("memory") or [],
        weather,
        timeout=60,
    )
    return {"reply": reply, "error": error}


@app.post("/remember")
async def remember_facts(payload: dict):
    facts, _ = await _run(remember, payload.get("messages") or [], timeout=20)
    return {"facts": facts or []}


@app.post("/identify")
async def identify_plant(payload: dict):
    reply, error = await _run(identify, payload.get("image"), payload.get("note"), timeout=90)
    return {"reply": reply, "error": error}


@app.get("/resolve")
async def resolve_crop_text(text: str, local: bool = False):
    info, _ = await _run(resolve, text, local, timeout=15)
    return {"crop": info["name"] if info else None, "info": info}


@app.get("/advice")
async def advice(location: str, crop: str, lat: float | None = None, lon: float | None = None):
    place, place_error = await _run(geocode, location)
    if place is None:
        return {"error": place_error or "could not find that location"}
    alat = lat if lat is not None else place["latitude"]
    alon = lon if lon is not None else place["longitude"]

    (
        (crop_info, _),
        (weather, weather_error),
        (terrain, terrain_error),
        (soil, soil_error),
        (satellite, satellite_error),
        (vegetation, _v),
        (field, _field_error),
    ) = await asyncio.gather(
        _run(resolve, crop),
        _run(get_weather, alat, alon),
        _run(get_terrain, alat, alon),
        _run(get_soil, alat, alon),
        _run(get_satellite, alat, alon),
        _run(get_ndvi, alat, alon),
        _run(analyse_field, alat, alon),
    )

    week = weather[:7] if weather else weather
    if crop and crop_info is None:
        planting = {
            "crop": crop,
            "best_window": None,
            "reasoning": f"I couldn't recognise \"{crop}\" as a crop. Try a common vegetable, fruit, herb or cereal.",
            "days": [],
        }
    else:
        planting = find_planting_window(week, crop_info) if weather else None
    analysis = analyse_weather(weather, terrain, satellite, soil, crop_info)
    conditions = _conditions(place, week, terrain, satellite)
    place = {**place, "latitude": alat, "longitude": alon}

    warnings = {
        source: message
        for source, message in {
            "weather": weather_error,
            "terrain": terrain_error,
            "soil": soil_error,
            "satellite": satellite_error,
        }.items()
        if message
    }

    return {
        "location": place,
        "crop": crop_info["name"] if crop_info else crop,
        "planting_window": planting,
        "analysis": analysis,
        "field": field,
        "conditions": conditions,
        "data": {
            "weather": weather,
            "terrain": terrain,
            "soil": soil,
            "satellite": satellite,
            "vegetation": vegetation,
        },
        "warnings": warnings,
    }
