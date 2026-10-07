export interface Dataset {
  id: string;
  filename: string;
  storage_path: string;
  file_type?: string;
  file_size_bytes: number;
  row_count: number;
  column_count: number;
  sha256_hash: string;
  created_at: string;
  updated_at: string;
  hasProfile?: boolean;
}


export interface ColumnStatistic {
  total_count: number;
  null_count: number;
  null_ratio: number;
  unique_count: number;
  unique_ratio: number;
  detected_type: string;
  min?: number;
  max?: number;
  mean?: number;
  std?: number;
  median?: number;
  q25?: number;
  q75?: number;
  iqr?: number;
  skewness?: number;
  outlier_count?: number;
  top_values?: Record<string, number>;
  min_date?: string;
  max_date?: string;
  temporal_range_days?: number;
}

export interface DatasetProfile {
  file_info: {
    file_path: string;
    filename: string;
    file_size_bytes: number;
    sha256_hash: string;
    row_count: number;
    column_count: number;
  };
  type_counts: {
    numeric_continuous: number;
    numeric_discrete: number;
    categorical_nominal: number;
    datetime: number;
    boolean: number;
    high_cardinality_text: number;
  };
  column_types: Record<string, string>;
  column_statistics: Record<string, ColumnStatistic>;
  correlation_matrix: Record<string, Record<string, number>>;
  structural_classification: string;
  cached?: boolean;
}
