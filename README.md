# DataMorph

## An AI-Based Framework for Adaptive Dashboard Generation and Data Visualization

DataMorph is a **desktop-first, privacy-oriented, offline-capable adaptive dashboard generation system**.

The user provides an arbitrary structured dataset (CSV, Parquet). DataMorph automatically profiles its statistical topology, generates context-tailored chart recommendations using a hybrid rule-based and machine-learning pipeline, synthesizes an interactive dashboard layout, and enables voice and natural-language adaptation.

> **Privacy Statement**: *DataMorph is designed to minimize data exposure by performing core data processing and AI inference locally.*

---

## Key Capabilities

1. **Autonomous Data Understanding**: Staged schema inspection, semantic type detection, and statistical profiling.
2. **Hybrid Recommendation Engine**: Knowledge-based Grammar of Graphics rules paired with Scikit-learn ranking.
3. **Adaptive Dashboard Synthesis**: Dynamically selects KPIs, time-trend charts, distribution plots, and cross-filter parameters tailored to the dataset.
4. **Natural-Language & Voice Control**: Interactive dashboard mutations driven by local NLU intent and entity parsing.
5. **Zero Cloud Telemetry**: Raw datasets remain strictly on the local machine; zero external SaaS dependencies.

---

## Technology Stack

- **Frontend**: Angular 17+ (TypeScript, Standalone Components, Signals)
- **Visualization**: Apache ECharts 5.5+ (`ngx-echarts`)
- **Backend API**: Next.js (App Router REST API, Zod validation)
- **AI / ML Engine**: Python 3.10+ (Pandas, NumPy, Scikit-learn)
- **Persistence**: PostgreSQL (Metadata, profiles, dashboard specs) + SQLite (Local app state & caching)

---

## Monorepo Layout

```text
DataMorph/
├── frontend/
│   └── angular-app/       # Angular desktop presentation UI
├── backend/
│   └── nextjs-api/        # Next.js REST API & orchestration
├── ai-engine/             # Python profiling, ML ranking & NLU
├── database/
│   ├── postgres/          # PostgreSQL schemas and migrations
│   └── sqlite/            # SQLite local state schemas
├── datasets/
│   └── samples/           # Benchmark datasets (Sales, Students, etc.)
├── tests/                 # Unit, integration, and E2E tests
└── docs/                  # Architectural documentation
```

---

## Quick Start

### 1. Requirements
- Node.js 18+ (tested on Node.js 22)
- Python 3.10+ with `pandas`, `numpy`, `scikit-learn`
- PostgreSQL 15+ (or Docker)

### 2. Database Setup
```bash
# Using Docker Compose
docker compose up -d postgres
```

### 3. Backend Setup
```bash
cd backend/nextjs-api
npm install
npm run dev
```

### 4. Frontend Setup
```bash
cd frontend/angular-app
npm install
npm start
```
