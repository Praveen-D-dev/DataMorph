export interface KpiCard {
  id: string;
  title: string;
  value: number | string;
  formatted_value: string;
  subtitle: string;
  icon: string;
  color: string;
  card_style?: "gradient" | "glass";
  variant?: string;
  trend?: string;
  trend_direction?: "up" | "down";
  change?: number;
  badge?: string;
  subtext?: string;
}

export interface NavigationSection {
  id: string;
  title: string;
  icon?: string;
  type: "overview" | "analysis";
  description?: string;
  columns?: string[];
  metric_count?: number;
}

export interface Visualization {
  id: string;
  chart_type: string;
  title: string;
  x_axis: string;
  y_axis: string;
  dimension?: string;
  metric?: string;
  aggregation: string;
  score: number;
  reason: string;
  domain_id?: string;
  display_order: number;
  col_span?: number;
  accent_color?: string;
  card_bg_tint?: string;
  layout_size?: string;
  card_height?: number;
  chart_options: any;
}

export interface FilterDef {
  id: string;
  column_name: string;
  type: "select" | "date_range" | "range";
  label: string;
  options?: string[];
}

export interface GridLayoutItem {
  viz_index: number;
  row: number;
  col: number;
  col_span: number;
  row_span: number;
}

export interface Dashboard {
  id: string;
  dataset_id: string;
  title: string;
  description?: string;
  dataset_filename?: string;
  total_rows?: number;
  total_columns?: number;
  kpis: KpiCard[];
  navigation_sections?: NavigationSection[];
  visualizations: Visualization[];
  filters: FilterDef[];
  layout_grid: GridLayoutItem[];
  active_filters?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}
