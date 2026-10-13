import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Pool } from "pg";

export interface DatasetRecord {
  id: string;
  filename: string;
  storage_path: string;
  file_size_bytes: number;
  row_count: number;
  column_count: number;
  sha256_hash: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardRecord {
  id: string;
  dataset_id: string;
  title: string;
  description?: string;
  layout_grid: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  kpis?: any[];
  visualizations?: any[];
  filters?: any[];
  active_filters?: any;
  navigation_sections?: any[];
}

export function getProjectRoot(): string {
  let curr = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(curr, "ai-engine")) && fs.existsSync(path.join(curr, "database"))) {
      return curr;
    }
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  return path.resolve(process.cwd(), "..", "..");
}

export function resolveStoragePath(storedPath: string): string {
  if (!storedPath) return storedPath;
  const projectRoot = getProjectRoot();

  // If path exists on disk as-is, return resolved absolute path
  if (fs.existsSync(storedPath)) return path.resolve(storedPath);

  // If stored as relative path (e.g. "datasets/samples/sales.csv" or "datasets/uploads/...")
  const fromRoot = path.resolve(projectRoot, storedPath);
  if (fs.existsSync(fromRoot)) return fromRoot;

  // If stored with Windows/Unix absolute path from another machine (e.g. "D:\DataMorph\datasets\samples\sales.csv")
  const norm = storedPath.replace(/\\/g, "/");
  const datasetsIdx = norm.indexOf("datasets/");
  if (datasetsIdx !== -1) {
    const rel = norm.substring(datasetsIdx);
    const resolved = path.resolve(projectRoot, rel);
    if (fs.existsSync(resolved)) return resolved;
    return resolved;
  }

  return path.resolve(projectRoot, storedPath);
}

function normalizeDataset(dataset: DatasetRecord): DatasetRecord {
  if (!dataset) return dataset;
  return {
    ...dataset,
    storage_path: resolveStoragePath(dataset.storage_path)
  };
}

export class DatabaseService {
  private static pool: Pool | null = null;
  private static isPostgresAvailable = false;
  private static get localStorePath(): string {
    return path.join(getProjectRoot(), "database", "local_store.json");
  }

  private static seedSampleDatasets(store: any) {
    const projectRoot = getProjectRoot();
    const samples = [
      { id: "sample-sales", file: "sales.csv" },
      { id: "sample-students", file: "students.csv" },
      { id: "sample-employees", file: "employees.csv" },
      { id: "sample-ecommerce", file: "ecommerce.csv" },
      { id: "sample-weather_timeseries", file: "weather_timeseries.csv" },
    ];

    for (const s of samples) {
      const relPath = path.join("datasets", "samples", s.file).replace(/\\/g, "/");
      const absPath = path.join(projectRoot, "datasets", "samples", s.file);
      if (fs.existsSync(absPath)) {
        try {
          const stats = fs.statSync(absPath);
          const content = fs.readFileSync(absPath);
          const hash = crypto.createHash("sha256").update(content).digest("hex");
          const lines = content.toString("utf8").split(/\r?\n/).filter(l => l.trim().length > 0);
          const rowCount = Math.max(0, lines.length - 1);
          const colCount = lines.length > 0 ? lines[0].split(",").length : 0;

          store.datasets[s.id] = {
            id: s.id,
            filename: s.file,
            storage_path: relPath,
            file_size_bytes: stats.size,
            row_count: rowCount,
            column_count: colCount,
            sha256_hash: hash,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        } catch {}
      }
    }
  }

  private static getLocalStore(): {
    datasets: Record<string, DatasetRecord>;
    profiles: Record<string, any>;
    dashboards: Record<string, DashboardRecord>;
    preferences: Record<string, any>;
    history: any[];
  } {
    if (!fs.existsSync(this.localStorePath)) {
      const initial: any = { datasets: {}, profiles: {}, dashboards: {}, preferences: {}, history: [] };
      this.seedSampleDatasets(initial);
      const dbDir = path.dirname(this.localStorePath);
      if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
      fs.writeFileSync(this.localStorePath, JSON.stringify(initial, null, 2), "utf8");
      return initial;
    }
    try {
      const store = JSON.parse(fs.readFileSync(this.localStorePath, "utf8"));
      if (!store.datasets || Object.keys(store.datasets).length === 0) {
        if (!store.datasets) store.datasets = {};
        this.seedSampleDatasets(store);
        this.saveLocalStore(store);
      }
      return store;
    } catch {
      const fallback: any = { datasets: {}, profiles: {}, dashboards: {}, preferences: {}, history: [] };
      this.seedSampleDatasets(fallback);
      return fallback;
    }
  }

  private static saveLocalStore(data: any) {
    const dbDir = path.dirname(this.localStorePath);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(this.localStorePath, JSON.stringify(data, null, 2), "utf8");
  }

  static async initPool(): Promise<void> {
    if (this.pool) return;

    try {
      this.pool = new Pool({
        host: process.env.POSTGRES_HOST || "localhost",
        port: parseInt(process.env.POSTGRES_PORT || "5432"),
        user: process.env.POSTGRES_USER || "datamorph_user",
        password: process.env.POSTGRES_PASSWORD || "datamorph_secret_123",
        database: process.env.POSTGRES_DB || "datamorph",
        connectionTimeoutMillis: 1500
      });

      // Probe connection
      const client = await this.pool.connect();
      client.release();
      this.isPostgresAvailable = true;
      console.log("[DataMorph Database] Connected to primary PostgreSQL database.");
    } catch (err: any) {
      this.isPostgresAvailable = false;
      console.warn(`[DataMorph Database] PostgreSQL connection inactive (${err.message}). Using embedded local offline storage engine.`);
    }
  }

  // --- DATASETS ---
  static async saveDataset(dataset: DatasetRecord): Promise<DatasetRecord> {
    await this.initPool();

    const projectRoot = getProjectRoot();
    let relativeStoragePath = dataset.storage_path;
    if (path.isAbsolute(dataset.storage_path) && dataset.storage_path.startsWith(projectRoot)) {
      relativeStoragePath = path.relative(projectRoot, dataset.storage_path).replace(/\\/g, "/");
    }

    const recordToSave: DatasetRecord = {
      ...dataset,
      storage_path: relativeStoragePath
    };

    if (this.isPostgresAvailable && this.pool) {
      try {
        const query = `
          INSERT INTO datasets (id, filename, storage_path, file_size_bytes, row_count, column_count, sha256_hash, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (sha256_hash) DO UPDATE SET updated_at = EXCLUDED.updated_at
          RETURNING *;
        `;
        const res = await this.pool.query(query, [
          dataset.id, dataset.filename, dataset.storage_path, dataset.file_size_bytes,
          dataset.row_count, dataset.column_count, dataset.sha256_hash, dataset.created_at, dataset.updated_at
        ]);
        if (res.rows[0]) return normalizeDataset(res.rows[0]);
      } catch (err) {
        console.error("Postgres error, falling back to local store:", err);
      }
    }

    const store = this.getLocalStore();
    store.datasets[dataset.id] = recordToSave;
    this.saveLocalStore(store);
    return normalizeDataset(recordToSave);
  }

  static async getDatasets(): Promise<DatasetRecord[]> {
    await this.initPool();

    if (this.isPostgresAvailable && this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM datasets ORDER BY created_at DESC;");
        return res.rows.map((r: any) => normalizeDataset(r));
      } catch {}
    }

    const store = this.getLocalStore();
    return Object.values(store.datasets)
      .map(d => normalizeDataset(d))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  static async getDatasetById(id: string): Promise<DatasetRecord | null> {
    await this.initPool();

    if (this.isPostgresAvailable && this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM datasets WHERE id = $1;", [id]);
        if (res.rows.length > 0) return normalizeDataset(res.rows[0]);
      } catch {}
    }

    const store = this.getLocalStore();
    const found = store.datasets[id] || null;
    return found ? normalizeDataset(found) : null;
  }

  static async getDatasetByHash(sha256Hash: string): Promise<DatasetRecord | null> {
    await this.initPool();

    if (this.isPostgresAvailable && this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM datasets WHERE sha256_hash = $1 LIMIT 1;", [sha256Hash]);
        if (res.rows.length > 0) return normalizeDataset(res.rows[0]);
      } catch {}
    }

    const store = this.getLocalStore();
    const match = Object.values(store.datasets).find(d => d.sha256_hash === sha256Hash);
    return match ? normalizeDataset(match) : null;
  }

  static async deleteDataset(id: string): Promise<boolean> {
    await this.initPool();

    const dataset = await this.getDatasetById(id);

    // Delete stored file from filesystem if it exists in uploads
    if (dataset?.storage_path) {
      try {
        if (fs.existsSync(dataset.storage_path)) {
          // Only unlink if inside datasets/uploads to avoid deleting benchmark samples
          if (dataset.storage_path.includes(path.join("datasets", "uploads"))) {
            fs.unlinkSync(dataset.storage_path);
          }
        }
      } catch (err) {
        console.warn(`[DatabaseService] Could not unlink file ${dataset.storage_path}:`, err);
      }
    }

    if (this.isPostgresAvailable && this.pool) {
      try {
        await this.pool.query("DELETE FROM dashboards WHERE dataset_id = $1;", [id]);
        await this.pool.query("DELETE FROM dataset_profiles WHERE dataset_id = $1;", [id]);
        await this.pool.query("DELETE FROM datasets WHERE id = $1;", [id]);
      } catch {}
    }

    const store = this.getLocalStore();
    delete store.datasets[id];
    delete store.profiles[id];

    // Clean up dashboards associated with this dataset
    if (store.dashboards) {
      for (const dId of Object.keys(store.dashboards)) {
        if (store.dashboards[dId].dataset_id === id) {
          delete store.dashboards[dId];
        }
      }
    }

    this.saveLocalStore(store);
    return true;
  }

  // --- PROFILES ---
  static async saveProfile(datasetId: string, profile: any): Promise<void> {
    await this.initPool();

    if (this.isPostgresAvailable && this.pool) {
      try {
        const query = `
          INSERT INTO dataset_profiles (dataset_id, schema_definition, summary_statistics, correlation_matrix, extracted_features)
          VALUES ($1, $2, $3, $4, $5);
        `;
        await this.pool.query(query, [
          datasetId,
          JSON.stringify(profile.column_types),
          JSON.stringify(profile.column_statistics),
          JSON.stringify(profile.correlation_matrix),
          JSON.stringify(profile.type_counts)
        ]);
        return;
      } catch {}
    }

    const store = this.getLocalStore();
    store.profiles[datasetId] = profile;
    this.saveLocalStore(store);
  }

  static async getProfile(datasetId: string): Promise<any | null> {
    await this.initPool();

    if (this.isPostgresAvailable && this.pool) {
      try {
        const res = await this.pool.query(
          "SELECT * FROM dataset_profiles WHERE dataset_id = $1 ORDER BY profiled_at DESC LIMIT 1;",
          [datasetId]
        );
        if (res.rows.length > 0) return res.rows[0];
      } catch {}
    }

    const store = this.getLocalStore();
    return store.profiles[datasetId] || null;
  }

  // --- DASHBOARDS ---
  static async saveDashboard(dashboard: DashboardRecord): Promise<DashboardRecord> {
    await this.initPool();

    const store = this.getLocalStore();
    store.dashboards[dashboard.id] = dashboard;
    this.saveLocalStore(store);

    if (this.isPostgresAvailable && this.pool) {
      try {
        const query = `
          INSERT INTO dashboards (id, dataset_id, title, description, layout_grid, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO UPDATE SET layout_grid = EXCLUDED.layout_grid, updated_at = EXCLUDED.updated_at
          RETURNING *;
        `;
        await this.pool.query(query, [
          dashboard.id, dashboard.dataset_id, dashboard.title, dashboard.description || "",
          JSON.stringify(dashboard.layout_grid), dashboard.is_active, dashboard.created_at, dashboard.updated_at
        ]);
      } catch {}
    }

    return dashboard;
  }

  static async getDashboard(id: string): Promise<DashboardRecord | null> {
    await this.initPool();

    const store = this.getLocalStore();
    return store.dashboards[id] || null;
  }

  static async getDashboardByDatasetId(datasetId: string): Promise<DashboardRecord | null> {
    await this.initPool();

    if (this.isPostgresAvailable && this.pool) {
      try {
        const res = await this.pool.query(
          "SELECT * FROM dashboards WHERE dataset_id = $1 AND is_active = true ORDER BY updated_at DESC LIMIT 1;",
          [datasetId]
        );
        if (res.rows.length > 0) return res.rows[0];
      } catch {}
    }

    const store = this.getLocalStore();
    if (!store.dashboards) return null;
    const dashboards = Object.values(store.dashboards).filter(d => d.dataset_id === datasetId);
    if (dashboards.length === 0) return null;
    return dashboards.find(d => d.is_active) || dashboards.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
  }

  static async updateDashboard(id: string, updates: Partial<DashboardRecord>): Promise<DashboardRecord | null> {
    const store = this.getLocalStore();
    if (!store.dashboards[id]) return null;

    store.dashboards[id] = {
      ...store.dashboards[id],
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.saveLocalStore(store);
    return store.dashboards[id];
  }

  // --- USER PREFERENCES ---
  static async recordPreference(signal: { action?: string; category?: string; target?: string; value?: any }): Promise<void> {
    const action = String(signal?.action || "interaction").trim();
    const target = String(signal?.target || "general").trim();

    // Prohibit prototype pollution keys
    const dangerousKeys = ["__proto__", "prototype", "constructor"];
    if (dangerousKeys.includes(action) || dangerousKeys.includes(target)) {
      return;
    }

    const key = `${action}_${target}`;
    if (dangerousKeys.includes(key)) {
      return;
    }

    const store = this.getLocalStore() as any;
    if (!store.preferences || typeof store.preferences !== "object" || Array.isArray(store.preferences)) {
      store.preferences = {};
    }

    if (!Object.prototype.hasOwnProperty.call(store.preferences, key)) {
      store.preferences[key] = {
        action,
        category: signal?.category || "general",
        target,
        value: signal?.value,
        count: 1,
        last_updated: new Date().toISOString()
      };
    } else {
      store.preferences[key].count = (store.preferences[key].count || 0) + 1;
      store.preferences[key].last_updated = new Date().toISOString();
      if (signal?.value !== undefined) store.preferences[key].value = signal.value;
    }
    this.saveLocalStore(store);
  }

  static async resetPreferences(): Promise<void> {
    const store = this.getLocalStore() as any;
    store.preferences = {};
    this.saveLocalStore(store);
  }

  static async getPreferences(): Promise<Record<string, any>> {
    const store = this.getLocalStore() as any;
    return store.preferences || {};
  }
}

