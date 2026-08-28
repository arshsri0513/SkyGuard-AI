import os
import requests
import pandas as pd
import numpy as np
import joblib

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score,
    average_precision_score
)

# RAINSAFE AI
# Significant Rainfall Early-Warning Classifier

LATITUDE = 28.9845
LONGITUDE = 77.7064

START_DATE = "2020-01-01"
END_DATE = "2025-12-31"

MODEL_DIR = os.path.dirname(__file__)

# 1. DOWNLOAD WEATHER DATA

print("\n==========================================")
print("RAINSAFE AI - RAINFALL EVENT CLASSIFIER")
print("==========================================")

print("Downloading historical weather data...")

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

response = requests.get(
    url,
    params=params,
    timeout=120
)

response.raise_for_status()

weather = response.json()

df = pd.DataFrame(weather["hourly"])

df["time"] = pd.to_datetime(df["time"])

df = df.sort_values("time")
df = df.reset_index(drop=True)

print("Downloaded rows:", len(df))

# 2. FEATURE ENGINEERING

print("\nCreating features...")


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

# 3. FUTURE 6-HOUR RAINFALL

df["future_6h_rainfall"] = (
    df["precipitation"]
    .shift(-1)
    .rolling(6)
    .sum()
    .shift(-5)
)


# Remove incomplete rows
df = df.dropna()

# 4. CREATE CLASSIFICATION TARGET

# Significant rainfall event:
# 5 mm or more during the next 6 hours

df["rain_event"] = (
    df["future_6h_rainfall"] >= 5.0
).astype(int)


print("\n==========================================")
print("CLASS DISTRIBUTION")
print("==========================================")

counts = df["rain_event"].value_counts()

print("No significant rainfall:", counts.get(0, 0))
print("Significant rainfall:", counts.get(1, 0))

print(
    "Event percentage:",
    round(df["rain_event"].mean() * 100, 2),
    "%"
)

# 5. FEATURES

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
y = df["rain_event"]

# 6. TIME-BASED TRAIN / TEST SPLIT

# Do NOT shuffle time-series data.

split_index = int(len(df) * 0.8)

X_train = X.iloc[:split_index]
X_test = X.iloc[split_index:]

y_train = y.iloc[:split_index]
y_test = y.iloc[split_index:]


print("\nTraining samples:", len(X_train))
print("Testing samples :", len(X_test))


# 7. TRAIN CLASSIFIER


print("\n==========================================")
print("TRAINING CLASSIFIER")
print("==========================================")

model = RandomForestClassifier(
    n_estimators=300,
    max_depth=18,
    min_samples_leaf=2,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)

print("Training completed.")


# 8. PREDICTIONS

predicted_class = model.predict(X_test)

predicted_probability = model.predict_proba(
    X_test
)[:, 1]


# 9. EVALUATION

print("\n==========================================")
print("MODEL EVALUATION")
print("==========================================")

print(
    classification_report(
        y_test,
        predicted_class,
        target_names=[
            "No Significant Rain",
            "Significant Rain"
        ],
        zero_division=0
    )
)


print("Confusion Matrix:")
print(
    confusion_matrix(
        y_test,
        predicted_class
    )
)


# ROC-AUC
if len(np.unique(y_test)) == 2:

    roc_auc = roc_auc_score(
        y_test,
        predicted_probability
    )

    pr_auc = average_precision_score(
        y_test,
        predicted_probability
    )

    print(
        f"\nROC-AUC: {roc_auc:.3f}"
    )

    print(
        f"PR-AUC : {pr_auc:.3f}"
    )


# 10. FEATURE IMPORTANCE

importance = pd.DataFrame({
    "feature": features,
    "importance": model.feature_importances_
})

importance = importance.sort_values(
    "importance",
    ascending=False
)


print("\n==========================================")
print("TOP PREDICTIVE FEATURES")
print("==========================================")

print(
    importance.head(10).to_string(
        index=False
    )
)

# 11. SAVE MODEL

model_path = os.path.join(
    MODEL_DIR,
    "rainfall_classifier.pkl"
)

joblib.dump(
    {
        "model": model,
        "features": features,
        "threshold_mm": 5.0
    },
    model_path
)


print("\n==========================================")
print("CLASSIFIER SAVED")
print("==========================================")

print(
    f"Model: {model_path}"
)

print(
    "\nRAINSAFE AI rainfall event classifier ready."
)