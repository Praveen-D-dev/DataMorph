# DataMorph

## An AI-Based Framework for Adaptive Dashboard Generation and Data Visualization

DataMorph is a **desktop-first, privacy-oriented, offline-capable adaptive dashboard generation system**.

The user provides an arbitrary structured dataset (CSV, XLSX, XLS, Parquet). DataMorph automatically profiles its statistical topology, generates context-tailored chart recommendations using a hybrid rule-based and machine-learning pipeline, synthesizes an interactive dashboard layout, and enables voice and natural-language adaptation.

> **Privacy Statement**: *DataMorph is designed to minimize data exposure by performing all core data processing, schema profiling, and AI inference strictly locally on your machine with zero external cloud dependencies or telemetry.*

---

## Key Capabilities

1. **Autonomous Data Understanding**: Staged schema inspection, semantic type detection, and statistical profiling.
2. **Hybrid Recommendation Engine**: Knowledge-based Grammar of Graphics rules paired with Scikit-learn statistical priors.
3. **Adaptive Dashboard Synthesis**: Dynamically selects real KPIs, trend lines, distribution plots, and cross-filter parameters tailored to the dataset.
4. **Natural-Language & Voice Control**: Interactive dashboard mutations driven by local NLU intent and regex entity parsing.
5. **Zero Cloud Telemetry & Offline Capable**: Raw datasets remain strictly on the local machine; local fonts and localhost networking only.

---

## Technology Stack

- **Frontend**: Angular 21 (TypeScript, Standalone Components, Signals, Reactive Architecture)
- **Visualization**: Apache ECharts 6.1+
- **Backend API**: Next.js 14 (App Router REST API, Zod schema validation)
- **AI / ML Engine**: Python 3.10+ (Pandas, NumPy, Scikit-learn, PyArrow, OpenPyXL, XLRD)
- **Persistence**: Embedded offline local storage engine (`database/local_store.json`, zero daemon configuration required) with optional PostgreSQL support.

---

## Monorepo Layout

```text
DataMorph/
├── frontend/
│   └── angular-app/       # Angular desktop presentation UI
├── backend/
│   └── nextjs-api/        # Next.js REST API & Python orchestration
├── ai-engine/             # Python profiling, ML ranking & NLU microservice
├── database/
│   ├── postgres/          # Optional PostgreSQL schema
│   └── local_store.json   # Embedded offline local storage (auto-seeded)
├── datasets/
│   ├── samples/           # Benchmark datasets (Sales, Students, etc.)
│   └── uploads/           # Uploaded user datasets (gitignored)
├── tests/                 # Unit and regression test suites
├── run_datamorph.bat      # Windows one-click desktop launcher
└── run_datamorph.sh       # Linux/macOS launcher script
```

---

## Quick Start

### 1. Requirements
- Node.js 20.19+, 22.12+, or 24+
- Python 3.10+ with pip

### 2. Option A: Single-Click Launcher
On Windows:
```cmd
run_datamorph.bat
```
On Linux / macOS:
```bash
chmod +x run_datamorph.sh
./run_datamorph.sh
```

### 3. Option B: Manual Service Startup

#### Step 1: AI Engine (Port 5005)
```bash
cd ai-engine
pip install -r requirements.txt
python server.py
```

#### Step 2: Next.js API (Port 3001)
```bash
cd backend/nextjs-api
npm install
npm run dev
```

#### Step 3: Angular Frontend (Port 4200)
```bash
cd frontend/angular-app
npm install
npm start
```

Open `http://localhost:4200` in your browser. All data processing and dashboard generation runs locally.
