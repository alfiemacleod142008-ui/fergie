# Fergie

Know when and where to plant. Fergie is a crop-planting adviser for UK growers: enter a
postcode and a crop, drop a pin on your field, and it pulls real, free data for that exact
spot, reasons over it, and tells you the best planting window and a deep growing outlook.
It runs a local language model on top, so you can chat to it about your land and any crop.

Everything runs locally. No paid APIs, no keys required for the core, no rate limits.

## What it does

- **Planting window** for the crop, from a seven-day forecast checked against the crop's
  sowing season, frost sensitivity and minimum temperature.
- **Deep growing analysis** with a suitability score out of 100: soil temperature at 6cm
  versus the crop's germination threshold, growing degree days, a rain-versus-evaporation
  moisture balance, sunshine hours, wind, frost dates, soil pH and texture, and the single
  best day to sow.
- **Satellite view** of the pinned field, with a land-use check that flags built-up spots.
- **A local chat adviser** that answers any farming or growing question, grounded in the
  plot's real data. Ask about another crop and the panel updates in the conversation.
- **Chat history** with folders, rename and delete, saved in the browser.

## How it works

A FastAPI backend fans out to several free data sources in parallel, each with a timeout and
graceful fallback, then runs deterministic agronomy over the results. A local Ollama model
turns the numbers into plain English and powers the chat. A Next.js front end renders it.

| Source | Used for |
|---|---|
| Open-Meteo forecast | temperature, rain, wind, sunshine, evapotranspiration, soil temperature |
| Open-Meteo elevation | slope, aspect, drainage |
| postcodes.io / Open-Meteo geocoding | postcode and place lookup |
| SoilGrids (ISRIC) | soil pH and texture |
| NASA POWER | long-term solar and climate |
| OpenStreetMap (Overpass) | land use, to detect built-up locations |
| Esri World Imagery | satellite tiles |
| Ollama (local) | summaries and chat |

The planting window, weather analysis and land-use checks are deterministic Python. The
language model only narrates and answers questions; it never invents the numbers.

## Running it

Prerequisites: Python 3.11, Node 20+, and [Ollama](https://ollama.com).

**Model**

```bash
ollama pull qwen2.5:7b
```

**Backend**

```bash
cd backend
python3.11 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --reload
```

The API runs at `http://localhost:8000` (docs at `/docs`).

**Front end**

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Configuration

Copy `backend/.env.example` to `backend/.env`. Everything works out of the box; the variables
are optional:

- `OLLAMA_MODEL` — which local model to use (default `qwen2.5:7b`).
- `OLLAMA_URL` — the Ollama endpoint (default `http://localhost:11434`).
- `CDSE_CLIENT_ID` / `CDSE_CLIENT_SECRET` — a free Copernicus account for Sentinel-2 NDVI.

## Notes

A seven-day forecast, a postcode-scale location and a language model are decision support,
not a guarantee. Some free sources return the odd blip or no-data point; when that happens
Fergie skips the source and still returns the rest.
