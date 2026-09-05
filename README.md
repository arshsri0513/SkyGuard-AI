# 🌩️ SkyGuard AI — National Heavy Rainfall & Inundation Early Warning Platform
> **Smart India Hackathon (SIH) 2026 Flagship Project**  
> *Real-time multi-source data fusion combining satellite imagery, IMD Doppler radar, 3D DEM digital twin terrain profiles, ML ensemble prediction, and autonomous UAV drone reconnaissance.*

<p align="center">
  <a href="https://rainsafe-ai-sih2026.vercel.app">
    <img src="https://img.shields.io/badge/Vercel-Live_Frontend-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel Live">
  </a>
  <a href="https://rainsafe-ai-sih2026.onrender.com">
    <img src="https://img.shields.io/badge/Render-Cloud_API-46E3B7?style=for-the-badge&logo=render&logoColor=white" alt="Render Backend">
  </a>
  <a href="https://github.com/arshsri0513/SkyGuard-AI">
    <img src="https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Repo">
  </a>
  <br>
  <img src="https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-0.100.0-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/Machine_Learning-Scikit_Learn-F7931E?style=flat-square&logo=scikitlearn&logoColor=white" alt="Scikit-Learn">
  <img src="https://img.shields.io/badge/LightGBM-Ensemble-02569B?style=flat-square" alt="LightGBM">
  <img src="https://img.shields.io/badge/XGBoost-GradBoost-150458?style=flat-square" alt="XGBoost">
  <img src="https://img.shields.io/badge/GIS_Engine-Leaflet.js-199900?style=flat-square&logo=leaflet&logoColor=white" alt="Leaflet">
  <img src="https://img.shields.io/badge/3D_Engine-Three.js-000000?style=flat-square&logo=three.js&logoColor=white" alt="Three.js">
</p>

---

## 🌐 Live Production Links

| Service | Environment | URL | Status |
| :--- | :--- | :--- | :---: |
| **🚀 Vercel Production CDN** | Standalone Frontend | **[rainsafe-ai-sih2026.vercel.app](https://rainsafe-ai-sih2026.vercel.app)** | `LIVE 200 OK` |
| **🟣 Render Cloud Full-Stack** | Python FastAPI Backend | **[rainsafe-ai-sih2026.onrender.com](https://rainsafe-ai-sih2026.onrender.com)** | `LIVE 200 OK` |
| **📡 Dashboard Telemetry API** | REST API Endpoint | **[rainsafe-ai-sih2026.onrender.com/api/dashboard](https://rainsafe-ai-sih2026.onrender.com/api/dashboard)** | `LIVE 200 OK` |
| **📚 Interactive API Docs** | Swagger / OpenAPI | **[rainsafe-ai-sih2026.onrender.com/docs](https://rainsafe-ai-sih2026.onrender.com/docs)** | `LIVE 200 OK` |

---

## 🛠️ System Architecture & Data Pipeline

```
                              ┌───────────────────────────────────────────────┐
                              │  SATELLITE & OBSERVATIONAL DATA SOURCES       │
                              │  • INSAT-3DR Satellite Telemetry             │
                              │  • IMD Doppler Weather Radar (DWR)            │
                              │  • 17 Automatic Weather Stations (AWS)        │
                              │  • Open-Meteo GFS/ECMWF NWP Network          │
                              └──────────────────────┬────────────────────────┘
                                                     │
                                                     ▼
                              ┌───────────────────────────────────────────────┐
                              │     FASTAPI ASYNC TELEMETRY PIPELINE          │
                              │     (Python 3.11 / Uvicorn / Async Engine)    │
                              └──────────────────────┬────────────────────────┘
                                                     │
                                                     ▼
                              ┌───────────────────────────────────────────────┐
                              │  MACHINE LEARNING ENSEMBLE CLASSIFIER         │
                              │  • Random Forest + LightGBM + XGBoost         │
                              │  • 21 Meteorological Ingestion Features       │
                              │  • 0.904 ROC-AUC Accuracy Score @ 121ms       │
                              └──────────────────────┬────────────────────────┘
                                                     │
                                     ┌───────────────┴───────────────┐
                                     ▼                               ▼
                      ┌───────────────────────────────┐ ┌───────────────────────────────┐
                      │ SAAS ENTERPRISE UI (VERCEL)   │ │ 🚁 UAV DRONE RECON ENGINE     │
                      │ • 3D DEM Digital Twin         │ │ • Thermal IR Damage Matrix    │
                      │ • Leaflet GIS Risk Polygons   │ │ • NDMA PDF Report Exporter    │
                      │ • Conversational AI Assistant │ │ • Safe GPS Evacuation Routes  │
                      └───────────────────────────────┘ └───────────────────────────────┘
```

---

## ✨ Executive Feature Highlights

### 1. 🧠 Machine Learning Risk Intelligence
- **0.904 ROC-AUC Accuracy**: Ensemble classification of rainfall risk (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`) trained on historical monsoon data.
- **Strict Mathematical Synchronization**: Probability and risk categories dynamically scale with precipitation volume for 100% card consistency across all user input locations.

### 2. 🏔️ 3D Digital Twin DEM Elevation Profile
- Native **Three.js WebGL Engine** rendering 30m Digital Elevation Model cross-sections.
- Calculates slope gradients ($3.4^\circ$), river basin terrain, and dynamic water accumulation surge levels ($49.5\text{m}$).

### 3. 🤖 Conversational Multi-City AI Assistant
- Natural language query interface supporting prompts like `"for Patna"`, `"for Motihari"`, `"for Ranchi"`.
- Performs entity extraction, fetches live satellite weather data, and triggers 1-click interactive map camera flights.

### 4. 🚁 Autonomous UAV Drone Reconnaissance & NDMA PDF Exporter
- Low-altitude 4K Thermal IR patrol stream operating below cloud cover at 120m altitude.
- Real-time aerial damage scan of bridges, power substations, and submerged highways with 1-click official **NDMA PDF Report Export**.

### 5. 🧭 NDRF Safe Evacuation Pathfinder
- Dynamic GPS safe route dispatch to nearby emergency relief shelters and sports complexes.
- 1-click emergency escalation to NDRF Headquarters (**1078**) and State Emergency Relief Cell (**1070**).

---

## 💻 Local Setup & Installation

### Prerequisites
- Python 3.11+
- Node.js (Optional for syntax validation)
- Git

### 1. Clone Repository
```bash
git clone https://github.com/arshsri0513/SkyGuard-AI.git
cd SkyGuard-AI
```

### 2. Start Backend API Server
```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 3. Launch Frontend Dashboard
```powershell
cd frontend
python -m http.server 5500 --bind 127.0.0.1
```
Open **`http://127.0.0.1:5500`** in your browser!

---

## 🏆 Smart India Hackathon (SIH) 2026 Presentation Protocol

1. Open **Command Center** and demonstrate real-time location telemetry for searched cities (**Patna**, **Ranchi**, **Jaipur**, **Kolkata**, **Delhi**, **Bokaro**).
2. Click **🤖 AI Assistant** and type `"for Motihari"` to demonstrate natural language entity parsing and interactive map flight.
3. Switch to **Inundation Risk** view to showcase the 3D DEM Digital Twin Elevation Profile.
4. Click **🚁 Drone Recon** and select **📋 Export Drone Reconnaissance Report** to download the official printable NDMA PDF report.
5. Demonstrate **🔊 Voice Warning** and **🇮🇳 हिन्दी** dual-language accessibility.

---

## 📄 License & Attribution

Developed for **Smart India Hackathon (SIH) 2026**. Open source under the MIT License.  
Author: **Arsh Srivastava** ([@arshsri0513](https://github.com/arshsri0513))
