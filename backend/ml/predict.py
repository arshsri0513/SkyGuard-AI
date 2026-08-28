import os
import time
import joblib
import requests
import pandas as pd

# RAINSAFE AI - LIVE ML INFERENCE

LATITUDE = 28.9845
LONGITUDE = 77.7064

MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "rainfall_classifier.pkl"
)

# LOAD TRAINED MODEL

bundle = joblib.load(MODEL_PATH)

model = bundle["model"]
features = bundle["features"]

THRESHOLD_MM = bundle.get(
    "threshold_mm",
    5.0
)

# GET RECENT & FORECAST WEATHER

_WEATHER_CACHE = {}

def get_recent_weather(lat: float = LATITUDE, lon: float = LONGITUDE):

    key = (round(float(lat), 2), round(float(lon), 2))
    now = time.time()

    if key in _WEATHER_CACHE:
        ts, cached_df = _WEATHER_CACHE[key]
        if now - ts < 600:
            return cached_df

    url = "https://api.open-meteo.com/v1/forecast"

    params = {
        "latitude": lat,
        "longitude": lon,

        "hourly": ",".join([
            "temperature_2m",
            "relative_humidity_2m",
            "surface_pressure",
            "precipitation",
            "wind_speed_10m",
            "cloud_cover"
        ]),

        "past_hours": 24,
        "forecast_hours": 48,

        "timezone": "Asia/Kolkata"
    }

    try:
        response = requests.get(
            url,
            params=params,
            timeout=1.5
        )

        response.raise_for_status()

        data = response.json()

        df = pd.DataFrame(
            data["hourly"]
        )
        _WEATHER_CACHE[key] = (now, df)
        return df
    except Exception as e:
        print("Open-Meteo API fetch warning:", e)
        return None


# CREATE FEATURES

def build_features(df):

    df = df.copy()

    df["time"] = pd.to_datetime(
        df["time"]
    )

    # Previous rainfall
    df["rain_lag_1"] = (
        df["precipitation"].shift(1)
    )

    df["rain_lag_3"] = (
        df["precipitation"].shift(3)
    )

    df["rain_lag_6"] = (
        df["precipitation"].shift(6)
    )

    df["rain_lag_12"] = (
        df["precipitation"].shift(12)
    )

    df["rain_lag_24"] = (
        df["precipitation"].shift(24)
    )

    # Rolling rainfall
    df["rain_sum_3h"] = (
        df["precipitation"]
        .rolling(3)
        .sum()
    )

    df["rain_sum_6h"] = (
        df["precipitation"]
        .rolling(6)
        .sum()
    )

    df["rain_sum_12h"] = (
        df["precipitation"]
        .rolling(12)
        .sum()
    )

    df["rain_sum_24h"] = (
        df["precipitation"]
        .rolling(24)
        .sum()
    )

    # Time features
    df["hour"] = df["time"].dt.hour

    df["month"] = df["time"].dt.month

    df["day_of_year"] = (
        df["time"].dt.dayofyear
    )

    df = df.dropna()

    return df

# PREDICT

def predict_rainfall_event(lat: float = LATITUDE, lon: float = LONGITUDE, forecast_peak_mm: float | None = None):

    weather = get_recent_weather(lat=lat, lon=lon)

    if weather is not None and not weather.empty:
        data = build_features(weather)
        if not data.empty:
            latest = data.iloc[-1]
            X = pd.DataFrame(
                [latest[features].values],
                columns=features
            )
            raw_prob = float(model.predict_proba(X)[0][1])
        else:
            raw_prob = 0.15
        
        recent_rain = float(weather["precipitation"].head(24).sum()) if "precipitation" in weather else 0.0
        future_rain = float(weather["precipitation"].tail(24).sum()) if "precipitation" in weather else 0.0
        future_max = float(weather["precipitation"].tail(24).max()) if "precipitation" in weather else 0.0
    else:
        raw_prob = 0.15
        recent_rain = 0.0
        future_rain = 0.0
        future_max = 0.0

    # Combine forecast peak if provided
    effective_peak = max(future_max, (forecast_peak_mm / 6.0) if forecast_peak_mm else 0.0)
    effective_total = max(future_rain, forecast_peak_mm if forecast_peak_mm else 0.0)

    # Dynamic probability scaling strictly based on location precipitation
    base_percent = raw_prob * 100.0

    if effective_total >= 100 or effective_peak >= 15:
        prob = max(75.0, min(98.5, base_percent + 45.0 + (effective_peak * 0.8)))
    elif effective_total >= 50 or effective_peak >= 8:
        prob = max(50.0, min(74.9, base_percent + 25.0 + (effective_peak * 1.5)))
    elif effective_total >= 15 or effective_peak >= 2:
        prob = max(25.0, min(49.9, base_percent + 10.0 + (effective_total * 0.8)))
    else:
        prob = max(2.5, min(24.9, base_percent * 0.6 + (effective_total * 0.5)))

    probability_percent = round(prob, 2)

    if probability_percent >= 75.0:
        risk = "CRITICAL"
    elif probability_percent >= 50.0:
        risk = "HIGH"
    elif probability_percent >= 25.0:
        risk = "MODERATE"
    else:
        risk = "LOW"

    return {
        "latitude": lat,
        "longitude": lon,

        "significant_rain_probability": probability_percent,

        "risk": risk,

        "threshold_mm":
            THRESHOLD_MM,

        "model": "Random Forest Classifier",

        "data_source":
            "Open-Meteo forecast/recent weather"
    }

# TEST

if __name__ == "__main__":

    result = predict_rainfall_event()

    print("\n===================================")
    print("RAINSAFE AI LIVE PREDICTION")
    print("===================================")

    for key, value in result.items():

        print(
            f"{key}: {value}"
        )