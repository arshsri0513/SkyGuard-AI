
# RAINSAFE AI — SIH 2026 Finalist Starter

A polished command-center style frontend + FastAPI backend for an AI/ML-based integrated heavy rainfall early warning and inundation prediction system.

## 1. Run backend

Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

API: http://127.0.0.1:8000
Swagger: http://127.0.0.1:8000/docs

## 2. Run frontend

Simplest option: open `frontend/index.html` in your browser.

For a local server:

```powershell
cd frontend
python -m http.server 5500
```

Then open http://127.0.0.1:5500

The frontend uses Leaflet and Chart.js from CDN, so internet access is required for the map/chart libraries.

## 3. Important before SIH

This is a presentation-ready product shell and demo API. Replace the demo endpoint logic with your actual:
- satellite ingestion
- radar ingestion
- observational weather data
- NWP data
- trained rainfall model
- inundation model
- actual metrics
- real geospatial layers

Do NOT present demo metrics as measured model results.

## Suggested SIH demo

1. Open Command Center.
2. Explain the map first.
3. Show rainfall → risk → inundation → lead time.
4. Open Data Fusion.
5. Open Model Intelligence.
6. Trigger Scenario Simulator and move rainfall from 120 mm to 180 mm.
7. Explain that production inference is connected to the same API boundary.

## UI concept

The interface intentionally avoids generic "AI project" styling and instead resembles a weather/disaster-management command center.
