import fs from "fs";
import path from "path";
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

function getProjectRoot(): string {
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

export class DatabaseService {
  private static pool: Pool | null = null;
  private static isPostgresAvailable = false;
  private static get localStorePath(): string {
    return path.join(getProjectRoot(), "database", "local_store.json");
  }

  private static getLocalStore(): {
    datasets: Record<string, DatasetRecord>;
    profiles: Record<string, any>;
    dashboards: Record<string, DashboardRecord>;
    history: any[];
  } {
    if (!fs.existsSync(this.localStorePath)) {
      const initial = { datasets: {}, profiles: {}, dashboards: {}, history: [] };
      fs.writeFileSync(this.localStorePath, JSON.stringify(initial, null, 2), "utf8");
      return initial;
    }
    try {
      return JSON.parse(fs.readFileSync(this.localStorePath, "utf8"));
    } catch {
      return { datasets: {}, profiles: {}, dashboards: {}, history: [] };
    }
  }

  private static saveLocalStore(data: any) {
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
        return res.rows[0];
      } catch (err) {
        console.error("Postgres error, falling back to local store:", err);
      }
    }

    const store = this.getLocalStore();
    store.datasets[dataset.id] = dataset;
    this.saveLocalStore(store);
    return dataset;
  }

  static async getDatasets(): Promise<DatasetRecord[]> {
    await this.initPool();

    if (this.isPostgresAvailable && this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM datasets ORDER BY created_at DESC;");
        return res.rows;
      } catch {}
    }

    const store = this.getLocalStore();
    return Object.values(store.datasets).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  static async getDatasetById(id: string): Promise<DatasetRecord | null> {
    await this.initPool();

    if (this.isPostgresAvailable && this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM datasets WHERE id = $1;", [id]);
        if (res.rows.length > 0) return res.rows[0];
      } catch {}
    }

    const store = this.getLocalStore();
    return store.datasets[id] || null;
  }

  static async deleteDataset(id: string): Promise<boolean> {
    await this.initPool();

    if (this.isPostgresAvailable && this.pool) {
      try {
        await this.pool.query("DELETE FROM datasets WHERE id = $1;", [id]);
        return true;
      } catch {}
    }

    const store = this.getLocalStore();
    delete store.datasets[id];
    delete store.profiles[id];
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
  static async recordPreference(signal: { action: string; category?: string; target: string; value?: any }): Promise<void> {
    const store = this.getLocalStore() as any;
    if (!store.preferences) store.preferences = {};
    const key = `${signal.action}_${signal.target}`;
    if (!store.preferences[key]) {
      store.preferences[key] = { ...signal, count: 1, last_updated: new Date().toISOString() };
    } else {
      store.preferences[key].count += 1;
      store.preferences[key].last_updated = new Date().toISOString();
      if (signal.value !== undefined) store.preferences[key].value = signal.value;
    }
    this.saveLocalStore(store);
  }

  static async getPreferences(): Promise<Record<string, any>> {
    const store = this.getLocalStore() as any;
    return store.preferences || {};
  }
}

