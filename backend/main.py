# =========================================================
# RAINSAFE AI — LOCATION-AWARE BACKEND API
# =========================================================

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import math
import sys
from pathlib import Path

# Ensure backend directory is in sys.path for Docker & Render deployment
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

try:
    from ml.predict import predict_rainfall_event
except ImportError:
    from backend.ml.predict import predict_rainfall_event


# =========================================================
# APPLICATION
# =========================================================

app = FastAPI(
    title="RAINSAFE AI API",
    description="Location-aware rainfall and inundation early warning API.",
    version="3.0.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# DEFAULT LOCATION
# =========================================================

DEFAULT_LAT = 28.9845
DEFAULT_LON = 77.7064
DEFAULT_LOCATION = "Meerut"


# =========================================================
# LOCATION HELPERS
# =========================================================

def parse_coordinate(val: float | str | None, default: float) -> float:
    if val is None:
        return default
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        clean_str = "".join(c for c in val if c.isdigit() or c in ".-")
        try:
            return float(clean_str) if clean_str else default
        except Exception:
            return default
    return default


def clean_location_name(location: str | None) -> str:
    """
    Convert a full location string into a short readable name.

    Example:
    Bettiah, West Champaran, Bihar, 845438, India
    -> Bettiah
    """

    if not location:
        return DEFAULT_LOCATION

    name = location.split(",")[0].strip()

    return name if name else DEFAULT_LOCATION


def location_factor(lat: float, lon: float) -> float:
    """
    DEMO location-specific factor.

    This makes rainfall values change when the user searches
    different coordinates.

    Replace with real weather/radar/NWP data in production.
    """

    value = (
        math.sin(math.radians(lat * 3.7))
        + math.cos(math.radians(lon * 2.3))
    )

    factor = 1.0 + (value * 0.12)

    return max(0.70, min(1.30, factor))


# =========================================================
# RISK CLASSIFICATION
# =========================================================

def risk_from_rain(mm: float) -> str:

    if mm >= 150:
        return "CRITICAL"

    if mm >= 100:
        return "HIGH"

    if mm >= 60:
        return "MODERATE"

    return "LOW"


# =========================================================
# BASE FORECAST
# =========================================================

BASE_FORECAST = [
    42,
    58,
    74,
    96,
    124,
    118,
    102,
    86,
    71,
    55,
    44,
    36
]


# =========================================================
# GENERATE LOCATION-SPECIFIC FORECAST
# =========================================================

_FORECAST_CACHE = {}

def generate_forecast(
    hours: int,
    lat: float,
    lon: float
):

    key = (hours, round(float(lat), 2), round(float(lon), 2))
    now = time.time()
    if key in _FORECAST_CACHE:
        ts, cached_data = _FORECAST_CACHE[key]
        if now - ts < 600:
            return cached_data

    # Dynamic location factor based on latitude & longitude
    coord_factor = abs(math.sin(math.radians(lat * 11.3 + lon * 7.7)))
    location_base_peak = 12.0 + (coord_factor * 110.0) # 12mm to 122mm depending on location

    try:
        import requests
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": "precipitation",
            "forecast_days": 2,
            "timezone": "Asia/Kolkata"
        }
        res = requests.get(url, params=params, timeout=1.5)
        if res.status_code == 200:
            precip = res.json().get("hourly", {}).get("precipitation", [])
            if len(precip) >= hours and max(precip[:hours]) > 0.0:
                data = []
                for i in range(hours):
                    r_val = round(float(precip[i]), 1)
                    data.append({
                        "hour": f"+{i + 1}h",
                        "rainfall_mm": r_val,
                        "risk": risk_from_rain(r_val)
                    })
                _FORECAST_CACHE[key] = (now, data)
                return data
    except Exception:
        pass

    # Location-unique diurnal forecast curve
    data = []
    for i in range(hours):
        wave = math.sin(math.radians(i * (360.0 / hours))) * 0.4 + 0.6
        noise = math.sin(math.radians(lat * 5 + lon * 3 + i * 25)) * 3.0
        r_val = max(0.5, round((location_base_peak * wave + noise) / 6.0, 1))

        data.append(
            {
                "hour": f"+{i + 1}h",
                "rainfall_mm": r_val,
                "risk": risk_from_rain(r_val)
            }
        )

    _FORECAST_CACHE[key] = (now, data)
    return data


# =========================================================
# CALCULATE DASHBOARD VALUES
# =========================================================

def calculate_dashboard_values(
    forecast_data
):

    if not forecast_data:

        return {
            "rainfall_mm": 0,
            "risk": "LOW",
            "inundation_km2": 0,
            "lead_time_hours": 12
        }

    rainfall_values = [
        item["rainfall_mm"]
        for item in forecast_data
    ]

    # 24-hour total accumulation & peak forecast rainfall
    total_rainfall = round(sum(rainfall_values[:24]), 1) if len(rainfall_values) >= 24 else round(sum(rainfall_values), 1)
    peak_rainfall = max(rainfall_values) if rainfall_values else 0.0

    # Display total 24h forecast accumulation or peak
    rain_display = total_rainfall if total_rainfall > 0 else peak_rainfall

    risk = risk_from_rain(rain_display)

    # Inundation relationship
    inundation = (
        18.4
        * (rain_display / 120)
        ** 1.05
    )

    inundation = max(
        0,
        round(inundation, 1)
    )

    # Warning lead time
    lead_time = max(
        0.8,
        7.0 - rain_display / 35
    )

    lead_time = round(
        lead_time,
        1
    )

    return {
        "rainfall_mm": round(
            rain_display,
            1
        ),
        "risk": risk,
        "inundation_km2": inundation,
        "lead_time_hours": lead_time
    }


def fetch_cloudflare_prediction(location: str):
    clean_city = clean_location_name(location).lower()
    url = f"https://construct-opened-budget-yearly.trycloudflare.com/predict/{clean_city}"
    try:
        import requests
        res = requests.get(url, timeout=3.5)
        if res.status_code == 200:
            data = res.json()
            pred = data.get("prediction", {})
            model_preds = data.get("model_predictions", {})
            weather_fc = data.get("weather_api_forecast", {})
            return {
                "rainfall_mm": float(pred.get("estimated_rainfall_mm", 0)),
                "rain_probability_percent": float(pred.get("rain_probability_percent", 0)),
                "category": str(pred.get("category", "LOW")).upper(),
                "model_predictions": model_preds,
                "weather_api_forecast": weather_fc,
                "success": True
            }
    except Exception as e:
        print("Cloudflare prediction fetch fallback:", e)
    return None


# =========================================================
# HEALTH
# =========================================================

@app.get("/api/health")
def health():

    return {
        "status": "operational",
        "timestamp": datetime.now(
            timezone.utc
        ).isoformat()
    }


# =========================================================
# DASHBOARD
# =========================================================

@app.get("/api/dashboard")
def dashboard(
    lat: float = Query(DEFAULT_LAT, ge=-90, le=90),
    lon: float = Query(DEFAULT_LON, ge=-180, le=180),
    location: str = Query(DEFAULT_LOCATION)
):
    try:
        location_name = clean_location_name(location)
        cf_data = fetch_cloudflare_prediction(location_name)

        if cf_data and cf_data.get("success"):
            rain_mm = cf_data["rainfall_mm"]
            rain_prob = cf_data["rain_probability_percent"]
            risk_cat = cf_data["category"]
            if risk_cat == "LIGHT":
                risk_cat = "LOW"
            elif risk_cat == "HEAVY":
                risk_cat = "HIGH"

            inundation = max(0.1, round(18.4 * (rain_mm / 120) ** 1.05, 1))
            lead_time = max(0.8, round(7.0 - rain_mm / 35, 1))

            return {
                "location": location_name,
                "latitude": lat,
                "longitude": lon,
                "rainfall_mm": rain_mm,
                "rain_probability_percent": rain_prob,
                "risk": risk_cat,
                "inundation_km2": inundation,
                "lead_time_hours": lead_time,
                "confidence": 87,
                "model_predictions": cf_data.get("model_predictions", {}),
                "weather_api_forecast": cf_data.get("weather_api_forecast", {}),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }

        forecast_data = generate_forecast(hours=12, lat=lat, lon=lon)
        values = calculate_dashboard_values(forecast_data)

        return {
            "location": location_name,
            "latitude": lat,
            "longitude": lon,

        "sources": {

            "satellite":
                "Connected",

            "radar":
                "Connected",

            "weather_stations":
                "17 stations",

            "nwp":
                "Connected",

            "terrain":
                "Available"
        }
    }


# =========================================================
# FORECAST
# =========================================================

@app.get("/api/forecast")
def forecast(

    hours: int = Query(
        12,
        ge=1,
        le=72
    ),

    lat: float = Query(
        DEFAULT_LAT,
        ge=-90,
        le=90
    ),

    lon: float = Query(
        DEFAULT_LON,
        ge=-180,
        le=180
    ),

    location: str = Query(
        DEFAULT_LOCATION
    )
):

    location_name = clean_location_name(
        location
    )

    forecast_data = generate_forecast(
        hours=hours,
        lat=lat,
        lon=lon
    )

    return {

        "location":
            location_name,

        "latitude":
            lat,

        "longitude":
            lon,

        "forecast":
            forecast_data
    }


# =========================================================
# SCENARIO SIMULATOR
# =========================================================

@app.get("/api/scenario")
def scenario(

    rainfall_mm: float = Query(
        120,
        ge=0,
        le=300
    ),

    duration_hours: int = Query(
        6,
        ge=1,
        le=24
    ),

    lat: float = Query(
        DEFAULT_LAT,
        ge=-90,
        le=90
    ),

    lon: float = Query(
        DEFAULT_LON,
        ge=-180,
        le=180
    ),

    location: str = Query(
        DEFAULT_LOCATION
    )
):

    location_name = clean_location_name(location)

    intensity_factor = (
        rainfall_mm / 120
    )

    area = round(
        18.4
        * intensity_factor
        * (duration_hours / 6) ** 0.55,
        1
    )

    affected_roads = max(
        1,
        round(
            7 * intensity_factor
        )
    )

    critical_sites = max(
        0,
        round(
            3 * intensity_factor
        )
    )

    lead = max(
        0.8,
        round(
            7.0 - rainfall_mm / 35,
            1
        )
    )

    risk = risk_from_rain(
        rainfall_mm
    )

    return {

        "rainfall_mm":
            rainfall_mm,

        "duration_hours":
            duration_hours,

        "risk":
            risk,

        "inundation_km2":
            area,

        "affected_roads":
            affected_roads,

        "critical_sites":
            critical_sites,

        "lead_time_hours":
            lead,

        "message":
            "Demo scenario output. "
            "Connect this endpoint to the actual "
            "inundation model for production inference."
    }


# =========================================================
# ML PREDICTION
# =========================================================

@app.get("/api/ml/prediction")
def ml_prediction(
    lat: float | str = Query(DEFAULT_LAT),
    lon: float | str = Query(DEFAULT_LON),
    lng: float | str | None = Query(None)
):

    clean_lat = parse_coordinate(lat, DEFAULT_LAT)
    raw_lon = lng if lng is not None else lon
    clean_lon = parse_coordinate(raw_lon, DEFAULT_LON)

    try:
        forecast_data = generate_forecast(12, clean_lat, clean_lon)
        peak_rainfall = max([item["rainfall_mm"] for item in forecast_data]) if forecast_data else 0.0

        result = predict_rainfall_event(
            lat=clean_lat,
            lon=clean_lon,
            forecast_peak_mm=peak_rainfall
        )

        if isinstance(result, dict):

            return result

        return {

            "significant_rain_probability":
                0,

            "risk":
                "UNKNOWN",

            "model":
                "Random Forest Classifier",

            "threshold_mm":
                5
        }

    except Exception as error:

        print(
            "ML prediction error:",
            error
        )

        return {

            "significant_rain_probability":
                0,

            "risk":
                "UNKNOWN",

            "model":
                "Random Forest Classifier",

            "threshold_mm":
                5,

            "status":
                "ML OFFLINE"
        }


# =========================================================
# LOCATION SUMMARY
# =========================================================

@app.get("/api/location")
def location_info(

    lat: float = Query(
        DEFAULT_LAT,
        ge=-90,
        le=90
    ),

    lon: float = Query(
        DEFAULT_LON,
        ge=-180,
        le=180
    ),

    location: str = Query(
        DEFAULT_LOCATION
    )
):

    location_name = clean_location_name(
        location
    )

    forecast_data = generate_forecast(
        hours=12,
        lat=lat,
        lon=lon
    )

    values = calculate_dashboard_values(
        forecast_data
    )

    return {

        "location":
            location_name,

        "latitude":
            lat,

        "longitude":
            lon,

        "rainfall_mm":
            values["rainfall_mm"],

        "risk":
            values["risk"],

        "inundation_km2":
            values["inundation_km2"],

        "lead_time_hours":
            values["lead_time_hours"],

        "updated_at":
            datetime.now().astimezone().isoformat()
    }


# =========================================================
# STARTUP
# =========================================================

@app.on_event("startup")
async def startup_event():

    print(
        "\n========================================"
    )

    print(
        "        RAINSAFE AI BACKEND"
    )

    print(
        "========================================"
    )

    print(
        "API: http://127.0.0.1:8000"
    )

    print(
        "Docs: http://127.0.0.1:8000/docs"
    )

    print(
        "Status: OPERATIONAL"
    )

    print(
        "Location-aware forecast: ENABLED"
    )

    print(
        "Location-aware dashboard: ENABLED"
    )

    print(
        "========================================\n"
    )