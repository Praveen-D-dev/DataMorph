-- DataMorph SQLite Local State Schema Initialization

-- 1. Local User & UI Preferences
CREATE TABLE IF NOT EXISTS local_preferences (
    pref_key TEXT PRIMARY KEY,
    pref_value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Client Session Caching (Ephemeral offline cache)
CREATE TABLE IF NOT EXISTS ui_session_cache (
    cache_key TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    expires_at DATETIME NOT NULL
);

-- 3. Recent Files Registry (Desktop Quick Access)
CREATE TABLE IF NOT EXISTS recent_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    sha256_hash TEXT,
    last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_pinned INTEGER DEFAULT 0
);

-- Seed default desktop preferences
INSERT OR IGNORE INTO local_preferences (pref_key, pref_value) VALUES 
('theme', 'dark'),
('chart_engine', 'echarts'),
('auto_profile', 'true'),
('voice_enabled', 'true'),
('sampling_threshold', '50000');
