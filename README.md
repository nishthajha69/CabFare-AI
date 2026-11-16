# CabFare AI

**AI-Powered Cab Fare Comparison, Price Forecasting, and Ride Decision Analytics Platform**

> **Simulation & Data Transparency Notice:** CabFare AI does **not** retrieve live pricing, driver locations, or real-time booking feeds from Uber, Ola, Rapido, BluSmart, or Namma Yatri APIs. All fare estimates, driver arrival times, surge calculations, historical datasets, and 10–30 minute price forecasts are **simulated** using road route geometry, configurable platform tariff models, and deterministic synthetic historical data.

---

## 1. Project Overview

**CabFare AI** is a full-stack web application designed to help urban commuters make cost-effective, data-driven cab-booking decisions across major Indian ride-hailing platforms (**Uber**, **Ola**, **Rapido**, **BluSmart**, and **Namma Yatri**).

Instead of switching across multiple mobile apps and guessing whether peak surge pricing will drop, commuters can compare simulated multi-modal fares on a single dashboard, inspect transparent fare breakdowns, evaluate whether waiting 10–30 minutes is likely to reduce costs, set automated target-fare alerts, analyze 6,384 synthetic historical fare records, export CSV business reports, and consult an interactive AI Ride Assistant.

---

## 2. Problem Statement

Urban commuters in Indian metropolitan cities face three recurring decision-making challenges when booking app-based rides:

1. **Fragmented Pricing Across Platforms:** Commuters must manually check multiple apps across varying vehicle categories (Bikes, Autos, Hatchbacks, Sedans, SUVs, and EVs), making quick, apples-to-apples cost comparisons difficult.
2. **Opaque Surge & Timing Trade-offs:** During morning rush and evening peak hours, dynamic surge multipliers and pickup wait fees (such as airport or railway station holding charges) fluctuate significantly. Users lack clear analytical guidance on whether to **book immediately**, **wait 10–30 minutes**, **schedule in advance**, or **walk a few hundred meters** to a lower-surge pickup point.
3. **Lack of Structured Fare Analytics:** Everyday riders and mobility analysts rarely have access to aggregated historical trends, peak-demand windows, and provider cost spreads to quantify potential savings over time.

---

## 3. Project Objectives

- **Unified Multi-Platform Fare Estimation:** Calculate and compare simulated fares across five Indian mobility platforms and six vehicle categories using actual road distances and congestion-adjusted travel times.
- **Decision Intelligence:** Provide an automated recommendation engine (**Book Now**, **Wait 10 Minutes**, or **Consider Another Platform**) supported by quantitative reasoning.
- **Waiting-Time & Forecast Modeling:** Help riders weigh immediate booking versus waiting **10, 15, or 30 minutes**, and balance ticket fare against pickup ETA and imputed value of time.
- **Smart Alert Automation:** Monitor configured target fares through an automated workflow and trigger notifications when simulated fares drop within budget.
- **Business Analytics & Reporting:** Offer a multi-filter historical analytics dashboard powered by a structured synthetic dataset, complete with one-click CSV report export for business review.
- **Interactive Decision Support:** Integrate a conversational AI Ride Assistant grounded strictly in the active route's calculated estimates, predictions, and recommendations.

---

## 4. Key Features

### 1. Location Detection & Route Mapping
- **Current Location Detection:** Uses the browser's Geolocation API (`enableHighAccuracy: true`) with timeout/retry logic, network fallback, and strict permission-denied error handling (never fabricates fake coordinates).
- **Reverse Geocoding & Search:** Converts GPS coordinates into readable street/area names via OpenStreetMap Nominatim and BigDataCloud (with curated-hub fallback), alongside autocomplete search across 24 curated hubs in **Bengaluru**, **Delhi NCR**, and **Mumbai** plus OpenStreetMap search.
- **Interactive Route Map:** Powered by Leaflet and OpenStreetMap with road-network polylines from OSRM, pickup (`P`), destination (`D`), and alternative pickup (`A1–A3`) markers, plus a traffic-color legend (`Low`, `Moderate`, `Heavy`).

### 2. Multi-Platform Fare Estimation Engine
- **Road Distance & Duration:** Fetches actual driving distance and base travel time via OSRM, falling back cleanly to road-detour estimation when offline.
- **Configurable Platform Models:** Separate tariff configurations for **Uber, Ola, Rapido, BluSmart, and Namma Yatri** covering **Base Fare, Per-km Rate, Per-min Rate, Minimum Fare, Booking Fee, Surge Sensitivity, Airport/Zone Fee**, and supported vehicle categories (**Bike, Auto, Hatchback, Sedan, SUV, Electric Vehicle**).
- **Immediate vs. Scheduled Ride Modes:** Models airport (`15 min`), railway/metro station (`8 min`), and standard (`5 min`) pickup holding wait buffers, slot allocation fees, and smoothed surge pricing in Scheduled mode.
- **Demand Scenarios & Sliders:** Switch between *Current Time*, *Morning Rush*, *Evening Surge*, and *Off-Peak*, and adjust peak surge, off-peak multipliers, and traffic duration assumptions.
- **Transparent Breakdown & Alternative Pickups:** Expandable per-ride fare itemization plus walking suggestions (`210m–460m`) to nearby arterial/transit stops that bypass zone surcharges.

### 3. AI Recommendation Engine & Ride Assistant
- **AI Recommendation Card:** Evaluates active route estimates and forecasts via server-side Gemini (`gemini-4-hydrogen`) or a deterministic analytical fallback to recommend **Book Now**, **Wait 10 Minutes**, or **Consider Another Platform**.
- **Conversational Ride Assistant:** Slide-over chat interface featuring suggested questions (*"Which cab is cheapest for my route?"*, *"Should I book now or wait?"*, *"Which platform offers the best value?"*, *"How much can I save by choosing another cab?"*, *"Is waiting 15 minutes likely to reduce the fare?"*). Grounded strictly in the route's active simulated data and resilient against API billing/quota or network errors via structured analytical fallback responses.

### 4. Waiting-Time Cost Analysis
- **Book Now vs. Wait (10 / 15 / 30 min):** Compares current fare against predicted fares at **+10m, +15m, and +30m** with potential savings or extra cost, a color-coded comparison bar chart, and a clear recommendation (**Book Now**, **Wait and Compare**, or **Choose Another Cab**).
- **Pickup ETA Time-Value View:** Calculates effective total cost (`Fare + Imputed Wait Cost`) using an adjustable hourly value-of-time slider (`₹120/hr – ₹1200/hr`).

### 5. Price Prediction & Business Analytics Dashboard
- **Synthetic Historical Dataset:** Deterministic **6,384-record** dataset (7 days × 6 major corridors × 8 daily time slots × 19 platform-vehicle combinations) modeling peak/off-peak variations with zero random number generation.
- **Price Trends & Forecasting:** Displays +10m/+20m/+30m forecast cards, confidence percentage, trend direction, model limitations, interactive 24-hour and 7-day charts, and peak vs. off-peak comparisons.
- **Business Analytics KPIs & Filters:** Filter analytics by **Date**, **Platform**, **Vehicle Category**, **Pickup Location**, and **Destination** to inspect Average Cab Fare, Cheapest/Highest Platform, Customer Savings, Platform Summary Matrix, and sample synthetic records.
- **CSV Report Export:** Downloads a structured, Excel/Sheets-ready UTF-8 CSV report containing applied filters, executive KPIs, platform averages, peak-demand periods, hourly trajectories, and sample synthetic records.

### 6. Smart Fare Alerts & Automation Workflow
- **Configurable Alerts:** Set pickup, destination, preferred platform, vehicle category, and maximum target fare (`₹`) with compatibility validation.
- **4-Stage Automation Pipeline:** `1. Fare Update → 2. Target Price Check → 3. Condition Evaluation → 4. Alert Generation`.
- **Dashboard & Controls:** Tracks Active Alerts, Triggered Alerts, Target Fare, Latest Estimate, and Potential Savings. Supports **Create, Edit, Pause/Resume, Delete, Check Route**, **Evaluate All Alerts**, optional Web Audio chime (**Sound Alert: On/Off**), and `localStorage` persistence.

---

## 5. Technology Stack

Only technologies and libraries directly present in the codebase are listed below:

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend UI** | React 19, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), Lucide React |
| **Charts & Data Viz** | Recharts (`AreaChart`, `BarChart`, `LineChart`, `ResponsiveContainer`) |
| **Interactive Maps** | Leaflet (`leaflet`) with OpenStreetMap tile layer |
| **Build Tooling** | Vite 8 (`@vitejs/plugin-react`), TypeScript compiler (`tsc`) |
| **Backend Server** | Node.js, Express (`express`), `tsx`, `dotenv` |
| **AI Integration** | `@google/genai` SDK (`gemini-4-hydrogen`, server-side only) |
| **Geo & Routing Services** | OSRM Public Driving API, OpenStreetMap Nominatim, BigDataCloud Reverse Geocode, Browser Geolocation API |
| **Client Persistence & Audio** | Browser `localStorage`, Web Audio API (`AudioContext`) |

---

## 6. System Workflow

```text
1. Location Input (GPS Geolocation + Reverse Geocode OR Curated/OSM Search)
        │
        ▼
2. Route Engine (POST /api/fares/compare)
   ├─ OSRM Driving Distance & Geometry (fallback: Haversine × 1.32 detour)
   ├─ Platform Tariff Models × Ride Mode (Immediate / Scheduled) × Demand Scenario
   └─ Deterministic Synthetic Forecast (+10m, +15m, +20m, +30m, +45m, +60m)
        │
        ├──► 3a. Fare Explorer UI (KPI Strip, Route Map, Multi-Modal Grid, Alt Pickups)
        ├──► 3b. AI Recommendation Engine & Ride Assistant (POST /api/ai/recommend & /api/ai/chat)
        │        └─ Gemini API (server-side) with deterministic analytical fallback
        ├──► 3c. Smart Fare Alerts Pipeline (Fare Update → Target Check → Evaluation → Alert)
        └──► 3d. Analytics & CSV Export (GET /api/analytics across 6,384 synthetic records)
```

---

## 7. Installation and Setup

### Prerequisites
- **Node.js** (v18 or later recommended)
- **npm** (or compatible Node package manager)

### Steps to Run Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables (optional for live Gemini reasoning):**
   - Copy `.env.example` to `.env` in the project root.
   - Set `GEMINI_API_KEY` if you wish to enable live Gemini responses; otherwise, the application automatically runs using its built-in deterministic analytical fallback.
   - Do **not** commit `.env` or share private API keys.

3. **Start the development server (runs Express API + Vite frontend on port 3000):**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

4. **Verify TypeScript & build for production:**
   ```bash
   npm run lint
   npm run build
   npm start
   ```

---

## 8. Project Structure

```text
.
├── .env.example                    # Template for runtime environment variables
├── index.html                      # Application HTML entry point
├── metadata.json                   # Applet metadata & geolocation capability config
├── package.json                    # Scripts and dependencies
├── server.ts                       # Express server, API routes, & Vite integration
├── tsconfig.json                   # TypeScript configuration
├── vite.config.ts                  # Vite & Tailwind CSS v4 configuration
├── server/
│   ├── fareEngine.ts               # Road-route fare calculation, surge, & alternative pickups
│   ├── fareModels.ts               # Platform tariff sheets (Uber, Ola, Rapido, BluSmart, Namma Yatri)
│   ├── geminiService.ts            # Server-side @google/genai integration & analytical fallbacks
│   ├── historicalDataset.ts        # Deterministic 6,384-record synthetic dataset & forecast model
│   ├── locations.ts                # 24 curated metro hubs, presets, & proximity helpers
│   └── routingService.ts           # OSRM driving distance/geometry fetcher & fallback logic
└── src/
    ├── App.tsx                     # Root application state & tab orchestration
    ├── index.css                   # Global Tailwind CSS styles & typography
    ├── main.tsx                    # React entry point
    ├── components/
    │   ├── AIAssistantDrawer.tsx   # Conversational Ride Assistant drawer
    │   ├── AIRecommendationCard.tsx# Primary booking action & reasoning card
    │   ├── AlternativePickups.tsx  # Nearby lower-fare pickup recommendations
    │   ├── AnalyticsDashboard.tsx  # Multi-filter business analytics, charts, & CSV export
    │   ├── ErrorBoundary.tsx       # React error boundary wrapper
    │   ├── FareAlertsPanel.tsx     # Target fare alert automation dashboard & controls
    │   ├── FareComparisonGrid.tsx  # Multi-category platform comparison cards & breakdown
    │   ├── Header.tsx              # Top navigation & Ride Assistant trigger
    │   ├── LocationSearchPanel.tsx # GPS detection, location search, presets, & ride mode controls
    │   ├── RouteMap.tsx            # Leaflet OpenStreetMap route & traffic visualizer
    │   ├── TrendsAndPredictions.tsx# 10/20/30-min forecast & historical trend charts
    │   └── WaitingTimeAnalysis.tsx # Book Now vs Wait (10/15/30m) & ETA Time-Value analysis
    ├── services/
    │   └── api.ts                  # Typed frontend API client
    ├── types/
    │   └── cabfare.ts              # Shared TypeScript interfaces and types
    └── utils/
        └── fareAlertWorkflow.ts    # 4-stage alert evaluation, Web Audio chime, & localStorage helpers
```

---

## 9. Limitations

1. **Simulated Fare & Availability Data:** Ride-hailing aggregators do not expose public real-time pricing APIs without commercial partner agreements; therefore, fares, driver arrival ETAs, cancellation risks, and airport/station fees are modeled estimates rather than live quotes.
2. **Synthetic Historical Dataset:** The 6,384 historical records used for business analytics and trend forecasting are deterministically synthesized from tariff schedules and demand curves rather than empirical transaction logs.
3. **External Free API Dependencies:** Public OSRM routing and Nominatim reverse-geocoding endpoints are subject to network latency or rate limits; automatic local fallbacks ensure continuity when offline.
4. **Browser Geolocation Constraints:** GPS accuracy depends on user hardware, browser permissions, and HTTPS context; denied permissions prevent automatic coordinate detection.
5. **Client-Only Persistence:** Saved fare alerts, notification history, and sound settings are stored in browser `localStorage` rather than a multi-device cloud database.

---

## 10. Future Scope

- **Authorized Aggregator API Integrations:** Connect official partner APIs from Uber, Ola, Rapido, BluSmart, and ONDC/Namma Yatri for live fare quotes and deep-link booking handoff.
- **Persistent User Accounts & Cloud Alerts:** Back alerts with a database and server-side push/email/SMS notifications for background monitoring even when the browser tab is closed.
- **City-Wide Expansion & Weather Signals:** Incorporate real-time rainfall, local public events, and multi-city municipal meter revisions into demand forecasting models.
- **Corporate Commute Optimization:** Add team expense tracking, GST invoice reconciliation, and monthly route-level mobility budget reports for enterprise travel teams.

---

## 11. Academic Project Details

- **Project Title:** CabFare AI — AI-Powered Cab Fare Comparison, Price Forecasting, and Ride Decision Analytics Platform
- **Domain:** Urban Mobility Analytics, Dynamic Pricing Strategy, and AI Decision Support Systems
- **Submitted By:** Nishtha (`nishtha.gnmba27@iilm.edu`)
- **Program:** MBA Academic Project
- **Scope Note:** Developed as an analytical and decision-support prototype demonstrating dynamic fare modeling, multi-platform price transparency, historical demand analytics, and AI-assisted commuter decision-making using simulated tariff data.
