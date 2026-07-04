# Fergie

Live at [fergie-rho.vercel.app](https://fergie-rho.vercel.app)

Know when and where to plant. Fergie is a planting adviser for UK growers. Enter a postcode
and a crop, drop a pin on your field, and it pulls real, free data for that exact spot, reasons
over it, and gives you the best planting window and a deep growing outlook. A local language
model sits on top, so you can chat to it about your land and any crop.

Everything runs on your own machine. No paid APIs and no keys for the core.

## What it does

- A **planting window** for the crop, from a fourteen day forecast checked against the crop's
  sowing season, frost sensitivity and minimum temperature.
- A **deep growing analysis** with a suitability score out of 100: soil temperature at 6cm
  against the crop's germination threshold, growing degree days, a rain versus evaporation
  moisture balance, sunshine, wind, frost dates, soil pH and texture, a forward heat warning
  and the single best day to sow.
- A **image intepreter** that anaylyses a users image (crop) and answers their questions to it
  and/or analyses the crop to give vital information and the best plan to action for the
  specific crop.
- A **satellite view** of the pinned field, with a land use check that flags built up spots.
- A **local chat adviser** that answers any farming or growing question, grounded in the plot's
  real data and forecast. It remembers what you tell it about your setup, and it can lay out a
  full planting plan or drop your field's satellite image straight into the conversation.
- **Chat history** with folders, rename and delete, saved in the browser.

## How it works

A FastAPI backend fans out to several free data sources in parallel, each with a timeout and
graceful fallback, then runs deterministic agronomy over the results. A local language model
turns the numbers into plain English and powers the chat. A Next.js front end renders it.

The sources are Open Meteo for the forecast, wind, sunshine, evaporation and soil temperature,
Open Meteo elevation for slope and aspect, postcodes.io and Open Meteo geocoding for the
location, SoilGrids for soil pH and texture, NASA POWER for long term solar, OpenStreetMap
through Overpass for land use, and Esri World Imagery for the satellite tiles.

The planting window, the weather analysis and the land use checks are deterministic Python.
The language model only narrates and answers questions. It never invents the numbers.

## Notes

A fourteen day forecast, a postcode scale location and a language model are decision support,
not a guarantee. Some free sources return the odd blip or a no data point. When that happens
Fergie skips the source and still returns the rest.
