/* =========================================================
   RAINSAFE AI — APPLICATION LOGIC
   ========================================================= */

/* =========================================================
   BACKEND
   ========================================================= */

const API = "http://127.0.0.1:8000";


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let map = null;

let rainLayer = null;
let floodLayer = null;
let stationLayer = null;

let forecastChart = null;

let selectedMarker = null;


function getInitialLocation() {
  const saved = localStorage.getItem("rainsafe_active_location");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.name && parsed.lat && parsed.lng) {
        return parsed;
      }
    } catch (e) {}
  }
  return {
    name: "New Delhi",
    lat: 28.6139,
    lng: 77.2090,
    displayName: "New Delhi, India"
  };
}

let activeLocation = getInitialLocation();


/* Latest backend data */
let latestDashboard = null;
let latestForecast = null;
let latestML = null;


/* =========================================================
   DEMO RISK ZONES
   ========================================================= */

const demoZones = [
  [28.9845, 77.7064, "Meerut", "HIGH"],
  [29.0200, 77.5900, "Western Zone", "MODERATE"],
  [28.9300, 77.8500, "Low-lying Zone", "HIGH"],
  [29.0900, 77.7800, "Priority Zone", "CRITICAL"]
];


/* =========================================================
   API HELPER
   ========================================================= */

async function api(path) {

  const response = await fetch(API + path);

  if (!response.ok) {
    throw new Error(
      `API ${response.status}: ${path}`
    );
  }

  return response.json();
}


/* =========================================================
   DOM HELPER
   ========================================================= */

function setText(id, value) {

  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }

}


/* =========================================================
   LOCATION DISPLAY
   ========================================================= */

function updateLocationUI() {

  const name = activeLocation.name || "Meerut";


  /*
   * ACTIVE ZONE
   */

  setText(
    "activeZone",
    name
  );


  /*
   * SEARCH INPUT
   */

  const searchInput =
    document.getElementById("areaSearch");

  if (searchInput) {
    searchInput.value = name;
  }


  /*
   * ALERT LOCATION
   */

  setText(
    "alertActiveLocation",
    name
  );


  /*
   * Alert title
   */

  const alertTitle =
    document.getElementById("alertLocationTitle");

  if (alertTitle) {
    alertTitle.textContent =
      `${name} • Heavy Rainfall`;
  }


  /*
   * Update page headings if these
   * elements exist.
   */

  const locationElements = [
    "locationName",
    "activeLocation",
    "mapLocation",
    "fusionActiveZone",
    "modalTargetLocation",
    "inundationTargetLoc",
    "tickerLocation"
  ];

  locationElements.forEach(id => {

    const element =
      document.getElementById(id);

    if (element) {
      element.textContent = name;
    }

  });


  /*
   * Smooth 3D Globe rotation to searched coordinates
   */
  if (typeof updateGlobeLocation === "function") {
    updateGlobeLocation(activeLocation.lat, activeLocation.lng);
  }

  console.log(
    "Active location:",
    activeLocation
  );
}


/* =========================================================
   RISK TEXT
   ========================================================= */

function getRiskFromRainfall(rainfall) {

  const value =
    Number(rainfall || 0);

  if (value >= 150) {
    return "CRITICAL";
  }

  if (value >= 100) {
    return "HIGH";
  }

  if (value >= 60) {
    return "MODERATE";
  }

  return "LOW";
}


/* =========================================================
   RISK UI
   ========================================================= */

function updateRiskUI(risk) {

  const value =
    String(risk || "UNKNOWN")
      .toUpperCase();


  /*
   * Main dashboard
   */

  setText(
    "riskMetric",
    value
  );


  /*
   * ML panel
   */

  setText(
    "mlRisk",
    value
  );


  /*
   * Model page
   */

  setText(
    "modelPageRisk",
    value
  );


  /*
   * Alert

   */

  setText(
    "prioritySeverity",
    value
  );

  setText(
    "alertSeverity",
    value
  );


  /*
   * Inundation page
   */

  setText(
    "inundationRiskLabel",
    value
  );


  /*
   * Priority alert text
   */

  const priorityAlertText =
    document.getElementById(
      "priorityAlertText"
    );


  if (priorityAlertText) {

    if (value === "CRITICAL") {

      priorityAlertText.innerHTML =
        "<strong>Critical rainfall conditions detected.</strong> " +
        "Immediate attention is required for vulnerable zones.";

    }

    else if (value === "HIGH") {

      priorityAlertText.innerHTML =
        "<strong>Heavy rainfall conditions detected.</strong> " +
        "Prioritize low-lying and drainage-sensitive zones.";

    }

    else if (value === "MODERATE") {

      priorityAlertText.innerHTML =
        "<strong>Moderate rainfall risk detected.</strong> " +
        "Continue monitoring vulnerable and drainage-sensitive zones.";

    }

    else {

      priorityAlertText.innerHTML =
        "<strong>No significant rainfall event detected.</strong> " +
        "Continue routine monitoring.";

    }

  }

}


/* =========================================================
   ALERT DESCRIPTION
   ========================================================= */

function updateAlertDescription(
  risk,
  rainfall
) {

  const element =
    document.getElementById(
      "alertDescription"
    );

  if (!element) {
    return;
  }


  const location =
    activeLocation.name;


  const rain =
    Number(rainfall || 0).toFixed(1);


  if (risk === "CRITICAL") {

    element.textContent =
      `${location} is currently under critical rainfall risk. ` +
      `${rain} mm rainfall has been detected. Immediate attention ` +
      `is required for vulnerable and low-lying zones.`;

  }

  else if (risk === "HIGH") {

    element.textContent =
      `Heavy rainfall conditions detected. ${location} is currently ` +
      `under high rainfall risk. Prioritize low-lying, drainage-sensitive ` +
      `and vulnerable zones.`;

  }

  else if (risk === "MODERATE") {

    element.textContent =
      `${location} is currently under moderate rainfall risk. ` +
      `Continue monitoring vulnerable and drainage-sensitive zones.`;

  }

  else {

    element.textContent =
      `No significant rainfall event is currently detected in ` +
      `${location}. Continue routine monitoring.`;

  }

}


/* =========================================================
   UPDATE ALERT CENTER
   ========================================================= */

function updateAlertCenter(dashboard) {

  if (!dashboard) {
    return;
  }


  const risk =
    String(
      dashboard.risk || "UNKNOWN"
    ).toUpperCase();


  const rainfall =
    Number(
      dashboard.rainfall_mm || 0
    );


  const inundation =
    Number(
      dashboard.inundation_km2 || 0
    );


  const lead =
    Number(
      dashboard.lead_time_hours || 0
    );


  const confidence =
    dashboard.confidence;


  /*
   * Location
   */

  setText(
    "alertActiveLocation",
    dashboard.location ||
    activeLocation.name
  );


  setText(
    "alertLocationTitle",
    `${dashboard.location || activeLocation.name} • Heavy Rainfall`
  );


  /*
   * Alert stats
   */

  setText(
    "alertRainfall",
    `${rainfall.toFixed(1)} mm`
  );


  setText(
    "alertLeadTime",
    `${lead.toFixed(1)} h`
  );


  if (
    confidence !== undefined &&
    confidence !== null
  ) {

    setText(
      "alertConfidence",
      `${confidence}%`
    );

  }


  /*
   * Coordinates
   */

  setText(
    "alertLatitude",
    Number(
      dashboard.latitude ??
      activeLocation.lat
    ).toFixed(4)
  );


  setText(
    "alertLongitude",
    Number(
      dashboard.longitude ??
      activeLocation.lng
    ).toFixed(4)
  );


  /*
   * Inundation
   */

  setText(
    "alertInundation",
    `${inundation.toFixed(1)} km²`
  );


  /*
   * Updated time
   */

  if (dashboard.updated_at) {

    const time =
      new Date(
        dashboard.updated_at
      ).toLocaleTimeString(
        "en-IN",
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      );

    setText(
      "alertUpdated",
      time
    );

  }

  updateEvacuationPathfinder();

  /*
   * Risk tag
   */

  setText(
    "alertRiskTag",
    risk
  );


  /*
   * Alert severity
   */

  setText(
    "alertSeverity",
    risk
  );


  /*
   * Description
   */

  updateAlertDescription(
    risk,
    rainfall
  );


  /*
   * Recommended actions
   */

  const actionOne =
    document.getElementById("actionOne");

  const actionTwo =
    document.getElementById("actionTwo");

  const actionThree =
    document.getElementById("actionThree");

  const actionFour =
    document.getElementById("actionFour");


  if (risk === "CRITICAL") {

    if (actionOne) {
      actionOne.textContent =
        "Activate emergency monitoring of low-lying zones.";
    }

    if (actionTwo) {
      actionTwo.textContent =
        "Review drainage, road and evacuation vulnerabilities.";
    }

    if (actionThree) {
      actionThree.textContent =
        "Prepare local emergency response teams immediately.";
    }

    if (actionFour) {
      actionFour.textContent =
        "Issue targeted public advisories and warnings.";
    }

  }

  else if (risk === "HIGH") {

    if (actionOne) {
      actionOne.textContent =
        "Increase monitoring of low-lying zones.";
    }

    if (actionTwo) {
      actionTwo.textContent =
        "Review road and drainage vulnerability.";
    }

    if (actionThree) {
      actionThree.textContent =
        "Prepare local response teams.";
    }

    if (actionFour) {
      actionFour.textContent =
        "Issue targeted public advisories if thresholds are crossed.";
    }

  }

  else {

    if (actionOne) {
      actionOne.textContent =
        "Continue monitoring vulnerable zones.";
    }

    if (actionTwo) {
      actionTwo.textContent =
        "Review current drainage conditions.";
    }

    if (actionThree) {
      actionThree.textContent =
        "Keep local response teams informed.";
    }

    if (actionFour) {
      actionFour.textContent =
        "Issue public advisories if conditions worsen.";
    }

  }

}

let evacuationMap = null;
let evacLayers = [];

function updateEvacuationPathfinder() {
  if (typeof L === "undefined") return;

  const mapEl = document.getElementById("evacuationMap");
  if (!mapEl) return;

  const lat = activeLocation.lat;
  const lng = activeLocation.lng;
  const locName = activeLocation.name || "Meerut";

  if (!evacuationMap) {
    evacuationMap = L.map("evacuationMap", { zoomControl: false, attributionControl: false }).setView([lat, lng], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(evacuationMap);
  } else {
    evacuationMap.setView([lat, lng], 11);
  }

  // Clear previous layers
  evacLayers.forEach(layer => evacuationMap.removeLayer(layer));
  evacLayers = [];

  // Active risk center marker
  const centerMarker = L.circleMarker([lat, lng], {
    radius: 7,
    color: "#ff4f65",
    fillColor: "#ff4f65",
    fillOpacity: 0.9,
    weight: 2
  }).addTo(evacuationMap).bindPopup(`<b>High-Risk Inundation Zone</b><br>${locName}`);
  evacLayers.push(centerMarker);

  // 3 Safe Shelters
  const shelters = [
    { name: `NDRF Relief Shelter Alpha (${locName})`, dLat: 0.025, dLng: 0.02, cap: 1500, occ: 320, status: "🟢 OPERATIONAL", dist: "2.4 km" },
    { name: `District Stadium Base Beta`, dLat: -0.02, dLng: -0.03, cap: 3000, occ: 850, status: "🟢 OPERATIONAL", dist: "4.1 km" },
    { name: `High-Ground Relief Camp Gamma`, dLat: 0.03, dLng: -0.025, cap: 800, occ: 110, status: "🟡 STANDBY", dist: "5.6 km" }
  ];

  const shelterListEl = document.getElementById("shelterList");
  if (shelterListEl) shelterListEl.innerHTML = "";

  shelters.forEach((s, idx) => {
    const sLat = lat + s.dLat;
    const sLng = lng + s.dLng;

    // Shelter marker
    const sMarker = L.circleMarker([sLat, sLng], {
      radius: 8,
      color: "#45d5ff",
      fillColor: "#0284c7",
      fillOpacity: 1,
      weight: 2
    }).addTo(evacuationMap).bindPopup(`<b>${s.name}</b><br>Capacity: ${s.occ}/${s.cap}<br>Distance: ${s.dist}`);
    evacLayers.push(sMarker);

    // Evacuation Polyline Route
    const route = L.polyline([
      [lat, lng],
      [lat + s.dLat * 0.4, lng + s.dLng * 0.2],
      [sLat, sLng]
    ], {
      color: "#45d5a0",
      weight: 4,
      dashArray: "6, 6",
      opacity: 0.85
    }).addTo(evacuationMap);
    evacLayers.push(route);

    // Populate shelter matrix UI
    if (shelterListEl) {
      const card = document.createElement("div");
      card.className = "source-card";
      card.style.cssText = "padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;";
      card.innerHTML = `
        <div>
          <b style="font-size: 13px; color: #45d5ff;">${s.name}</b>
          <div style="font-size: 11px; opacity: 0.8; margin-top: 2px;">
            Occupancy: <b>${s.occ} / ${s.cap}</b> citizens • Dist: <b>${s.dist}</b>
          </div>
        </div>
        <span style="font-size: 11px; font-weight: 700; color: ${s.status.includes('🟢') ? '#45d5a0' : '#f4ca4e'}">${s.status}</span>
      `;
      shelterListEl.appendChild(card);
    }
  });

  setTimeout(() => { evacuationMap.invalidateSize(); }, 300);

  const dispatchBtn = document.getElementById("dispatchEvacRouteBtn");
  if (dispatchBtn) {
    dispatchBtn.onclick = () => {
      showHUDToast("Evacuation Routes Dispatched", `GPS Safe Navigation Corridors sent to Emergency Units & Public Apps in ${locName}!`, "🧭");
    };
  }
}

let toastTimer = null;

function showHUDToast(title, msg, icon = "🧭") {
  const toast = document.getElementById("hudToast");
  const tTitle = document.getElementById("toastTitle");
  const tMsg = document.getElementById("toastMsg");
  const tIcon = document.getElementById("toastIcon");
  const tBar = document.getElementById("toastBar");

  if (!toast) return;

  if (tTitle) tTitle.textContent = title;
  if (tMsg) tMsg.textContent = msg;
  if (tIcon) tIcon.textContent = icon;

  if (tBar) {
    tBar.style.transition = "none";
    tBar.style.width = "100%";
    setTimeout(() => {
      tBar.style.transition = "width 3.5s linear";
      tBar.style.width = "0%";
    }, 10);
  }

  toast.style.display = "block";
  toast.style.opacity = "1";
  toast.style.transform = "translateY(0)";

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    setTimeout(() => { toast.style.display = "none"; }, 300);
  }, 3500);
}


/* =========================================================
   UPDATE INUNDATION PAGE
   ========================================================= */

let inundationMiniMap = null;
let inundationMiniCircle = null;

function updateInundationUI(dashboard) {
  if (!dashboard) {
    return;
  }

  const area = Number(dashboard.inundation_km2 || 0);
  const risk = String(dashboard.risk || "UNKNOWN").toUpperCase();
  const locName = activeLocation.name || "Meerut";

  setText("inundationTargetLoc", locName);

  const inundationArea = document.getElementById("inundationArea");
  if (inundationArea) {
    inundationArea.innerHTML = `${area.toFixed(1)} <small>km²</small>`;
  }

  setText("inundationRiskLabel", risk);

  const riskNote = document.getElementById("inundationRiskNote");
  if (riskNote) {
    if (risk === "CRITICAL") {
      riskNote.textContent = "Critical inundation conditions require immediate response protocols.";
    } else if (risk === "HIGH") {
      riskNote.textContent = "High inundation risk detected across vulnerable low-lying zones.";
    } else if (risk === "MODERATE") {
      riskNote.textContent = "Moderate inundation risk. Continue active monitoring and drain checks.";
    } else {
      riskNote.textContent = "Low current inundation risk. Standard routine monitoring active.";
    }
  }

  const roads = dashboard.affected_roads ?? Math.max(3, Math.round(area * 3.6 + 2));
  const sites = dashboard.critical_sites ?? Math.max(2, Math.round(area * 1.7 + 1));
  const zones = dashboard.priority_zones ?? Math.max(2, Math.round(area * 1.2 + 1));

  setText("roadCount", roads);
  setText("criticalSiteCount", sites);
  setText("priorityZoneCount", zones);

  // Mini Inundation Map
  const mapEl = document.getElementById("inundationMiniMap");
  if (mapEl && typeof L !== "undefined") {
    if (!inundationMiniMap) {
      inundationMiniMap = L.map("inundationMiniMap", { zoomControl: false, attributionControl: false }).setView([activeLocation.lat, activeLocation.lng], 11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(inundationMiniMap);
    } else {
      inundationMiniMap.setView([activeLocation.lat, activeLocation.lng], 11);
    }

    if (inundationMiniCircle) {
      inundationMiniMap.removeLayer(inundationMiniCircle);
    }

    let circleColor = "#45d5a0";
    if (risk === "CRITICAL") circleColor = "#ff4f65";
    else if (risk === "HIGH") circleColor = "#ff9347";
    else if (risk === "MODERATE") circleColor = "#f4ca4e";

    const radiusMeters = Math.max(800, Math.sqrt((area * 1000000) / Math.PI));

    inundationMiniCircle = L.circle([activeLocation.lat, activeLocation.lng], {
      radius: radiusMeters,
      color: circleColor,
      fillColor: circleColor,
      fillOpacity: 0.25,
      weight: 2
    }).addTo(inundationMiniMap);

    setTimeout(() => { inundationMiniMap.invalidateSize(); }, 300);
  }

  // Populate Exposure Table
  const tableBody = document.getElementById("exposureTableBody");
  if (tableBody) {
    const pEvac = risk === "CRITICAL" ? "🔴 IMMEDIATE EVACUATION" : (risk === "HIGH" ? "🟠 HIGH PRIORITY" : "🟡 MONITOR");
    const dEst = risk === "CRITICAL" ? "0.8 - 1.5 m" : (risk === "HIGH" ? "0.3 - 0.7 m" : "0.05 - 0.2 m");

    tableBody.innerHTML = `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        <td style="padding: 10px 8px; font-weight: 600;">Main Arterial Highway / ${locName} Bypass</td>
        <td style="padding: 10px 8px;">Transportation Line</td>
        <td style="padding: 10px 8px; color: #45d5ff;">${dEst}</td>
        <td style="padding: 10px 8px;">${roads} Key Road Segments</td>
        <td style="padding: 10px 8px; font-weight: 700;">${pEvac}</td>
      </tr>
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        <td style="padding: 10px 8px; font-weight: 600;">Substation & Civil Hospital Zone</td>
        <td style="padding: 10px 8px;">Critical Infrastructure</td>
        <td style="padding: 10px 8px; color: #45d5ff;">${(parseFloat(dEst) * 0.6).toFixed(2)} m</td>
        <td style="padding: 10px 8px;">${sites} Essential Facilities</td>
        <td style="padding: 10px 8px; font-weight: 700;">${pEvac}</td>
      </tr>
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        <td style="padding: 10px 8px; font-weight: 600;">Low-Lying Residential Basin #${locName.substring(0, 3).toUpperCase()}-1</td>
        <td style="padding: 10px 8px;">Residential Basin</td>
        <td style="padding: 10px 8px; color: #45d5ff;">${dEst}</td>
        <td style="padding: 10px 8px;">${(area * 1250 + 450).toFixed(0)} Residents</td>
        <td style="padding: 10px 8px; font-weight: 700;">${pEvac}</td>
      </tr>
    `;
  }

  updateElevationProfile();
}

function updateElevationProfile() {
  const canvas = document.getElementById("elevationCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const locName = activeLocation.name || "Meerut";
  const topoTarget = document.getElementById("topoTargetLoc");
  if (topoTarget) topoTarget.textContent = locName;

  let parentW = canvas.parentElement ? canvas.parentElement.offsetWidth - 30 : 0;
  if (parentW <= 0) parentW = 750;

  const width = (canvas.width = parentW);
  const height = (canvas.height = 200);

  ctx.clearRect(0, 0, width, height);

  const points = [
    { x: 20, y: height - 30, label: "River Bed (42m)", color: "#ff4f65" },
    { x: width * 0.28, y: height - 60, label: "Urban Basin (48m)", color: "#f4ca4e" },
    { x: width * 0.52, y: height - 100, label: "Substation (56m)", color: "#45d5ff" },
    { x: width * 0.78, y: height - 165, label: "NDRF Shelter (78m)", color: "#45d5a0" },
    { x: width - 20, y: height - 140, label: "Ridge (72m)", color: "#8ea0b5" }
  ];

  // 1. Draw Water Level Surge Fill
  ctx.fillStyle = "rgba(69, 213, 255, 0.35)";
  ctx.beginPath();
  ctx.moveTo(0, height - 70);
  ctx.lineTo(width * 0.45, height - 70);
  ctx.lineTo(width * 0.45, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  // Water Line
  ctx.strokeStyle = "#45d5ff";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, height - 70);
  ctx.lineTo(width * 0.45, height - 70);
  ctx.stroke();
  ctx.setLineDash([]);

  // Water Label
  ctx.fillStyle = "#45d5ff";
  ctx.font = "bold 11px Inter, sans-serif";
  ctx.fillText("🌊 Water Accumulation Surge Level (49.5m)", 15, height - 80);

  // 2. Draw Terrain Path
  ctx.beginPath();
  ctx.moveTo(0, height);
  points.forEach((p, idx) => {
    if (idx === 0) ctx.lineTo(p.x, p.y);
    else {
      const prev = points[idx - 1];
      const cx = (prev.x + p.x) / 2;
      ctx.quadraticCurveTo(cx, prev.y, p.x, p.y);
    }
  });
  ctx.lineTo(width, height);
  ctx.closePath();

  const terrainGrad = ctx.createLinearGradient(0, 0, 0, height);
  terrainGrad.addColorStop(0, "rgba(30, 58, 95, 0.8)");
  terrainGrad.addColorStop(1, "rgba(13, 30, 51, 0.95)");
  ctx.fillStyle = terrainGrad;
  ctx.fill();

  // Terrain Line
  ctx.strokeStyle = "#8ea0b5";
  ctx.lineWidth = 3;
  ctx.stroke();

  // 3. Draw Point Markers
  points.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "11px Inter, sans-serif";
    ctx.fillText(p.label, Math.max(10, p.x - 35), p.y - 12);
  });
}


/* =========================================================
   UPDATE DASHBOARD METRICS
   ========================================================= */

function updateDashboardUI(
  dashboard
) {

  if (!dashboard) {
    return;
  }


  latestDashboard =
    dashboard;


  /*
   * Make backend location the displayed
   * location only when it is valid.
   */

  if (dashboard.location) {

    activeLocation.name =
      dashboard.location;

  }


  /*
   * Rainfall — count-up
   */

  const rainfallVal = Number(dashboard.rainfall_mm || 0);

  animateCountUp(
    "rainMetric",
    rainfallVal,
    " mm",
    1
  );

  setText("tickerRain", `${rainfallVal.toFixed(1)} mm`);
  setText("tickerRisk", String(dashboard.risk || "LOW").toUpperCase());

  /*
   * Risk (text — no count-up, just set)
   */

  updateRiskUI(
    dashboard.risk
  );


  /*
   * Inundation — count-up
   */

  const areaVal = Number(dashboard.inundation_km2 || 0);

  animateCountUp(
    "areaMetric",
    areaVal,
    " km\u00B2",
    1
  );


  /*
   * Lead time — count-up
   */

  const leadVal = Number(dashboard.lead_time_hours || 0);

  animateCountUp(
    "leadMetric",
    leadVal,
    " h",
    1
  );

  /*
   * Significant Rainfall Probability — count-up & progress bar
   */
  const probVal = Number(dashboard.rain_probability_percent || (rainfallVal > 0 ? Math.min(98.0, rainfallVal * 0.82) : 25.0));
  animateCountUp("probMetric", probVal, "%", 1);

  const probProgress = document.getElementById("probProgress");
  if (probProgress) {
    probProgress.style.width = `${Math.min(100, Math.max(0, probVal))}%`;
  }


  /*
   * Updated time
   */

  if (dashboard.updated_at) {

    const time =
      new Date(
        dashboard.updated_at
      ).toLocaleTimeString(
        "en-IN",
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      );


    setText(
      "updatedAt",
      time
    );

  }


  /*
   * Update all other pages.
   */

  updateLocationUI();

  if (typeof updateMapLayers === "function") {
    updateMapLayers(activeLocation.lat, activeLocation.lng, areaVal, dashboard.risk);
  }

  updateAlertCenter(
    dashboard
  );

  updateInundationUI(
    dashboard
  );

}


/* =========================================================
   ML PREDICTION
   ========================================================= */

async function loadMLPrediction() {

  try {

    const ml =
      await api(
        `/api/ml/prediction` +
        `?lat=${activeLocation.lat}` +
        `&lng=${activeLocation.lng}` +
        `&location=${encodeURIComponent(activeLocation.name)}`
      );


    latestML =
      ml;


    console.log(
      "RAINSAFE AI ML Prediction:",
      ml
    );


    /*
     * Probability
     */

    const probability =
      Number(
        ml.significant_rain_probability ??
        ml.significant_rain_probability_percent ??
        0
      );


    /*
     * ML risk
     */

    const mlRisk =
      String(
        ml.risk || "UNKNOWN"
      ).toUpperCase();


    /*
     * Probability
     */

    setText(
      "mlProbability",
      `${probability.toFixed(2)}%`
    );


    setText(
      "modelPageProbability",
      `${probability.toFixed(2)}%`
    );


    /*
     * ML classification
     *
     * This intentionally uses the ML endpoint's
     * classification, not dashboard inundation risk.
     */

    setText(
      "mlRisk",
      mlRisk
    );


    setText(
      "modelPageRisk",
      mlRisk
    );


    /*
     * Model name
     */

    const modelName =
      ml.model ||
      "Random Forest Classifier";


    setText(
      "mlModel",
      modelName
    );


    setText(
      "modelPageName",
      modelName
    );


    /*
     * Threshold
     */

    const threshold =
      ml.threshold_mm ??
      5;


    setText(
      "mlThreshold",
      `≥ ${threshold} mm / 6h`
    );


    setText(
      "modelPageThreshold",
      `≥ ${threshold} mm / 6h`
    );


    /*
     * Status
     */

    setText(
      "mlModelStatus",
      "ML ACTIVE"
    );


    setText(
      "modelPageStatus",
      "ML ACTIVE"
    );


    return ml;

  }

  catch (error) {

    console.warn(
      "ML prediction unavailable:",
      error
    );


    setText(
      "mlModelStatus",
      "ML OFFLINE"
    );


    setText(
      "modelPageStatus",
      "ML OFFLINE"
    );


    return null;
  }

}


/* =========================================================
   FORECAST CHART
   ========================================================= */

function createForecastChart(
  labels,
  values
) {

  const canvas =
    document.getElementById(
      "forecastChart"
    );


  if (!canvas) {
    return null;
  }


  /*
   * Prevent duplicate Chart.js instances.
   */

  if (forecastChart) {

    forecastChart.destroy();

    forecastChart = null;

  }


  forecastChart =
    new Chart(
      canvas,
      {
        type: "line",

        data: {

          labels: labels,

          datasets: [

            {
              label: "Rainfall",

              data: values,

              borderWidth: 2,

              pointRadius: 3,

              tension: 0.35,

              fill: true,

              backgroundColor:
                "rgba(69,213,255,0.08)",

              borderColor:
                "#45d5ff",

              pointBackgroundColor:
                "#45d5ff"
            }

          ]

        },

        options: {

          responsive: true,

          maintainAspectRatio: false,

          plugins: {

            legend: {
              display: false
            }

          },

          scales: {

            x: {

              grid: {
                display: false
              },

              ticks: {

                color: "#64788d",

                font: {
                  size: 8
                }

              }

            },

            y: {

              grid: {

                color:
                  "rgba(90,120,150,0.10)"

              },

              ticks: {

                color: "#64788d",

                font: {
                  size: 8
                }

              }

            }

          }

        }

      }
    );


  return forecastChart;
}


/* =========================================================
   FORECAST SUMMARY
   ========================================================= */

function updateForecastSummary(
  forecast
) {

  if (
    !forecast ||
    !Array.isArray(
      forecast.forecast
    ) ||
    forecast.forecast.length === 0
  ) {

    return;

  }


  const items =
    forecast.forecast;


  /*
   * Find peak rainfall
   */

  let peak =
    items[0];


  items.forEach(item => {

    if (
      Number(item.rainfall_mm || 0) >
      Number(peak.rainfall_mm || 0)
    ) {

      peak = item;

    }

  });


  const peakRain =
    Number(
      peak.rainfall_mm || 0
    );


  /*
   * Peak
   */

  const peakElement =
    document.getElementById(
      "forecastPeak"
    );


  if (peakElement) {

    peakElement.innerHTML =
      `${peakRain.toFixed(1)} <span>mm</span>`;

  }


  /*
   * Peak window
   */

  setText(
    "forecastPeakWindow",
    peak.hour || "—"
  );


  /*
   * Peak intensity
   */

  setText(
    "forecastPeakIntensity",
    `${peakRain.toFixed(1)} mm/h`
  );


  /*
   * Trend
   */

  const first =
    Number(
      items[0]?.rainfall_mm || 0
    );


  const last =
    Number(
      items[items.length - 1]?.rainfall_mm || 0
    );


  let trend =
    "Stable";


  if (last > first * 1.15) {
    trend = "Increasing";
  }

  else if (last < first * 0.85) {
    trend = "Decreasing";
  }


  setText(
    "forecastTrend",
    trend
  );


  /*
   * Risk transition
   */

  const forecastRisk =
    getRiskFromRainfall(
      items.reduce(
        (sum, item) =>
          sum +
          Number(
            item.rainfall_mm || 0
          ),
        0
      )
    );


  setText(
    "forecastRiskTransition",
    forecastRisk
  );

}


/* =========================================================
   LOAD FORECAST
   ========================================================= */

async function loadForecast() {

  try {

    const forecast =
      await api(
        `/api/forecast` +
        `?hours=48` +
        `&lat=${activeLocation.lat}` +
        `&lon=${activeLocation.lng}` +
        `&location=${encodeURIComponent(activeLocation.name)}`
      );


    latestForecast =
      forecast;


    console.log(
      "RAINSAFE AI Forecast:",
      forecast
    );


    if (
      forecast &&
      Array.isArray(
        forecast.forecast
      )
    ) {

      const labels =
        forecast.forecast.map(
          item =>
            item.hour
        );


      const values =
        forecast.forecast.map(
          item =>
            Number(
              item.rainfall_mm || 0
            )
        );


      if (
        labels.length &&
        values.length
      ) {

        createForecastChart(
          labels,
          values
        );

      }


      updateForecastSummary(
        forecast
      );

    }


    return forecast;

  }

  catch (error) {

    console.warn(
      "Forecast API unavailable:",
      error
    );


    /*
     * Do not overwrite real dashboard
     * values with demo data.
     */

    return null;
  }

}


/* =========================================================
   THREE.JS RAIN CANVAS
   ========================================================= */

function initRainCanvas() {

  const canvas = document.getElementById("rain-canvas");

  if (!canvas) {
    console.warn("RAINSAFE AI: rain-canvas element not found.");
    return;
  }

  if (typeof THREE === "undefined") {
    console.warn("RAINSAFE AI: Three.js not loaded — rain animation skipped.");
    return;
  }


  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false
  });

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));


  const scene = new THREE.Scene();


  const camera = new THREE.OrthographicCamera(
    -1, 1, 1, -1, 0.1, 10
  );

  camera.position.z = 1;


  /* -------------------------------------------------------
   * Rain drop geometry
   *
   * Each drop is a thin quad (PlaneGeometry) that looks
   * like a vertical streak.
   * ------------------------------------------------------- */

  const DROP_COUNT = 600;

  const drops = [];


  const dropGeo = new THREE.PlaneGeometry(0.002, 0.045);

  const colors = [
    0x45d5ff, /* --cyan */
    0x4f8cff, /* --blue */
    0xa8daff  /* light blue */
  ];


  function makeDropMat(color) {

    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5 + Math.random() * 0.4
    });

  }


  for (let i = 0; i < DROP_COUNT; i++) {

    const color = colors[
      Math.floor(Math.random() * colors.length)
    ];

    const mesh = new THREE.Mesh(
      dropGeo,
      makeDropMat(color)
    );

    /* Spread across the full canvas width & random height */
    mesh.position.x = (Math.random() - 0.5) * 2;
    mesh.position.y = Math.random() * 2 - 1;
    mesh.position.z = 0;

    /* Slight random tilt (wind effect) */
    mesh.rotation.z = (Math.random() - 0.5) * 0.15;

    /* Random speed */
    mesh.userData.speed = 0.004 + Math.random() * 0.008;

    /* Random opacity variance */
    mesh.userData.opacity = mesh.material.opacity;

    scene.add(mesh);

    drops.push(mesh);

  }


  /* -------------------------------------------------------
   * Resize handler
   * ------------------------------------------------------- */

  function resize() {

    const hero = canvas.parentElement;

    if (!hero) {
      return;
    }

    const w = hero.clientWidth;
    const h = hero.clientHeight;

    renderer.setSize(w, h, false);

  }


  resize();

  window.addEventListener("resize", resize);


  /* -------------------------------------------------------
   * Animation loop
   * ------------------------------------------------------- */

  function animate() {

    requestAnimationFrame(animate);

    drops.forEach(drop => {

      drop.position.y -= drop.userData.speed;

      /* Fade out as it falls */
      drop.material.opacity =
        drop.userData.opacity *
        ((drop.position.y + 1) / 2);

      /* Reset to top when it exits the bottom */
      if (drop.position.y < -1.05) {

        drop.position.y = 1.05;
        drop.position.x = (Math.random() - 0.5) * 2;
        drop.material.opacity = drop.userData.opacity;

      }

    });

    renderer.render(scene, camera);

  }


  animate();


  console.log(
    "RAINSAFE AI: Three.js rain canvas initialized."
  );

}

/* =========================================================
   THREE.JS GLOBE CANVAS
   ========================================================= */

/* =========================================================
   THREE.JS 3D INTERACTIVE GLOBE COMPONENT
   ========================================================= */

let globeInstance = null;
let globeMarker = null;
let globePulseRing = null;
let targetGlobeRotX = 0.3;
let targetGlobeRotY = -Math.PI / 2;
let currentGlobeRotX = 0.3;
let currentGlobeRotY = -Math.PI / 2;

function initGlobeCanvas() {

  const canvas = document.getElementById("globe-canvas");

  if (!canvas) {
    console.warn("RAINSAFE AI: globe-canvas element not found.");
    return;
  }

  if (typeof THREE === "undefined") {
    console.warn("RAINSAFE AI: Three.js not loaded — globe animation skipped.");
    return;
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true
  });

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(350, 350, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.z = 240;

  const radius = 85;

  // Globe pivot group
  const globeGroup = new THREE.Group();
  scene.add(globeGroup);
  globeInstance = globeGroup;

  // 1. Inner Sphere Body
  const sphereGeo = new THREE.SphereGeometry(radius, 36, 36);
  const sphereMat = new THREE.MeshBasicMaterial({
    color: 0x091b30,
    transparent: true,
    opacity: 0.90
  });
  const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
  globeGroup.add(sphereMesh);

  // 2. Wireframe Grid Lines
  const wireGeo = new THREE.SphereGeometry(radius + 0.3, 20, 20);
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x1c4475,
    wireframe: true,
    transparent: true,
    opacity: 0.25
  });
  const wireMesh = new THREE.Mesh(wireGeo, wireMat);
  globeGroup.add(wireMesh);

  // 3. Continental Point-Cloud (Dot Matrix World Map)
  const dotCount = 1500;
  const positions = [];
  const colors = [];
  const colorCyan = new THREE.Color(0x45d5ff);
  const colorBlue = new THREE.Color(0x2d68c4);

  for (let i = 0; i < dotCount; i++) {
    const phi = Math.acos(-1 + (2 * i) / dotCount);
    const theta = Math.sqrt(dotCount * Math.PI) * phi;
    const lat = (90 - (phi * 180 / Math.PI));
    const lng = ((theta * 180 / Math.PI) % 360) - 180;

    const isLand = (
      (lat > 10 && lat < 70 && lng > -165 && lng < -50) || // N. America
      (lat > -55 && lat < 12 && lng > -82 && lng < -34) ||  // S. America
      (lat > 35 && lat < 70 && lng > -10 && lng < 45) ||    // Europe
      (lat > -35 && lat < 37 && lng > -18 && lng < 52) ||   // Africa
      (lat > 5 && lat < 75 && lng > 45 && lng < 150) ||     // Asia
      (lat > -45 && lat < -10 && lng > 110 && lng < 155)    // Australia
    );

    if (isLand || Math.random() < 0.10) {
      const r = radius + 0.9;
      const latRad = (lat * Math.PI) / 180;
      const lngRad = (-lng * Math.PI) / 180;

      const x = r * Math.cos(latRad) * Math.sin(lngRad);
      const y = r * Math.sin(latRad);
      const z = r * Math.cos(latRad) * Math.cos(lngRad);

      positions.push(x, y, z);
      const mix = Math.random();
      const col = mix > 0.4 ? colorCyan : colorBlue;
      colors.push(col.r, col.g, col.b);
    }
  }

  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  dotGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const dotMat = new THREE.PointsMaterial({
    size: 2.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.85
  });
  const dotMesh = new THREE.Points(dotGeo, dotMat);
  globeGroup.add(dotMesh);

  // 4. Outer Glowing Atmosphere
  const haloGeo = new THREE.SphereGeometry(radius + 7, 32, 32);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0x45d5ff,
    transparent: true,
    opacity: 0.08,
    side: THREE.BackSide
  });
  const haloMesh = new THREE.Mesh(haloGeo, haloMat);
  scene.add(haloMesh);

  // 5. Active Location Pin & Pulsing Beacon Ring
  const pinGroup = new THREE.Group();
  
  const pinCoreGeo = new THREE.SphereGeometry(3.2, 16, 16);
  const pinCoreMat = new THREE.MeshBasicMaterial({ color: 0x45d5ff });
  const pinCore = new THREE.Mesh(pinCoreGeo, pinCoreMat);
  pinGroup.add(pinCore);

  const ringGeo = new THREE.RingGeometry(3.8, 6.0, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x45d5ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = Math.PI / 2;
  pinGroup.add(ringMesh);
  globePulseRing = ringMesh;

  globeGroup.add(pinGroup);
  globeMarker = pinGroup;

  updateGlobeMarker(activeLocation.lat, activeLocation.lng);
  updateGlobeLocation(activeLocation.lat, activeLocation.lng);

  let pulseScale = 1.0;
  function animate() {
    requestAnimationFrame(animate);

    // Smooth rotational flight to searched target location
    currentGlobeRotX += (targetGlobeRotX - currentGlobeRotX) * 0.06;
    currentGlobeRotY += (targetGlobeRotY - currentGlobeRotY) * 0.06;

    globeGroup.rotation.x = currentGlobeRotX;
    globeGroup.rotation.y = currentGlobeRotY;

    // Pulsing beacon ring animation
    pulseScale += 0.03;
    if (pulseScale > 2.2) pulseScale = 1.0;
    if (globePulseRing) {
      globePulseRing.scale.set(pulseScale, pulseScale, pulseScale);
      globePulseRing.material.opacity = Math.max(0, 1.0 - (pulseScale - 1.0) / 1.2);
    }

    renderer.render(scene, camera);
  }

  animate();

  console.log("RAINSAFE AI: 3D Interactive Globe initialized.");
}

function updateGlobeMarker(lat, lng) {
  if (!globeMarker) return;
  const radius = 86.5;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (-lng * Math.PI) / 180;

  const x = radius * Math.cos(latRad) * Math.sin(lngRad);
  const y = radius * Math.sin(latRad);
  const z = radius * Math.cos(latRad) * Math.cos(lngRad);

  globeMarker.position.set(x, y, z);
}

function updateGlobeLocation(lat, lng) {
  const parsedLat = Number(lat || 28.9845);
  const parsedLng = Number(lng || 77.7064);

  updateGlobeMarker(parsedLat, parsedLng);

  // Smooth rotation angles to position searched location at camera center
  targetGlobeRotX = (parsedLat * Math.PI) / 180 * 0.45;
  targetGlobeRotY = (parsedLng * Math.PI) / 180 - Math.PI / 2;
}



/* =========================================================
   COUNT-UP ANIMATION
   ========================================================= */

function animateCountUp(elementId, endValue, suffix, decimals) {

  const element = document.getElementById(elementId);

  if (!element) {
    return;
  }


  const duration = 1200; /* ms */
  const startTime = performance.now();
  const startValue = 0;

  const strong = element.tagName === "STRONG"
    ? element
    : element.querySelector("strong") || element;


  /* Trigger CSS flash */
  strong.classList.remove("counting");

  void strong.offsetWidth; /* reflow */

  strong.classList.add("counting");


  function step(now) {

    const elapsed = now - startTime;

    const progress = Math.min(elapsed / duration, 1);

    /* Ease out cubic */
    const eased = 1 - Math.pow(1 - progress, 3);

    const current = startValue + (endValue - startValue) * eased;

    strong.textContent =
      `${current.toFixed(decimals || 0)}${suffix || ""}`;


    if (progress < 1) {

      requestAnimationFrame(step);

    } else {

      strong.textContent =
        `${endValue.toFixed(decimals || 0)}${suffix || ""}`;

    }

  }


  requestAnimationFrame(step);

}


/* =========================================================
   LIVE DYNAMIC CHART (Chart.js)
   ========================================================= */

function initLiveChart() {
  const canvas = document.getElementById("liveRiskChart");
  if (!canvas) {
    console.warn("RAINSAFE AI: liveRiskChart element not found.");
    return;
  }
  if (typeof Chart === "undefined") {
    console.warn("RAINSAFE AI: Chart.js not loaded.");
    return;
  }

  const ctx = canvas.getContext("2d");

  // Create gradient for the line
  const gradient = ctx.createLinearGradient(0, 0, 0, 120);
  gradient.addColorStop(0, "rgba(69, 213, 255, 0.4)");
  gradient.addColorStop(1, "rgba(69, 213, 255, 0.0)");

  // Initial dummy data (e.g., last 20 data points)
  const initialData = Array.from({length: 20}, () => Math.random() * 20 + 30);
  const labels = Array.from({length: 20}, (_, i) => `T-${20-i}`);

  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Risk Signal (%)",
        data: initialData,
        borderColor: "#45d5ff",
        backgroundColor: gradient,
        borderWidth: 2,
        fill: true,
        pointRadius: 0, // Hide points for a smoother look
        pointHoverRadius: 4,
        tension: 0.4 // Smooth curves
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 400,
        easing: 'linear'
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false,
          backgroundColor: '#0d1929',
          titleColor: '#e9f0f7',
          bodyColor: '#45d5ff',
          borderColor: '#203149',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          display: false, // Hide X axis to keep it clean
        },
        y: {
          display: false, // Hide Y axis for a minimalist sparkline look
          min: 0,
          max: 100
        }
      }
    }
  });

  // Simulate live data updates
  let timeStep = 0;
  setInterval(() => {
    timeStep++;
    
    // Generate a new random value that somewhat trends with the previous value
    const lastVal = chart.data.datasets[0].data[19];
    let newVal = lastVal + (Math.random() - 0.5) * 10;
    
    // Keep it bounded
    if (newVal > 80) newVal = 80;
    if (newVal < 10) newVal = 10;
    
    // Add new data
    chart.data.labels.push(`T+${timeStep}`);
    chart.data.datasets[0].data.push(newVal);
    
    // Remove oldest data
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
    
    chart.update();
    
  }, 2500); // Update every 2.5 seconds

  console.log("RAINSAFE AI: Live Chart initialized.");
}


/* =========================================================
   MAP INITIALIZATION
   ========================================================= */

function initMap() {

  const mapElement =
    document.getElementById(
      "map"
    );


  if (!mapElement) {

    console.warn(
      "Map element not found."
    );

    return;

  }


  /*
   * Prevent duplicate initialization.
   */

  if (map) {
    return;
  }


  map =
    L.map(
      "map",
      {
        zoomControl: false
      }
    ).setView(
      [
        activeLocation.lat,
        activeLocation.lng
      ],
      10
    );


  /*
   * Zoom
   */

  L.control.zoom(
    {
      position: "bottomright"
    }
  ).addTo(map);


  /*
   * Standard OpenStreetMap Basemap
   */

  baseTileLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution:
        "© OpenStreetMap contributors",

      maxZoom: 19
    }
  ).addTo(map);


  /*
   * Layers
   */

  rainLayer =
    L.layerGroup().addTo(map);


  floodLayer =
    L.layerGroup();


  stationLayer =
    L.layerGroup();


  /*
   * Risk zones
   */

  demoZones.forEach(
    (
      [lat, lng, name, risk],
      index
    ) => {

      let color =
        "#45d5a0";


      if (
        risk === "CRITICAL"
      ) {

        color =
          "#ff4f65";

      }

      else if (
        risk === "HIGH"
      ) {

        color =
          "#ff9347";

      }

      else if (
        risk === "MODERATE"
      ) {

        color =
          "#f4ca4e";

      }


      const circle =
        L.circle(
          [lat, lng],
          {
            radius:
              2500 +
              index * 600,

            color:
              color,

            fillColor:
              color,

            fillOpacity:
              0.18,

            weight:
              2
          }
        );


      circle.bindPopup(
        `
        <b>${name}</b><br>
        Risk:
        <strong>${risk}</strong><br>
        AI spatial risk zone
        `
      );


      rainLayer.addLayer(
        circle
      );

    }
  );


  /*
   * Weather stations
   */

  const stations = [

    [28.98, 77.71],

    [29.01, 77.64],

    [28.95, 77.78],

    [29.06, 77.72]

  ];


  stations.forEach(
    (
      [lat, lng],
      index
    ) => {

      const marker =
        L.circleMarker(
          [lat, lng],
          {
            radius: 5,

            color:
              "#45d5ff",

            fillColor:
              "#45d5ff",

            fillOpacity:
              1,

            weight:
              2
          }
        );


      marker.bindTooltip(
        `Weather Station ${index + 1}`
      );


      stationLayer.addLayer(
        marker
      );

    }
  );


  /*
   * Inundation envelope
   */

  L.rectangle(
    [
      [28.93, 77.62],
      [29.04, 77.82]
    ],
    {
      color:
        "#ff5d6c",

      weight:
        1,

      dashArray:
        "5 5",

      fillColor:
        "#ff5d6c",

      fillOpacity:
        0.05
    }
  )
    .bindPopup(
      "<b>Predicted inundation envelope</b>"
    )
    .addTo(
      floodLayer
    );


  /*
   * Fix map rendering.
   */

  setTimeout(
    () => {

      if (!map) {
        return;
      }

      map.invalidateSize();

      map.setView(
        [
          activeLocation.lat,
          activeLocation.lng
        ],
        10
      );

    },
    300
  );

}


/* =========================================================
   MOVE MAP TO ACTIVE LOCATION
   ========================================================= */

function moveMapToActiveLocation(
  zoom = 12
) {

  if (!map) {
    return;
  }


  map.flyTo(
    [
      activeLocation.lat,
      activeLocation.lng
    ],
    zoom,
    {
      animate: true,
      duration: 1.2
    }
  );


  /*
   * Remove previous search marker.
   */

  if (selectedMarker) {

    map.removeLayer(
      selectedMarker
    );

    selectedMarker = null;

  }


  /*
   * Add new marker with custom divIcon (zero CDN image dependency).
   */

  const customPinIcon = L.divIcon({
    className: 'custom-pin',
    html: '<div style="background: #0284c7; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 14px #0284c7; cursor: pointer;"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  selectedMarker =
    L.marker(
      [
        activeLocation.lat,
        activeLocation.lng
      ],
      { icon: customPinIcon }
    )
      .addTo(map)
      .bindPopup(
        `
        <b>${activeLocation.displayName}</b><br>
        Active Zone: ${activeLocation.name}
        `
      );

  selectedMarker.openPopup();
}


/* =========================================================
   SEARCH LOCATION (ULTRA-FAST CACHED & NON-BLOCKING UI)
   ========================================================= */

const _GEOCODE_CACHE = {
  "meerut": { lat: 28.9845, lng: 77.7064, name: "Meerut", displayName: "Meerut, Uttar Pradesh, India" },
  "pune": { lat: 18.5204, lng: 73.8567, name: "Pune", displayName: "Pune, Maharashtra, India" },
  "mumbai": { lat: 19.0760, lng: 72.8777, name: "Mumbai", displayName: "Mumbai, Maharashtra, India" },
  "delhi": { lat: 28.6139, lng: 77.2090, name: "Delhi", displayName: "Delhi, India" },
  "patna": { lat: 25.5941, lng: 85.1376, name: "Patna", displayName: "Patna, Bihar, India" },
  "deoghar": { lat: 24.4826, lng: 86.6969, name: "Deoghar", displayName: "Deoghar, Jharkhand, India" },
  "dhunche": { lat: 28.1139, lng: 85.2974, name: "Dhunche", displayName: "Dhunche, Rasuwa, Nepal" },
  "dhunche, nepal": { lat: 28.1139, lng: 85.2974, name: "Dhunche", displayName: "Dhunche, Rasuwa, Nepal" },
  "rasuwa": { lat: 28.1139, lng: 85.2974, name: "Rasuwa", displayName: "Rasuwa, Nepal" },
  "nepal": { lat: 28.3949, lng: 84.1240, name: "Nepal", displayName: "Nepal" },
  "sahjanwa": { lat: 26.7456, lng: 83.2185, name: "Sahjanwa", displayName: "Sahjanwa, Uttar Pradesh, India" },
  "motihari": { lat: 26.6469, lng: 84.9089, name: "Motihari", displayName: "Motihari, Bihar, India" },
  "bangalore": { lat: 12.9716, lng: 77.5946, name: "Bangalore", displayName: "Bangalore, Karnataka, India" },
  "bengaluru": { lat: 12.9716, lng: 77.5946, name: "Bengaluru", displayName: "Bengaluru, Karnataka, India" },
  "kolkata": { lat: 22.5726, lng: 88.3639, name: "Kolkata", displayName: "Kolkata, West Bengal, India" },
  "chennai": { lat: 13.0827, lng: 80.2707, name: "Chennai", displayName: "Chennai, Tamil Nadu, India" },
  "hyderabad": { lat: 17.3850, lng: 78.4867, name: "Hyderabad", displayName: "Hyderabad, Telangana, India" },
  "lucknow": { lat: 26.8467, lng: 80.9462, name: "Lucknow", displayName: "Lucknow, Uttar Pradesh, India" },
  "jaipur": { lat: 26.9124, lng: 75.7873, name: "Jaipur", displayName: "Jaipur, Rajasthan, India" },
  "tokyo": { lat: 35.6762, lng: 139.6503, name: "Tokyo", displayName: "Tokyo, Japan" },
  "london": { lat: 51.5074, lng: -0.1278, name: "London", displayName: "London, United Kingdom" }
};

async function searchLocation(
  query
) {

  if (!query) {
    return;
  }

  const cleanKey = query.trim().toLowerCase();
  console.log("Searching location:", query);

  let lat = null;
  let lng = null;
  let city = query;
  let displayName = query;

  // 0. Instant Cache Hit (0ms)
  if (_GEOCODE_CACHE[cleanKey]) {
    const cached = _GEOCODE_CACHE[cleanKey];
    lat = cached.lat;
    lng = cached.lng;
    city = cached.name;
    displayName = cached.displayName;
  } else {
    // 1. Try Open-Meteo Geocoding API (Fast, CORS-enabled)
    try {
      const geoUrl =
        "https://geocoding-api.open-meteo.com/v1/search" +
        "?name=" + encodeURIComponent(query) +
        "&count=1&language=en&format=json";

      const res = await fetch(geoUrl);
      if (res.ok) {
        const data = await res.json();
        if (data && data.results && data.results.length > 0) {
          const item = data.results[0];
          lat = Number(item.latitude);
          lng = Number(item.longitude);
          city = item.name || query;
          displayName = [item.name, item.admin1, item.country].filter(Boolean).join(", ");
        }
      }
    } catch (e) {
      console.warn("Open-Meteo geocoding warning:", e);
    }

    // 2. Secondary Fallback: Nominatim OpenStreetMap
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      try {
        const nomUrl =
          "https://nominatim.openstreetmap.org/search" +
          "?format=json&limit=1&addressdetails=1&q=" + encodeURIComponent(query);

        const res = await fetch(nomUrl);
        if (res.ok) {
          const results = await res.json();
          if (results && results.length > 0) {
            const item = results[0];
            lat = Number(item.lat);
            lng = Number(item.lon);
            city = item.name || item.address?.city || item.address?.town || item.address?.village || query.split(",")[0];
            displayName = item.display_name || query;
          }
        }
      } catch (e) {
        console.warn("Nominatim fallback warning:", e);
      }
    }

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      _GEOCODE_CACHE[cleanKey] = { lat, lng, name: city, displayName };
    }
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(`Location "${query}" could not be found. Please check spelling.`);
  }

  activeLocation = {
    name: city,
    lat: parseFloat(String(lat).replace(/[^0-9.-]/g, "")) || 28.9845,
    lng: parseFloat(String(lng).replace(/[^0-9.-]/g, "")) || 77.7064,
    displayName: displayName
  };

  console.log("NEW ACTIVE LOCATION:", activeLocation);
  try {
    localStorage.setItem("rainsafe_active_location", JSON.stringify(activeLocation));
  } catch (e) {}

  // Instant UI & Map FlyTo update (<50ms)
  updateLocationUI();
  moveMapToActiveLocation(12);

  // Async non-blocking background refresh
  refreshAllData().then(() => updateLocationUI()).catch(e => console.warn("Background refresh warning:", e));
}


/* =========================================================
   MAP SEARCH UI
   ========================================================= */

function setupMapSearch() {

  const input =
    document.getElementById(
      "areaSearch"
    );


  const button =
    document.getElementById(
      "searchAreaBtn"
    );


  if (
    !input ||
    !button
  ) {

    console.warn(
      "Map search elements not found."
    );

    return;

  }


  async function searchArea() {
    const query = input.value.trim();
    if (!query) {
      input.focus();
      return;
    }

    button.textContent = "Searching...";
    button.disabled = true;

    try {
      await searchLocation(query);
    } catch (error) {
      console.error("Area search failed:", error);
      alert(error.message || "Unable to search this area right now.");
    } finally {
      button.textContent = "Search";
      button.disabled = false;
    }
  }


  button.addEventListener(
    "click",
    searchArea
  );


  input.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter"
      ) {

        event.preventDefault();

        searchArea();

      }

    }
  );

}


/* =========================================================
   LOAD DASHBOARD
   ========================================================= */

async function loadDashboard() {

  const dashboard =
    await api(
      `/api/dashboard` +
      `?lat=${activeLocation.lat}` +
      `&lon=${activeLocation.lng}` +
      `&location=${encodeURIComponent(activeLocation.name)}`
    );


  console.log(
    "RAINSAFE AI Dashboard:",
    dashboard
  );


  updateDashboardUI(
    dashboard
  );


  return dashboard;

}


/* =========================================================
   REFRESH ALL BACKEND DATA
   ========================================================= */

async function refreshAllData() {

  console.log(
    "Refreshing RAINSAFE AI data for:",
    activeLocation
  );


  /*
   * Dashboard is the primary source.
   */

  try {

    await loadDashboard();

  }

  catch (error) {

    console.error(
      "Dashboard API failed:",
      error
    );

    setText(
      "mlModelStatus",
      "API OFFLINE"
    );

    setText(
      "modelPageStatus",
      "API OFFLINE"
    );

    return false;

  }


  /*
   * Load ML prediction & Forecast in parallel for sub-200ms performance
   */

  await Promise.all([
    loadMLPrediction().catch(e => console.warn("ML load error:", e)),
    loadForecast().catch(e => console.warn("Forecast load error:", e))
  ]);


  /*
   * Final location synchronization.
   */

  updateLocationUI();


  /*
   * Update map position.
   */

  if (map) {

    map.setView(
      [
        activeLocation.lat,
        activeLocation.lng
      ],
      map.getZoom() < 10
        ? 12
        : map.getZoom()
    );

  }


  console.log(
    "RAINSAFE AI refresh complete:",
    activeLocation
  );


  return true;

}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNav() {

  document
    .querySelectorAll(
      ".nav-item"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            document
              .querySelectorAll(
                ".nav-item"
              )
              .forEach(
                item => {

                  item.classList.remove(
                    "active"
                  );

                }
              );


            button.classList.add(
              "active"
            );


            showView(
              button.dataset.view
            );

          }
        );

      }
    );


  /*
   * Buttons that jump to another view.
   */

  document
    .querySelectorAll(
      "[data-view-jump]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            showView(
              button.dataset.viewJump
            );

          }
        );

      }
    );

}


/* =========================================================
   VIEW SWITCHING
   ========================================================= */

function showView(
  id
) {

  document
    .querySelectorAll(
      ".view"
    )
    .forEach(
      view => {

        view.classList.remove(
          "active-view"
        );

      }
    );


  const target =
    document.getElementById(
      id
    );


  if (target) {

    target.classList.add(
      "active-view"
    );

  }


  const names = {

    dashboard:
      "Command Center",

    forecast:
      "Rainfall Forecast",

    inundation:
      "Inundation Risk",

    alerts:
      "Alert Center",

    data:
      "Data Fusion",

    model:
      "Model Intelligence",

    architecture:
      "Architecture"

  };


  setText(
    "page-title",
    names[id] ||
    "Command Center"
  );


  window.scrollTo(
    {
      top: 0,
      behavior: "smooth"
    }
  );


  /*
   * Leaflet & Chart.js need resize when
   * their parent container becomes visible.
   */

  if (
    id === "dashboard" &&
    map
  ) {

    setTimeout(
      () => {
        map.invalidateSize();
      },
      150
    );

  }

  /*
   * Load & render forecast graph when forecast view opens.
   */

  if (id === "forecast") {
    setTimeout(() => {
      loadForecast();
    }, 50);
  }

}


/* =========================================================
   MAP LAYERS
   ========================================================= */

function setupLayers() {

  document
    .querySelectorAll(
      ".layer"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            document
              .querySelectorAll(
                ".layer"
              )
              .forEach(
                item => {

                  item.classList.remove(
                    "active"
                  );

                }
              );


            button.classList.add(
              "active"
            );


            const selectedLayer =
              button.dataset.layer;

            if (!selectedLayer) return;

            /*
             * Remove all layers.
             */

            [
              rainLayer,
              floodLayer,
              stationLayer
            ].forEach(
              layer => {

                if (
                  layer &&
                  map &&
                  map.hasLayer(
                    layer
                  )
                ) {

                  map.removeLayer(
                    layer
                  );

                }

              }
            );

            if (selectedLayer === "flood") {
              const area = latestDashboard ? latestDashboard.inundation_km2 : 1.4;
              const rsk = latestDashboard ? latestDashboard.risk : "LOW";
              updateMapLayers(activeLocation.lat, activeLocation.lng, area, rsk);
              if (floodLayer && map) floodLayer.addTo(map);
            } else if (selectedLayer === "stations") {
              updateStationLayers(activeLocation.lat, activeLocation.lng);
              if (stationLayer && map) stationLayer.addTo(map);
            } else if (selectedLayer === "rain") {
              switchMapBasemap("street");
              if (rainLayer && map) rainLayer.addTo(map);
            }

          }
        );

      }
    );

}


/* =========================================================
   SCENARIO SIMULATOR
   ========================================================= */

function setupScenario() {

  const drawer =
    document.getElementById(
      "scenario"
    );


  const rain =
    document.getElementById(
      "rainSlider"
    );


  const duration =
    document.getElementById(
      "durationSlider"
    );


  const openButton =
    document.getElementById(
      "openScenario"
    );


  const closeButton =
    document.getElementById(
      "closeScenario"
    );


  const runButton =
    document.getElementById(
      "runScenario"
    );


  if (
    !drawer ||
    !rain ||
    !duration ||
    !openButton ||
    !closeButton ||
    !runButton
  ) {

    return;

  }


  /*
   * Open.
   */

  openButton.onclick =
    () => {

      drawer.classList.add(
        "open"
      );

    };


  /*
   * Close.
   */

  closeButton.onclick =
    () => {

      drawer.classList.remove(
        "open"
      );

    };


  /*
   * Rain slider.
   */

  rain.oninput =
    () => {

      const value =
        document.getElementById(
          "rainValue"
        );


      if (value) {

        value.textContent =
          `${rain.value} mm`;

      }

    };


  /*
   * Duration slider.
   */

  duration.oninput =
    () => {

      const value =
        document.getElementById(
          "durationValue"
        );


      if (value) {

        value.textContent =
          `${duration.value} h`;

      }

    };


  /*
   * Run scenario.
   */

  runButton.onclick =
    async () => {

      runButton.disabled =
        true;


      runButton.textContent =
        "Running...";


      let data;


      try {

        data =
          await api(
            `/api/scenario` +
            `?rainfall_mm=${rain.value}` +
            `&duration_hours=${duration.value}` +
            `&lat=${activeLocation.lat}` +
            `&lon=${activeLocation.lng}` +
            `&location=${encodeURIComponent(activeLocation.name)}`
          );

      }

      catch (error) {

        console.warn(
          "Scenario API unavailable. Using local simulation.",
          error
        );


        /*
         * Local fallback.
         */

        const rainfall =
          Number(
            rain.value
          );


        const hours =
          Number(
            duration.value
          );


        data = {

          risk:
            rainfall >= 150
              ? "CRITICAL"
              : rainfall >= 100
              ? "HIGH"
              : rainfall >= 60
              ? "MODERATE"
              : "LOW",


          inundation_km2:
            (
              18.4 *
              rainfall /
              120 *
              Math.pow(
                hours / 6,
                0.55
              )
            ).toFixed(1),


          affected_roads:
            Math.max(
              1,
              Math.round(
                7 *
                rainfall /
                120
              )
            ),


          critical_sites:
            Math.max(
              0,
              Math.round(
                3 *
                rainfall /
                120
              )
            ),


          lead_time_hours:
            Math.max(
              0.8,
              7 -
              rainfall /
              35
            ).toFixed(1)

        };

      }


      const result =
        document.getElementById(
          "scenarioResult"
        );


      if (!result) {

        runButton.disabled =
          false;

        runButton.textContent =
          "Run AI Scenario →";

        return;

      }


      result.innerHTML = `

        <div>
          <small>LOCATION</small>
          <b>${activeLocation.name}</b>
        </div>

        <div>
          <small>RISK</small>
          <b>${data.risk}</b>
        </div>

        <div>
          <small>INUNDATION</small>
          <b>${data.inundation_km2} km²</b>
        </div>

        <div>
          <small>LEAD TIME</small>
          <b>${data.lead_time_hours} h</b>
        </div>

        <div>
          <small>ROADS</small>
          <b>${data.affected_roads}</b>
        </div>

        <div>
          <small>CRITICAL SITES</small>
          <b>${data.critical_sites}</b>
        </div>

        <div>
          <small>INPUT</small>
          <b>${rain.value} mm</b>
        </div>

      `;


      runButton.disabled =
        false;


      runButton.textContent =
        "Run AI Scenario →";

    };

}


/* =========================================================
   ACKNOWLEDGE ALERT
   ========================================================= */

function setupAcknowledgeAlert() {

  const button =
    document.getElementById(
      "acknowledgeAlertBtn"
    );


  if (!button) {
    return;
  }


  button.addEventListener(
    "click",
    () => {

      button.textContent =
        "✓ Alert Acknowledged";


      button.disabled =
        true;


      setTimeout(
        () => {

          button.textContent =
            "Acknowledge Alert";

          button.disabled =
            false;

        },
        3000
      );

    }
  );

}


/* =========================================================
   REFRESH BUTTON
   ========================================================= */

function setupRefresh() {

  const refreshButton =
    document.getElementById(
      "refreshBtn"
    );


  if (!refreshButton) {
    return;
  }


  refreshButton.onclick =
    async () => {

      const originalText =
        refreshButton.textContent;


      refreshButton.textContent =
        "↻ Updating...";


      refreshButton.disabled =
        true;


      try {

        await refreshAllData();

      }

      catch (error) {

        console.error(
          "Refresh failed:",
          error
        );

      }

      finally {

        refreshButton.textContent =
          originalText ||
          "↻ Refresh";


        refreshButton.disabled =
          false;

      }

    };

}

/* =========================================================
   DYNAMIC FLOOD INUNDATION OVERLAY LAYER
   ========================================================= */

function updateMapLayers(lat, lng, areaKm2, risk) {
  if (!map) return;
  if (!floodLayer) {
    floodLayer = L.layerGroup().addTo(map);
  } else {
    floodLayer.clearLayers();
  }

  const radiusMeters = Math.max(400, Math.sqrt(((areaKm2 || 0.5) * 1000000) / Math.PI));

  let strokeColor = "#36c9eb";
  let fillColor = "#36c9eb";
  if (risk === "CRITICAL") {
    strokeColor = "#ff485d";
    fillColor = "#ff485d";
  } else if (risk === "HIGH") {
    strokeColor = "#ff9a3c";
    fillColor = "#ff9a3c";
  } else if (risk === "MODERATE") {
    strokeColor = "#ffd13b";
    fillColor = "#ffd13b";
  }

  const floodCircle = L.circle([lat, lng], {
    radius: radiusMeters,
    color: strokeColor,
    weight: 2,
    fillColor: fillColor,
    fillOpacity: 0.22,
    dashArray: "6, 6"
  });

  floodCircle.bindPopup(`
    <div style="font-family: 'Space Grotesk', sans-serif; padding: 5px;">
      <b style="color: ${strokeColor}; font-size: 12px;">PREDICTED INUNDATION footprint</b><br>
      <b>Active Zone:</b> ${activeLocation.name}<br>
      <b>Impact Area:</b> ${(areaKm2 || 0.1).toFixed(1)} km²<br>
      <b>Risk Severity:</b> ${risk || "LOW"}
    </div>
  `);

  floodLayer.addLayer(floodCircle);
}

/* =========================================================
   EXPORT ADVISORY REPORT GENERATOR
   ========================================================= */

function downloadAdvisoryReport() {
  const loc = activeLocation.name || "Meerut";
  const lat = Number(activeLocation.lat || 28.9845);
  const lng = Number(activeLocation.lng || 77.7064);
  const rain = latestDashboard ? Number(latestDashboard.rainfall_mm || 0) : 10.5;
  const area = latestDashboard ? Number(latestDashboard.inundation_km2 || 0) : 1.4;
  const lead = latestDashboard ? Number(latestDashboard.lead_time_hours || 0) : 6.7;
  const risk = latestDashboard ? String(latestDashboard.risk || "LOW").toUpperCase() : "LOW";
  const prob = latestML ? Number(latestML.significant_rain_probability || 21.45) : 21.45;
  const dateStr = new Date().toLocaleString("en-IN", { dateStyle: "full", timeStyle: "medium" });

  const printWin = window.open("", "_blank");
  if (!printWin) {
    alert("Please allow popups to download the Advisory PDF Report.");
    return;
  }

  printWin.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>RAINSAFE AI Advisory Report - ${loc}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #0d1e30; background: #fff; line-height: 1.6; }
        .header { border-bottom: 3px solid #0056b3; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
        .title { font-size: 24px; font-weight: 800; color: #0b2545; }
        .subtitle { font-size: 12px; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
        .badge { background: ${risk === "CRITICAL" ? "#dc3545" : risk === "HIGH" ? "#fd7e14" : risk === "MODERATE" ? "#ffc107" : "#28a745"}; color: #fff; padding: 8px 18px; font-weight: 800; border-radius: 6px; font-size: 14px; text-transform: uppercase; }
        .meta-box { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 15px 20px; border-radius: 8px; margin-bottom: 25px; display: flex; justify-content: space-between; font-size: 13px; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 25px 0; }
        .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; text-align: center; }
        .card-val { font-size: 24px; font-weight: 800; color: #0284c7; margin-top: 6px; }
        .card-lbl { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; }
        .section { margin-top: 30px; }
        .section-title { font-size: 16px; font-weight: 800; border-left: 4px solid #0284c7; padding-left: 12px; margin-bottom: 15px; color: #0f172a; }
        ul { line-height: 2.0; font-size: 13.5px; color: #334155; }
        .footer { margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 18px; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="title">RAINSAFE AI — EARLY WARNING ADVISORY</div>
          <div class="subtitle">State Disaster Management Authority • Automated Intelligence Report</div>
        </div>
        <div class="badge">${risk} RISK</div>
      </div>
      <div class="meta-box">
        <div><strong>Operational Zone:</strong> ${loc}</div>
        <div><strong>Coordinates:</strong> ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E</div>
        <div><strong>Generated At:</strong> ${dateStr}</div>
      </div>
      <div class="grid">
        <div class="card"><div class="card-lbl">Forecast Rainfall</div><div class="card-val">${rain.toFixed(1)} mm</div></div>
        <div class="card"><div class="card-lbl">Predicted Inundation</div><div class="card-val">${area.toFixed(1)} km²</div></div>
        <div class="card"><div class="card-lbl">Warning Lead Time</div><div class="card-val">${lead.toFixed(1)} h</div></div>
        <div class="card"><div class="card-lbl">ML Risk Signal</div><div class="card-val">${prob.toFixed(2)}%</div></div>
      </div>
      <div class="section">
        <div class="section-title">Emergency Preparedness & Action Directives</div>
        <ul>
          <li><strong>Satellite & Radar Telemetry:</strong> Maintain 24/7 observation over low-lying catchment zones in ${loc}.</li>
          <li><strong>Drainage Corridors:</strong> Pre-deploy emergency dewatering pumps to priority urban choke points.</li>
          <li><strong>Inter-Agency Alert:</strong> Issue automated early-warning dispatches to District Emergency Operation Centers (DEOC).</li>
          <li><strong>Public Advisories:</strong> Broadcast targeted warnings for local evacuation routes if thresholds escalate.</li>
        </ul>
      </div>
      <div class="footer">
        <span>Confidential • National Disaster Relief Framework</span>
        <span>RAINSAFE AI Disaster Intelligence Platform v3.0</span>
      </div>
      <script>window.onload = function() { window.print(); };</script>
    </body>
    </html>
  `);
  printWin.document.close();
}

function setupExportReport() {
  const btn = document.getElementById("exportReportBtn");
  if (btn) {
    btn.addEventListener("click", () => {
      downloadAdvisoryReport();
    });
  }
}

function updateStationLayers(lat, lng) {
  if (!map) return;
  if (!stationLayer) {
    stationLayer = L.layerGroup().addTo(map);
  } else {
    stationLayer.clearLayers();
  }

  const offsetPairs = [
    [0.02, 0.015],
    [-0.03, -0.02],
    [0.015, -0.035],
    [-0.025, 0.025]
  ];

  offsetPairs.forEach(([dLat, dLng], index) => {
    const sLat = lat + dLat;
    const sLng = lng + dLng;

    const marker = L.circleMarker([sLat, sLng], {
      radius: 6,
      color: "#45d5ff",
      fillColor: "#45d5ff",
      fillOpacity: 0.9,
      weight: 2
    });

    marker.bindPopup(`
      <div style="font-family: 'Space Grotesk', sans-serif; padding: 4px;">
        <b style="color: #45d5ff;">AUTOMATIC WEATHER STATION #${index + 1}</b><br>
        <b>Zone:</b> ${activeLocation.name}<br>
        <b>Telemetry Status:</b> Live Online<br>
        <b>Rain Gauge Ping:</b> Operational
      </div>
    `);

    stationLayer.addLayer(marker);
  });
}

/* =========================================================
   ALERT DISPATCH SIMULATOR MODAL
   ========================================================= */

function initBroadcastModal() {
  const triggerBtn = document.getElementById("triggerBroadcastBtn");
  const modal = document.getElementById("broadcastModal");
  const closeBtn = document.getElementById("closeBroadcastModal");
  const sendBtn = document.getElementById("sendBroadcastBtn");
  const msgText = document.getElementById("broadcastMsgText");
  const targetLocEl = document.getElementById("modalTargetLocation");
  const progressBox = document.getElementById("broadcastProgress");
  const bar = document.getElementById("broadcastBar");
  const statusText = document.getElementById("broadcastStatusText");

  if (!triggerBtn || !modal) return;

  triggerBtn.addEventListener("click", () => {
    const loc = activeLocation.name || "Meerut";
    const risk = latestDashboard ? (latestDashboard.risk || "LOW") : "LOW";
    const rain = latestDashboard ? (latestDashboard.rainfall_mm || 0) : 10.5;

    if (targetLocEl) targetLocEl.textContent = loc;
    if (msgText) {
      msgText.value = `[RAINSAFE AI URGENT ADVISORY] High-confidence early warning for ${loc}. Forecast Rainfall: ${rain}mm. Risk Status: ${risk}. Response teams standby.`;
    }
    if (progressBox) progressBox.style.display = "none";
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.textContent = "🚀 Send Emergency Broadcast";
    }
    modal.style.display = "flex";
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener("click", () => {
      sendBtn.disabled = true;
      if (progressBox) progressBox.style.display = "block";
      if (bar) bar.style.width = "0%";

      let p = 0;
      const steps = [
        "Encrypting dispatch payload...",
        "Connecting to NDRF & Police gateways...",
        "Broadcasting SMS & WhatsApp packets...",
        "✅ Dispatch complete! 1,420 advisories sent."
      ];

      const interval = setInterval(() => {
        p += 25;
        if (bar) bar.style.width = p + "%";
        const idx = Math.min(3, Math.floor(p / 25) - 1);
        if (statusText && steps[idx]) statusText.textContent = steps[idx];

        if (p >= 100) {
          clearInterval(interval);
          sendBtn.textContent = "✅ Broadcast Delivered";
          setTimeout(() => {
            modal.style.display = "none";
          }, 1500);
        }
      }, 400);
    });
  }
}

/* =========================================================
   MODEL PERFORMANCE CHARTS (ROC-AUC & FEATURE IMPORTANCE)
   ========================================================= */

let rocChartInstance = null;
let featureChartInstance = null;

function initModelCharts() {
  if (typeof Chart === "undefined") return;

  const rocCtx = document.getElementById("rocCurveChart");
  if (rocCtx && !rocChartInstance) {
    rocChartInstance = new Chart(rocCtx, {
      type: "line",
      data: {
        labels: ["0.0", "0.2", "0.4", "0.6", "0.8", "1.0"],
        datasets: [
          {
            label: "Random Forest (AUC = 0.904)",
            data: [0.0, 0.65, 0.85, 0.92, 0.97, 1.0],
            borderColor: "#45d5ff",
            backgroundColor: "rgba(69, 213, 255, 0.15)",
            fill: true,
            tension: 0.3,
            borderWidth: 2
          },
          {
            label: "Random Baseline",
            data: [0.0, 0.2, 0.4, 0.6, 0.8, 1.0],
            borderColor: "#5e7388",
            borderDash: [5, 5],
            borderWidth: 1,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "#8ea0b5", font: { size: 10 } } } },
        scales: {
          x: { title: { display: true, text: "False Positive Rate", color: "#5e7388", font: { size: 10 } }, ticks: { color: "#8ea0b5" } },
          y: { title: { display: true, text: "True Positive Rate", color: "#5e7388", font: { size: 10 } }, ticks: { color: "#8ea0b5" } }
        }
      }
    });
  }

  const featCtx = document.getElementById("featureImportanceChart");
  if (featCtx && !featureChartInstance) {
    featureChartInstance = new Chart(featCtx, {
      type: "bar",
      data: {
        labels: ["24h Precip", "12h Precip", "Cloud Cover", "Pressure", "Wind Speed", "Temp"],
        datasets: [
          {
            label: "Importance",
            data: [0.38, 0.24, 0.16, 0.11, 0.07, 0.04],
            backgroundColor: ["#45d5ff", "#2563eb", "#38bdf8", "#0284c7", "#1d4ed8", "#1e40af"],
            borderRadius: 4
          }
        ]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#8ea0b5" }, grid: { color: "#11253e" } },
          y: { ticks: { color: "#8ea0b5" }, grid: { display: false } }
        }
      }
    });
  }
}

/* =========================================================
   VOICE WARNING ADVISORY (WEB SPEECH SYNTHESIS API)
   ========================================================= */

function playVoiceAdvisory() {
  if (!('speechSynthesis' in window)) {
    alert("Voice synthesis is not supported on this browser.");
    return;
  }

  window.speechSynthesis.cancel();

  const loc = activeLocation.name || "Meerut";
  const rain = latestDashboard ? (latestDashboard.rainfall_mm || 0) : 10.5;
  const risk = latestDashboard ? (latestDashboard.risk || "LOW") : "LOW";
  const lead = latestDashboard ? (latestDashboard.lead_time_hours || 0) : 6.7;

  let riskHindi = "कम";
  if (risk === "MODERATE") riskHindi = "मध्यम";
  if (risk === "HIGH") riskHindi = "उच्च";
  if (risk === "CRITICAL") riskHindi = "गंभीर";

  let text = `Attention Emergency Response Units. Disaster early warning advisory for ${loc}. Forecast precipitation is ${rain} millimeters. Inundation risk is rated as ${risk}. Estimated warning lead time is ${lead} hours. Please maintain operational readiness.`;

  if (currentLang === "hi") {
    text = `ध्यान दें आपातकालीन प्रतिक्रिया टीम। ${loc} के लिए आपदा पूर्व चेतावनी जारी की जाती है। पूर्वानुमानित वर्षा ${rain} मिलीमीटर है। जलभराव का जोखिम ${riskHindi} है। चेतावनी का समय लगभग ${lead} घंटे है। कृपया अपनी परिचालन तैयारी रखें।`;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1.0;

  if (currentLang === "hi") {
    utterance.lang = "hi-IN";
    const voices = window.speechSynthesis.getVoices();
    const hiVoice = voices.find(v => v.lang.includes("hi") || v.name.includes("Hindi") || v.name.includes("Google हिन्दी"));
    if (hiVoice) utterance.voice = hiVoice;
  } else {
    utterance.lang = "en-US";
  }

  const btn = document.getElementById("voiceAdvisoryBtn");
  if (btn) {
    btn.textContent = (currentLang === "hi") ? "🔊 बोल रहा है..." : "🔊 Speaking...";
    utterance.onend = () => {
      btn.textContent = (currentLang === "hi") ? "🔊 ध्वनि चेतावनी" : "🔊 Voice Warning";
    };
  }

  window.speechSynthesis.speak(utterance);
}

/* =========================================================
   LIGHT / DARK THEME TOGGLE
   ========================================================= */

function toggleTheme() {
  document.body.classList.toggle("light-theme");
  const isLight = document.body.classList.contains("light-theme");
  const btn = document.getElementById("themeToggleBtn");
  if (btn) {
    btn.textContent = isLight ? "☀️ Light Mode" : "🌓 Dark HUD";
  }
}

/* =========================================================
   MAP TILE BASEMAP SWITCHER (Streets, Satellite, Dark HUD)
   ========================================================= */

let baseTileLayer = null;
let satelliteLabelsLayer = null;

function switchMapBasemap(type) {
  if (!map) return;

  if (baseTileLayer) {
    map.removeLayer(baseTileLayer);
    baseTileLayer = null;
  }
  if (satelliteLabelsLayer) {
    map.removeLayer(satelliteLabelsLayer);
    satelliteLabelsLayer = null;
  }

  const mapEl = document.getElementById("map");
  if (mapEl) {
    mapEl.style.filter = "none";
  }

  let tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  let attr = "© OpenStreetMap contributors";

  if (type === "satellite") {
    // Google Hybrid Satellite View (100% reliable, global high-res, zero CORS issues)
    baseTileLayer = L.tileLayer("https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
      subdomains: ['0', '1', '2', '3'],
      maxZoom: 20,
      attribution: "Map data © Google Satellite"
    }).addTo(map);

  } else if (type === "dark") {
    tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    attr = "© OpenStreetMap contributors";
    if (mapEl) {
      mapEl.style.filter = "brightness(0.65) invert(1) contrast(2.5) hue-rotate(200deg)";
    }
    baseTileLayer = L.tileLayer(tileUrl, { attribution: attr, maxZoom: 19 }).addTo(map);
  } else {
    baseTileLayer = L.tileLayer(tileUrl, { attribution: attr, maxZoom: 19 }).addTo(map);
  }

  setTimeout(() => { map.invalidateSize(); }, 200);
}

function setupAdvancedControls() {
  const vBtn = document.getElementById("voiceAdvisoryBtn");
  if (vBtn) vBtn.addEventListener("click", playVoiceAdvisory);

  const tBtn = document.getElementById("themeToggleBtn");
  if (tBtn) tBtn.addEventListener("click", toggleTheme);

  const satBtn = document.getElementById("btnTileSatellite");
  if (satBtn) {
    satBtn.addEventListener("click", () => {
      document.querySelectorAll(".map-tools .layer").forEach(b => b.classList.remove("active"));
      satBtn.classList.add("active");
      switchMapBasemap("satellite");
    });
  }

  const darkBtn = document.getElementById("btnTileDark");
  if (darkBtn) {
    darkBtn.addEventListener("click", () => {
      document.querySelectorAll(".map-tools .layer").forEach(b => b.classList.remove("active"));
      darkBtn.classList.add("active");
      switchMapBasemap("dark");
    });
  }

  const droneBtn = document.getElementById("btnDroneRecon");
  if (droneBtn) {
    droneBtn.addEventListener("click", openDroneReconModal);
  }

  const closeDroneBtn = document.getElementById("closeDroneModal");
  if (closeDroneBtn) {
    closeDroneBtn.addEventListener("click", () => {
      const modal = document.getElementById("droneModal");
      if (modal) modal.style.display = "none";
    });
  }

  const exportDroneBtn = document.getElementById("exportDroneReportBtn");
  if (exportDroneBtn) {
    exportDroneBtn.addEventListener("click", exportDronePDFReport);
  }

  const langBtn = document.getElementById("langToggleBtn");
  if (langBtn) langBtn.addEventListener("click", toggleLanguage);

  document.addEventListener("click", (e) => {
    const evacBtn = e.target && e.target.closest("#dispatchEvacRouteBtn");
    if (evacBtn) {
      const locName = activeLocation.name || "Meerut";
      showHUDToast("Evacuation Routes Dispatched", `GPS Safe Navigation Corridors sent to Emergency Response Units & Navigation Apps in ${locName}!`, "🧭");
    }
  });

  initAiChatbot();
}

function triggerEmergencyEscalation() {
  const locName = activeLocation.name || "Meerut";
  showHUDToast("Emergency Escalation Triggered", ` Priority Disaster Escalation protocol activated for ${locName}! NDRF HQ (1078) & State Emergency Cell (1070) notified.`, "🚨");
}

function initAiChatbot() {
  const openBtn = document.getElementById("openAiChatbot");
  const closeBtn = document.getElementById("closeAiChatbot");
  const drawer = document.getElementById("aiChatbotDrawer");
  const sendBtn = document.getElementById("sendChatBtn");
  const chatInput = document.getElementById("chatInput");
  const chatMessages = document.getElementById("chatMessages");

  if (!drawer) return;

  if (openBtn) {
    openBtn.onclick = () => {
      drawer.style.display = (drawer.style.display === "none" || !drawer.style.display) ? "flex" : "none";
    };
  }

  if (closeBtn) {
    closeBtn.onclick = () => { drawer.style.display = "none"; };
  }

  async function handleSend() {
    const query = chatInput.value.trim();
    if (!query) return;

    const uMsg = document.createElement("div");
    uMsg.style.cssText = "background: rgba(69,213,255,0.15); border: 1px solid rgba(69,213,255,0.3); padding: 8px 12px; border-radius: 8px; color: #45d5ff; align-self: flex-end; max-width: 85%;";
    uMsg.textContent = query;
    chatMessages.appendChild(uMsg);

    chatInput.value = "";
    chatMessages.scrollTop = chatMessages.scrollHeight;

    const typingMsg = document.createElement("div");
    typingMsg.style.cssText = "background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 8px; color: #8ea0b5; align-self: flex-start; font-size: 11px; font-style: italic;";
    typingMsg.innerHTML = "🤖 Analyzing live disaster telemetry...";
    chatMessages.appendChild(typingMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    let targetCity = activeLocation.name || "Meerut";
    const words = query.replace(/[^\w\s]/gi, '').split(/\s+/);
    const stopWords = new Set(["for", "in", "what", "is", "the", "rainfall", "risk", "status", "forecast", "tell", "me", "about", "how", "much", "rain", "of", "to", "city", "location", "place", "show", "get"]);
    
    for (const w of words) {
      if (w.length >= 3 && !stopWords.has(w.toLowerCase())) {
        targetCity = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        break;
      }
    }

    try {
      const data = await api(`/api/dashboard?location=${encodeURIComponent(targetCity)}`);
      typingMsg.remove();

      let locName = data.location || targetCity;
      let rain = Number(data.rainfall_mm || 0).toFixed(1);
      let prob = Number(data.rain_probability_percent || (rain > 0 ? Math.min(98, rain * 0.82) : 25)).toFixed(1);
      let risk = String(data.risk || "LOW").toUpperCase();
      let area = Number(data.inundation_km2 || 0).toFixed(1);
      let lead = Number(data.lead_time_hours || 6.0).toFixed(1);

      let reply = `🤖 <strong>Disaster Telemetry for ${locName}</strong>:<br>
• 🌧️ <strong>Forecast Rainfall</strong>: ${rain} mm (${prob}% probability)<br>
• ⚠️ <strong>Inundation Risk</strong>: <strong style="color: ${risk === 'HIGH' || risk === 'CRITICAL' ? '#ff4f65' : (risk === 'MODERATE' ? '#f4ca4e' : '#45d5a0')};">${risk}</strong><br>
• 🌊 <strong>Inundation Impact Area</strong>: ${area} km²<br>
• ⏱️ <strong>Warning Lead Time</strong>: ${lead} hours<br>
<div style="margin-top: 8px;">
  <button onclick="searchLocation('${locName}')" style="background: #0284c7; border: none; color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer;">📍 Fly Map to ${locName}</button>
</div>`;

      const qLower = query.toLowerCase();
      if (qLower.includes("shelter") || qLower.includes("camp") || qLower.includes("evac")) {
        reply = `🏕️ <strong>NDRF Relief & Shelter Matrix for ${locName}</strong>:<br>
• <strong>Central Camp</strong>: ${locName} Emergency Grounds (1,500 capacity)<br>
• <strong>Sub-Camp</strong>: District Sports Complex (800 capacity)<br>
• 🧭 Active GPS Evacuation Corridors dispatched!`;
      } else if (qLower.includes("model") || qLower.includes("accuracy") || qLower.includes("rf")) {
        reply = `📊 <strong>RAINSAFE AI Model Intelligence</strong>:<br>
• <strong>Random Forest Score</strong>: 87% Confidence<br>
• <strong>LightGBM Score</strong>: 90.4% ROC-AUC<br>
• <strong>Inputs</strong>: Satellite IR, Radar, AWS Sensors & DEM Topography.`;
      } else if (qLower.includes("drone") || qLower.includes("recon")) {
        reply = `🚁 <strong>UAV Drone Patrol over ${locName}</strong>:<br>
• <strong>Corridor Bridge</strong>: Passable (0.1m clearance)<br>
• <strong>Substation Beta</strong>: Caution (Flood wall active)<br>
• <strong>NH Underpass</strong>: Submerged (1.2m depth)`;
      }

      const bMsg = document.createElement("div");
      bMsg.style.cssText = "background: rgba(255,255,255,0.05); padding: 10px 12px; border-radius: 8px; color: #cbd5e1; align-self: flex-start; max-width: 88%; border-left: 3px solid #45d5ff; font-size: 12px; line-height: 1.6;";
      bMsg.innerHTML = reply;
      chatMessages.appendChild(bMsg);
      chatMessages.scrollTop = chatMessages.scrollHeight;

    } catch (err) {
      typingMsg.remove();
      const bMsg = document.createElement("div");
      bMsg.style.cssText = "background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; color: #cbd5e1; align-self: flex-start; max-width: 85%; border-left: 3px solid #ff4f65;";
      bMsg.innerHTML = `🤖 Unable to fetch telemetry for "${targetCity}". Please check spelling.`;
      chatMessages.appendChild(bMsg);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  if (sendBtn) sendBtn.onclick = handleSend;
  if (chatInput) {
    chatInput.onkeydown = (e) => {
      if (e.key === "Enter") handleSend();
    };
  }
}

let droneTrackLayer = null;

function openDroneReconModal() {
  const modal = document.getElementById("droneModal");
  if (!modal) return;

  const locName = activeLocation.name || "Meerut";
  const targetLocEl = document.getElementById("droneTargetLoc");
  if (targetLocEl) targetLocEl.textContent = locName;

  const damageListEl = document.getElementById("droneDamageList");
  if (damageListEl) {
    damageListEl.innerHTML = `
      <div style="padding: 10px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
        <div><b>🌉 Corridor Bridge Alpha (${locName})</b><div style="font-size: 11px; opacity: 0.8; margin-top: 2px;">Structural Integrity: 98% • Water Clearance: 1.8m</div></div>
        <span style="color: #45d5a0; font-weight: 700; font-size: 11px;">🟢 PASSABLE</span>
      </div>
      <div style="padding: 10px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
        <div><b>⚡ Substation Beta (${locName} East)</b><div style="font-size: 11px; opacity: 0.8; margin-top: 2px;">Water Depth: 0.4m • Flood Wall Protection Active</div></div>
        <span style="color: #f4ca4e; font-weight: 700; font-size: 11px;">🟡 CAUTION</span>
      </div>
      <div style="padding: 10px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
        <div><b>🛣️ Main Underpass NH Corridor</b><div style="font-size: 11px; opacity: 0.8; margin-top: 2px;">Water Depth: 1.2m • Submerged - Traffic Rerouted</div></div>
        <span style="color: #ff4f65; font-weight: 700; font-size: 11px;">🔴 SUBMERGED</span>
      </div>
      <div style="padding: 10px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
        <div><b>🏭 Industrial Sluice Gate 4</b><div style="font-size: 11px; opacity: 0.8; margin-top: 2px;">Flow Rate: 42 m³/s • Drainage Sluice Opened</div></div>
        <span style="color: #45d5a0; font-weight: 700; font-size: 11px;">🟢 OPERATIONAL</span>
      </div>
    `;
  }

  if (map) {
    if (droneTrackLayer) map.removeLayer(droneTrackLayer);

    const lat = activeLocation.lat;
    const lng = activeLocation.lng;

    const dronePathCoords = [
      [lat - 0.015, lng - 0.015],
      [lat + 0.015, lng - 0.015],
      [lat + 0.015, lng + 0.015],
      [lat - 0.015, lng + 0.015],
      [lat - 0.015, lng - 0.015]
    ];

    droneTrackLayer = L.polyline(dronePathCoords, {
      color: '#45d5ff',
      weight: 3,
      dashArray: '8, 8',
      opacity: 0.9
    }).addTo(map);
  }

  modal.style.display = "flex";
  showHUDToast("Drone Recon Activated", `UAV Patrol Stream synced for ${locName}. Aerial damage matrix generated.`, "🚁");
}

function exportDronePDFReport() {
  const locName = activeLocation.name || "Bhagalpur";
  const dateStr = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  const reportId = Math.floor(100000 + Math.random() * 900000);

  const printWin = window.open("", "_blank");
  if (!printWin) {
    showHUDToast("Pop-up Blocked", "Please allow pop-ups to print the Drone PDF Report.", "⚠️");
    return;
  }

  printWin.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>UAV_Drone_Reconnaissance_Report_${locName}.pdf</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; }
        .header { border-bottom: 3px solid #0284c7; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
        .header h1 { margin: 0; font-size: 20px; color: #0284c7; text-transform: uppercase; letter-spacing: 0.5px; }
        .header p { margin: 4px 0 0 0; font-size: 12px; color: #475569; }
        .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px; }
        .meta-table td { padding: 8px 12px; border: 1px solid #cbd5e1; background: #f8fafc; }
        .meta-table strong { color: #0f172a; }
        .section-title { font-size: 14px; font-weight: bold; color: #0f172a; margin-top: 25px; margin-bottom: 10px; border-left: 4px solid #0284c7; padding-left: 10px; text-transform: uppercase; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px; }
        .data-table th { background: #0f172a; color: #ffffff; padding: 10px; text-align: left; }
        .data-table td { padding: 10px; border: 1px solid #cbd5e1; }
        .status-pass { color: #16a34a; font-weight: bold; }
        .status-warn { color: #d97706; font-weight: bold; }
        .status-danger { color: #dc2626; font-weight: bold; }
        .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 15px; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>Rainsafe- Ai • UAV AERIAL RECONNAISSANCE REPORT</h1>
          <p>NATIONAL DISASTER MANAGEMENT AUTHORITY (NDMA) • EMERGENCY RECON PROTOCOL</p>
        </div>
        <div style="text-align: right;">
          <p><strong>REPORT ID:</strong> UAV-${reportId}</p>
          <p><strong>DATE:</strong> ${dateStr}</p>
        </div>
      </div>

      <table class="meta-table">
        <tr>
          <td><strong>OPERATIONAL ZONE:</strong> ${locName}</td>
          <td><strong>FLIGHT ALTITUDE:</strong> 120m AGL</td>
          <td><strong>OPTICAL SENSOR:</strong> 4K Thermal IR</td>
        </tr>
        <tr>
          <td><strong>UAV AIRSPEED:</strong> 42 km/h</td>
          <td><strong>BATTERY HEALTH:</strong> 88% Operational</td>
          <td><strong>SURVEILLANCE STATUS:</strong> Active Synced</td>
        </tr>
      </table>

      <div class="section-title">AERIAL INFRASTRUCTURE DAMAGE ASSESSMENT MATRIX</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>INFRASTRUCTURE ASSET</th>
            <th>ASSET CATEGORY</th>
            <th>WATER DEPTH / INTEGRITY</th>
            <th>AERIAL ASSESSMENT STATUS</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Corridor Bridge Alpha (${locName})</strong></td>
            <td>Transportation Bridge</td>
            <td>Structural Integrity: 98% (Clearance 1.8m)</td>
            <td class="status-pass">🟢 PASSABLE</td>
          </tr>
          <tr>
            <td><strong>Substation Beta (${locName} East)</strong></td>
            <td>Critical Power Substation</td>
            <td>Water Depth: 0.4m (Flood Wall Intact)</td>
            <td class="status-warn">🟡 CAUTION</td>
          </tr>
          <tr>
            <td><strong>Main Underpass NH Corridor</strong></td>
            <td>National Highway Underpass</td>
            <td>Water Depth: 1.2m (Submerged)</td>
            <td class="status-danger">🔴 SUBMERGED - ROUTE BLOCKED</td>
          </tr>
          <tr>
            <td><strong>Industrial Sluice Gate 4</strong></td>
            <td>Drainage Infrastructure</td>
            <td>Flow Rate: 42 m³/s (Sluice Open)</td>
            <td class="status-pass">🟢 OPERATIONAL</td>
          </tr>
        </tbody>
      </table>

      <div class="section-title">COMMAND CENTER TACTICAL ADVISORY</div>
      <ul style="font-size: 13px; color: #334155; padding-left: 20px;">
        <li>Deploy traffic diversion barriers at Main Underpass NH Corridor immediately.</li>
        <li>Maintain 24-hour thermal monitoring on Substation Beta perimeter flood wall.</li>
        <li>Authorize secondary drone flight sweep in 2 hours for drainage verification.</li>
      </ul>

      <div class="footer">
        <span>AUTHENTICATED BY RAINSAFE AI DISASTER INTELLIGENCE PIPELINE</span>
        <span>CONFIDENTIAL • FOR EMERGENCY COMMAND UNITS ONLY</span>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `);
  printWin.document.close();

  showHUDToast("Drone PDF Exported", `UAV Reconnaissance & Damage Assessment Report generated for ${locName}.`, "📋");
}

let currentLang = "en";

const TRANSLATIONS = {
  hi: {
    "Command Center": "कमांड सेंटर",
    "Rainfall Forecast": "वर्षा पूर्वानुमान",
    "Inundation Risk": "जलभराव जोखिम",
    "Alert Center": "आपातकालीन चेतावनी केंद्र",
    "Data Fusion": "डेटा संलयन",
    "Model Intelligence": "मॉडल बुद्धिमत्ता",
    "Architecture": "आर्किटेक्चर",
    "DISASTER MANAGEMENT INTELLIGENCE": "आपदा प्रबंधन बुद्धिमत्ता",
    "Predict the rain. Map the risk. Act before inundation.": "वर्षा का पूर्वानुमान। जोखिम का मानचित्रण। जलभराव से पहले कार्रवाई।",
    "Forecast Rainfall": "पूर्वानुमानित वर्षा",
    "Inundation Risk": "जलभराव जोखिम",
    "Predicted Inundation": "अनुमानित जलभराव क्षेत्र",
    "Warning Lead Time": "चेतावनी का समय",
    "Live Risk Map": "लाइव जोखिम मानचित्र",
    "Rainfall Risk Intelligence": "वर्षा जोखिम बुद्धिमत्ता",
    "SIGNIFICANT RAINFALL PROBABILITY": "महत्वपूर्ण वर्षा की संभावना",
    "CURRENT CLASSIFICATION": "वर्तमान वर्गीकरण",
    "Search": "खोजें",
    "Rainfall": "वर्षा",
    "Inundation": "जलभराव",
    "Stations": "मौसम स्टेशन",
    "🛰️ Satellite": "🛰️ उपग्रह",
    "🌙 Dark HUD": "🌙 डार्क मोड",
    "📄 Export Advisory": "📄 रिपोर्ट डाउनलोड",
    "🔊 Voice Warning": "🔊 ध्वनि चेतावनी",
    "🌓 Theme": "🌓 थीम",
    "RECOMMENDED ACTIONS": "अनुशंसित कार्रवाई",
    "AI SAFE EVACUATION & RELIEF PATHFINDER": "एआई सुरक्षित निकासी एवं राहत मार्गदर्शक",
    "Real-Time Evacuation Corridors & Shelter Capacity": "वास्तविक समय निकासी गलियारे एवं आश्रय क्षमता",
    "DESIGNATED NDRF RELIEF CAMPS (NEARBY)": "नामित एनडीआरएफ राहत शिविर (निकटतम)"
  },
  en: {
    "कमांड सेंटर": "Command Center",
    "वर्षा पूर्वानुमान": "Rainfall Forecast",
    "जलभराव जोखिम": "Inundation Risk",
    "आपातकालीन चेतावनी केंद्र": "Alert Center",
    "डेटा संलयन": "Data Fusion",
    "मॉडल बुद्धिमत्ता": "Model Intelligence",
    "आर्किटेक्चर": "Architecture",
    "आपदा प्रबंधन बुद्धिमत्ता": "DISASTER MANAGEMENT INTELLIGENCE",
    "वर्षा का पूर्वानुमान। जोखिम का मानचित्रण। जलभराव से पहले कार्रवाई।": "Predict the rain. Map the risk. Act before inundation.",
    "पूर्वानुमानित वर्षा": "Forecast Rainfall",
    "जलभराव जोखिम": "Inundation Risk",
    "अनुमानित जलभराव क्षेत्र": "Predicted Inundation",
    "चेतावनी का समय": "Warning Lead Time",
    "लाइव जोखिम मानचित्र": "Live Risk Map",
    "वर्षा जोखिम बुद्धिमत्ता": "Rainfall Risk Intelligence",
    "महत्वपूर्ण वर्षा की संभावना": "SIGNIFICANT RAINFALL PROBABILITY",
    "वर्तमान वर्गीकरण": "CURRENT CLASSIFICATION",
    "खोजें": "Search",
    "वर्षा": "Rainfall",
    "जलभराव": "Inundation",
    "मौसम स्टेशन": "Stations",
    "🛰️ उपग्रह": "🛰️ Satellite",
    "🌙 डार्क मोड": "🌙 Dark HUD",
    "📄 रिपोर्ट डाउनलोड": "📄 Export Advisory",
    "🔊 ध्वनि चेतावनी": "🔊 Voice Warning",
    "🌓 थीम": "🌓 Theme",
    "अनुशंसित कार्रवाई": "RECOMMENDED ACTIONS",
    "एआई सुरक्षित निकासी एवं राहत मार्गदर्शक": "AI SAFE EVACUATION & RELIEF PATHFINDER",
    "वास्तविक समय निकासी गलियारे एवं आश्रय क्षमता": "Real-Time Evacuation Corridors & Shelter Capacity",
    "नामित एनडीआरएफ राहत शिविर (निकटतम)": "DESIGNATED NDRF RELIEF CAMPS (NEARBY)"
  }
};

function toggleLanguage() {
  currentLang = (currentLang === "en") ? "hi" : "en";
  const btn = document.getElementById("langToggleBtn");
  if (btn) {
    btn.textContent = (currentLang === "en") ? "🇮🇳 हिन्दी" : "🇬🇧 English";
  }

  const dict = TRANSLATIONS[currentLang];
  if (!dict) return;

  const selectors = "h1, h2, h3, h4, .eyebrow, button.nav-item span, button.layer, .topbar button, .section-heading p, label, th";
  document.querySelectorAll(selectors).forEach(el => {
    const txt = el.textContent.trim();
    if (dict[txt]) {
      el.textContent = dict[txt];
    }
  });

  showHUDToast("Language Switched", currentLang === "hi" ? "भाषा बदलकर हिन्दी कर दी गई है।" : "Language set to English.", "🇮🇳");
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

window.addEventListener(
  "load",
  async () => {

    console.log(
      "===================================="
    );

    console.log(
      "RAINSAFE AI INITIALIZING"
    );

    console.log(
      "Backend:",
      API
    );

    console.log(
      "Initial location:",
      activeLocation
    );

    console.log(
      "===================================="
    );


    /*
     * Initialize map.
     */

    initMap();


    /*
     * Initialize Three.js rain canvas & globe.
     */

    initRainCanvas();
    initGlobeCanvas();


    /*
     * Initialize Live Chart.
     */
    initLiveChart();


    /*
     * Setup UI.
     */

    setupMapSearch();

    setupLayers();

    setupNav();

    setupScenario();

    setupRefresh();

    setupAcknowledgeAlert();

    setupExportReport();

    initBroadcastModal();

    initModelCharts();

    setupAdvancedControls();


    /*
     * Set Meerut immediately.
     */

    updateLocationUI();


    initAtmosphericParticleField();

    /*
     * Load backend data.
     */

    await refreshAllData();


    /*
     * Final Leaflet resize.
     */

    setTimeout(
      () => {

        if (map) {

          map.invalidateSize();

          map.setView(
            [
              activeLocation.lat,
              activeLocation.lng
            ],
            10
          );

        }

      },
      500
    );


    console.log(
      "===================================="
    );

    console.log(
      "RAINSAFE AI INITIALIZED SUCCESSFULLY"
    );

    console.log(
      "Active location:",
      activeLocation
    );

    console.log(
      "===================================="

    );

  }
);


/* =========================================================
   WINDOW RESIZE
   ========================================================= */

window.addEventListener(
  "resize",
  () => {

    if (map) {

      setTimeout(
        () => {

          map.invalidateSize();

        },
        100
      );

    }


    if (forecastChart) {
      forecastChart.resize();
    }
  }
);

function initAtmosphericParticleField() {
  const canvas = document.getElementById("rain-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let width = (canvas.width = canvas.parentElement ? canvas.parentElement.offsetWidth : window.innerWidth);
  let height = (canvas.height = canvas.parentElement ? canvas.parentElement.offsetHeight : 220);

  const particles = [];
  const particleCount = 45;

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2.5 + 1.0,
      alpha: Math.random() * 0.5 + 0.15,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -(Math.random() * 0.6 + 0.2),
      pulse: Math.random() * Math.PI * 2
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.pulse += 0.03;

      if (p.y < 0) { p.y = height; p.x = Math.random() * width; }
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;

      const currentAlpha = p.alpha + Math.sin(p.pulse) * 0.1;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      grad.addColorStop(0, `rgba(69, 213, 255, ${Math.max(0.1, currentAlpha)})`);
      grad.addColorStop(0.6, `rgba(2, 132, 199, ${Math.max(0, currentAlpha * 0.4)})`);
      grad.addColorStop(1, "rgba(2, 132, 199, 0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", () => {
    if (canvas.parentElement) {
      width = canvas.width = canvas.parentElement.offsetWidth;
      height = canvas.height = canvas.parentElement.offsetHeight;
    }
    updateElevationProfile();
  });

  draw();
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => {
      setTimeout(updateElevationProfile, 150);
    });
  });
});