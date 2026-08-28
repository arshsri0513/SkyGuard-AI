import os
import requests
import pandas as pd
import numpy as np

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
import joblib

# RAINSAFE AI - RAINFALL MODEL TRAINING

LATITUDE = 28.9845
LONGITUDE = 77.7064

START_DATE = "2020-01-01"
END_DATE = "2025-12-31"

DATA_DIR = os.path.join("..", "data")
MODEL_DIR = os.path.dirname(__file__)

os.makedirs(DATA_DIR, exist_ok=True)

# 1. DOWNLOAD HISTORICAL WEATHER DATA

print("\n==========================================")
print("RAINSAFE AI - DATA DOWNLOAD")
print("==========================================")

url = "https://archive-api.open-meteo.com/v1/archive"

params = {
    "latitude": LATITUDE,
    "longitude": LONGITUDE,
    "start_date": START_DATE,
    "end_date": END_DATE,
    "hourly": ",".join([
        "temperature_2m",
        "relative_humidity_2m",
        "surface_pressure",
        "precipitation",
        "wind_speed_10m",
        "cloud_cover"
    ]),
    "timezone": "Asia/Kolkata"
}

print("Downloading historical weather data...")
print(f"Location: {LATITUDE}, {LONGITUDE}")
print(f"Period: {START_DATE} → {END_DATE}")

response = requests.get(url, params=params, timeout=120)
response.raise_for_status()

weather = response.json()

print("Data downloaded successfully.")

# 2. CONVERT RESPONSE TO DATAFRAME

hourly = weather["hourly"]

df = pd.DataFrame(hourly)

df["time"] = pd.to_datetime(df["time"])

df = df.sort_values("time")
df = df.reset_index(drop=True)


print("\nDataset shape:")
print(df.shape)

print("\nColumns:")
print(df.columns.tolist())

# 3. FEATURE ENGINEERING

print("\n==========================================")
print("FEATURE ENGINEERING")
print("==========================================")


# Previous rainfall
df["rain_lag_1"] = df["precipitation"].shift(1)
df["rain_lag_3"] = df["precipitation"].shift(3)
df["rain_lag_6"] = df["precipitation"].shift(6)
df["rain_lag_12"] = df["precipitation"].shift(12)
df["rain_lag_24"] = df["precipitation"].shift(24)


# Rolling rainfall accumulation
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
df["day_of_year"] = df["time"].dt.dayofyear

# 4. CREATE TARGET

# Future 6-hour rainfall accumulation

df["target_6h"] = (
    df["precipitation"]
    .shift(-1)
    .rolling(6)
    .sum()
    .shift(-5)
)


# Remove missing rows
df = df.dropna()

print("Rows after feature engineering:", len(df))

# 5. SELECT FEATURES

features = [
    "temperature_2m",
    "relative_humidity_2m",
    "surface_pressure",
    "wind_speed_10m",
    "cloud_cover",

    "rain_lag_1",
    "rain_lag_3",
    "rain_lag_6",
    "rain_lag_12",
    "rain_lag_24",

    "rain_sum_3h",
    "rain_sum_6h",
    "rain_sum_12h",
    "rain_sum_24h",

    "hour",
    "month",
    "day_of_year"
]

X = df[features]
y = df["target_6h"]

# 6. TIME-BASED TRAIN / TEST SPLIT

# Important:
# We DO NOT randomly shuffle time-series data.

split_index = int(len(df) * 0.8)

X_train = X.iloc[:split_index]
X_test = X.iloc[split_index:]

y_train = y.iloc[:split_index]
y_test = y.iloc[split_index:]


print("\nTraining samples:", len(X_train))
print("Testing samples:", len(X_test))

# 7. TRAIN RANDOM FOREST

print("\n==========================================")
print("TRAINING RANDOM FOREST")
print("==========================================")

model = RandomForestRegressor(
    n_estimators=250,
    max_depth=18,
    min_samples_leaf=2,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)

print("Training completed.")

# 8. EVALUATE MODEL

predictions = model.predict(X_test)

mae = mean_absolute_error(y_test, predictions)

rmse = np.sqrt(
    mean_squared_error(y_test, predictions)
)

r2 = r2_score(y_test, predictions)


print("\n==========================================")
print("MODEL PERFORMANCE")
print("==========================================")

print(f"MAE  : {mae:.3f} mm")
print(f"RMSE : {rmse:.3f} mm")
print(f"R²   : {r2:.3f}")

# 9. FEATURE IMPORTANCE


importance = pd.DataFrame({
    "feature": features,
    "importance": model.feature_importances_
})

importance = importance.sort_values(
    "importance",
    ascending=False
)

print("\nTop features:")

print(
    importance.head(10).to_string(index=False)
)

# 10. SAVE MODEL

model_path = os.path.join(
    MODEL_DIR,
    "rainfall_model.pkl"
)

joblib.dump(
    {
        "model": model,
        "features": features
    },
    model_path
)


# Save test predictions for analysis
results = pd.DataFrame({
    "time": df.iloc[split_index:]["time"],
    "actual_6h_rainfall": y_test.values,
    "predicted_6h_rainfall": predictions
})

results_path = os.path.join(
    DATA_DIR,
    "rainfall_predictions.csv"
)

results.to_csv(
    results_path,
    index=False
)


print("\n==========================================")
print("MODEL SAVED")
print("==========================================")

print(f"Model: {model_path}")
print(f"Results: {results_path}")

print("\nRAINSAFE AI rainfall model ready.")