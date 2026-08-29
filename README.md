# 🌩️ SkyGuard AI — Integrated Heavy Rainfall & Inundation Early Warning Platform
> **Smart India Hackathon (SIH) 2026** • Problem Statement: AI/ML Heavy Rainfall & Inundation Disaster Intelligence

[![Live Demo](https://img.shields.io/badge/Vercel-Live_Frontend-000000?style=for-the-badge&logo=vercel)](https://rainsafe-ai-sih2026.vercel.app)
[![Cloud Backend](https://img.shields.io/badge/Render-Live_API-46E3B7?style=for-the-badge&logo=render)](https://rainsafe-ai-sih2026.onrender.com)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100.0-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)

---

## 🌐 Live Production Links

- **🚀 Vercel Global Frontend**: [https://rainsafe-ai-sih2026.vercel.app](https://rainsafe-ai-sih2026.vercel.app)
- **🟣 Render Cloud Full-Stack & API**: [https://rainsafe-ai-sih2026.onrender.com](https://rainsafe-ai-sih2026.onrender.com)
- **📡 API Telemetry Endpoint**: [https://rainsafe-ai-sih2026.onrender.com/api/dashboard](https://rainsafe-ai-sih2026.onrender.com/api/dashboard)

---

## ✨ Executive Features

1. **🤖 Conversational Multi-City AI Assistant**: Natural language Q&A engine dynamically parsing city telemetry (*Kolkata, Patna, Motihari, Deoghar, Meerut, etc.*) with 1-click interactive map flight controls.
2. **🏔️ 3D Digital Twin GIS Elevation Profile**: Standalone DEM 30m terrain cross-section visualizer calculating slope gradients (3.4°) and water surge levels.
3. **🚁 4K UAV Drone Reconnaissance Patrol**: Real-time infrastructure damage scan (Bridges, Power Substations, Highways) with automated NDMA PDF report generation.
4. **🧭 NDRF Evacuation Pathfinder Corridors**: Dynamic GPS route dispatch to emergency relief shelters and sports complexes.
5. **🇮🇳 Dual-Language & Voice Early Warning**: Native English/हिन्दी switcher with Web Speech AI speech synthesis advisories.
6. **📊 ML Ensemble Intelligence Engine**: Trained Random Forest and LightGBM models operating at **0.904 ROC-AUC** with 121ms low latency.
7. **🚨 Emergency Escalation Desk**: Instant dispatch to NDRF HQ (1078) & State Emergency Relief Cell (1070).

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: HTML5, CSS3 Glassmorphism, JavaScript ES6+, Leaflet GIS, Three.js 3D Engine, Chart.js.
- **Backend API**: Python 3.11, FastAPI, Uvicorn Async Server, Joblib ML Pipeline.
- **Machine Learning**: Random Forest Classifier, LightGBM, XGBoost, Scikit-Learn.
- **Deployment**: Vercel CDN (Frontend), Render (Cloud Docker Instance), GitHub Actions.

---

## 💻 Local Setup & Installation

### 1. Clone Repository
```bash
git clone https://github.com/arshsri0513/rainsafe-ai-sih2026.git
cd rainsafe-ai-sih2026
```

### 2. Start Backend API
```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Launch Frontend
```powershell
cd frontend
python -m http.server 5500
```
Open `http://127.0.0.1:5500` in your browser!

---

## 🏆 Smart India Hackathon 2026 Presentation Protocol

1. Open **Command Center** and demonstrate real-time location telemetry.
2. Open **🤖 AI Assistant** and type `"for Motihari"` to trigger live ML prediction and fly map to location.
3. Open **Inundation Risk** view to showcase the 3D DEM Elevation Profile.
4. Open **🚁 Drone Patrol** and click **📋 Export Drone Reconnaissance Report** to download printable PDF.
5. Demonstrate **🔊 Voice Advisory** in both English and हिन्दी.
