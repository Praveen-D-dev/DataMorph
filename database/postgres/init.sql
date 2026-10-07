-- DataMorph PostgreSQL Schema Initialization
-- Enables UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Datasets Table
CREATE TABLE IF NOT EXISTS datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(1024) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    row_count INTEGER NOT NULL DEFAULT 0,
    column_count INTEGER NOT NULL DEFAULT 0,
    sha256_hash CHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_datasets_hash ON datasets(sha256_hash);

-- 2. Dataset Statistical Profiles
CREATE TABLE IF NOT EXISTS dataset_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    schema_definition JSONB NOT NULL,
    summary_statistics JSONB NOT NULL,
    correlation_matrix JSONB,
    extracted_features JSONB NOT NULL,
    profiled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_profiles_dataset_id ON dataset_profiles(dataset_id);

-- 3. Dashboards Table
CREATE TABLE IF NOT EXISTS dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    layout_grid JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_dashboards_dataset_id ON dashboards(dataset_id);

-- 4. Visualizations Table
CREATE TABLE IF NOT EXISTS visualizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    chart_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    x_axis VARCHAR(100),
    y_axis VARCHAR(100),
    aggregation_fn VARCHAR(20),
    chart_options JSONB NOT NULL,
    recommendation_score NUMERIC(5, 4),
    recommendation_reason TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_visualizations_dashboard ON visualizations(dashboard_id);

-- 5. Dashboard Filters Table
CREATE TABLE IF NOT EXISTS dashboard_filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    column_name VARCHAR(100) NOT NULL,
    filter_type VARCHAR(50) NOT NULL, -- 'categorical_select', 'range_slider', 'date_picker'
    default_values JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_filters_dashboard ON dashboard_filters(dashboard_id);

-- 6. Analysis History Table
CREATE TABLE IF NOT EXISTS analysis_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES datasets(id) ON DELETE SET NULL,
    dashboard_id UUID REFERENCES dashboards(id) ON DELETE SET NULL,
    command_text TEXT NOT NULL,
    detected_intent VARCHAR(50) NOT NULL,
    detected_entities JSONB NOT NULL,
    execution_status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_history_dashboard ON analysis_history(dashboard_id);
