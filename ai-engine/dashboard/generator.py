import os
import re
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from recommendation.recommender import RecommendationEngine
from profiling.profiler import DataProfiler
from domains.domain_analyzer import DomainAnalyzer


class DashboardGenerator:
    """
    Synthesizes adaptive, dataset-tailored dashboard specifications
    containing KPIs, declarative ECharts options with pre-aggregated data,
    grid layout positioning, dynamic analytical sections, and explainable AI rationales.
    """

    CHART_PALETTES = [
        ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#06b6d4", "#10b981"],
        ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#ec4899"]
    ]

    def __init__(self):
        self.recommender = RecommendationEngine()

    @staticmethod
    def load_dataframe(file_path: str) -> pd.DataFrame:
        lower = file_path.lower()
        if lower.endswith(".parquet"):
            return pd.read_parquet(file_path)
        elif lower.endswith((".xlsx", ".xls")):
            return pd.read_excel(file_path)
        elif lower.endswith(".csv") or lower.endswith(".txt"):
            return pd.read_csv(file_path)
        else:
            raise ValueError(f"Unsupported dataset format '{os.path.basename(file_path)}'. Only CSV, XLSX, XLS, and Parquet are supported.")

    def generate_dashboard(
        self,
        file_path: str,
        profile: Optional[Dict[str, Any]] = None,
        title: Optional[str] = None
    ) -> Dict[str, Any]:
        if profile is None:
            profile = DataProfiler.profile_dataset(file_path)

        df = self.load_dataframe(file_path)
        filename = os.path.basename(file_path)
        # Strip leading UUID prefix if present from uploads (e.g. 33a8eedd-8e7d-..._students.csv)
        clean_basename = re.sub(r"^[0-9a-fA-F-]{36}_", "", filename)
        clean_name = os.path.splitext(clean_basename)[0].replace("_", " ").title()
        dataset_title = title or f"{clean_name} Adaptive Intelligence"

        # 1. Generate Semantic Analytical Domains for dynamic navigation
        domains = DomainAnalyzer.identify_domains(profile)
        navigation_sections = [
            {
                "id": "main",
                "title": "Main Dashboard",
                "icon": "layout",
                "type": "overview",
                "description": "Executive overview with primary KPIs and multi-faceted visualizations"
            }
        ]
        for d in domains:
            navigation_sections.append({
                "id": d["id"],
                "title": d["title"],
                "icon": d["icon"],
                "type": "analysis",
                "description": d["description"],
                "columns": d["columns"],
                "metric_count": d["metric_count"]
            })

        # 2. Generate Recommendations
        recommendations = self.recommender.recommend(profile, top_k=8)

        # 3. Synthesize Adaptive KPIs
        kpis = self._generate_adaptive_kpis(df, profile)

        # 4. Build Interactive ECharts Visualizations with Aggregated Data
        visualizations = []
        for idx, rec in enumerate(recommendations):
            viz = self._build_visualization_spec(df, rec, idx, domains)
            visualizations.append(viz)

        # 5. Generate Filter Definitions
        filters = self._generate_filters(profile)

        # 6. Build Grid Layout
        layout_grid = self._compute_layout_grid(len(visualizations))

        return {
            "title": dataset_title,
            "dataset_filename": clean_basename,
            "total_rows": len(df),
            "total_columns": len(df.columns),
            "kpis": kpis,
            "navigation_sections": navigation_sections,
            "visualizations": visualizations,
            "filters": filters,
            "layout_grid": layout_grid
        }

    def _generate_adaptive_kpis(self, df: pd.DataFrame, profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        types = profile.get("column_types", {})
        col_stats = profile.get("column_statistics", {})

        def is_id_or_ordinal(c: str) -> bool:
            lower = c.lower()
            return lower.endswith("id") or lower.endswith("_id") or lower in ["id", "code", "index", "semester", "year", "rank", "rankings"]

        num_cols = [c for c, t in types.items() if t in ("numeric_continuous", "numeric_discrete") and not is_id_or_ordinal(c)]
        dt_cols = [c for c, t in types.items() if t == "datetime"]
        dt_series = df[dt_cols[0]] if dt_cols else None

        def calc_trend(series: pd.Series) -> Tuple[Optional[str], Optional[str]]:
            try:
                clean = pd.to_numeric(series, errors="coerce").dropna()
                if len(clean) < 8:
                    return None, None
                if dt_series is not None:
                    temp = pd.DataFrame({"v": clean, "t": pd.to_datetime(dt_series, errors="coerce")}).dropna().sort_values("t")
                    clean = temp["v"]
                mid = len(clean) // 2
                p1 = float(clean.iloc[:mid].mean())
                p2 = float(clean.iloc[mid:].mean())
                if p1 == 0 or np.isnan(p1) or np.isnan(p2):
                    return None, None
                pct = ((p2 - p1) / abs(p1)) * 100
                if abs(pct) < 0.1:
                    return "0.0%", "neutral"
                direction = "up" if pct > 0 else "down"
                sign = "+" if pct > 0 else ""
                return f"{sign}{pct:.1f}%", direction
            except Exception:
                return None, None

        kpis = []

        # 1. Total records (Gradient Solid Blue Style)
        rec_trend, rec_trend_dir = (None, None)
        if dt_series is not None and len(df) >= 8:
            rec_trend, rec_trend_dir = calc_trend(pd.Series(range(len(df))))

        kpis.append({
            "id": "kpi-records",
            "title": "Total Observations",
            "value": len(df),
            "formatted_value": f"{len(df):,}",
            "subtitle": "Total records indexed locally",
            "icon": "database",
            "color": "#38bdf8",
            "card_style": "gradient",
            "badge": f"{len(df):,} Rows",
            "trend": rec_trend,
            "trend_direction": rec_trend_dir
        })

        # 2. Financial Sum or Primary Continuous Aggregate (Gradient Style)
        finance_col = None
        for col in num_cols:
            col_lower = col.lower()
            if any(term in col_lower for term in ["revenue", "sales", "balance", "cost", "cart", "spend", "profit", "amount", "total"]):
                if "unit" not in col_lower and "pct" not in col_lower and "rate" not in col_lower:
                    finance_col = col
                    break

        if finance_col:
            total_val = float(df[finance_col].sum())
            is_currency = any(m in finance_col.lower() for m in ["revenue", "sales", "balance", "cost", "spend", "profit", "amount"])
            formatted = f"${total_val:,.0f}" if (is_currency and total_val > 1000) else f"{total_val:,.0f}"
            fin_trend, fin_dir = calc_trend(df[finance_col])
            kpis.append({
                "id": f"kpi-{finance_col.lower()}",
                "title": f"Total {finance_col.replace('_', ' ')}",
                "value": round(total_val, 2),
                "formatted_value": formatted,
                "subtitle": "Cumulative aggregated metric",
                "icon": "trending-up",
                "color": "#38bdf8",
                "card_style": "gradient",
                "badge": "Aggregated",
                "trend": fin_trend,
                "trend_direction": fin_dir
            })
        elif num_cols:
            first_col = num_cols[0]
            val = float(df[first_col].sum())
            sum_trend, sum_dir = calc_trend(df[first_col])
            kpis.append({
                "id": f"kpi-{str(first_col).lower()}",
                "title": f"Sum of {str(first_col).replace('_', ' ')}",
                "value": round(val, 2),
                "formatted_value": f"{val:,.0f}",
                "subtitle": "Aggregated sum metric",
                "icon": "activity",
                "color": "#38bdf8",
                "card_style": "gradient",
                "badge": "Aggregated",
                "trend": sum_trend,
                "trend_direction": sum_dir
            })

        # 3. Average / Rate Benchmark (Glass Card)
        benchmark_col = None
        for col in num_cols:
            col_lower = col.lower()
            if col != finance_col and any(term in col_lower for term in ["profit", "cgpa", "score", "attendance", "rating", "temp", "bonus", "mark", "gpa", "pct", "rate"]):
                benchmark_col = col
                break
        if not benchmark_col and len(num_cols) > 1:
            benchmark_col = num_cols[1] if num_cols[1] != finance_col else (num_cols[0] if len(num_cols) > 0 else None)

        if benchmark_col:
            mean_val = float(df[benchmark_col].mean())
            is_rate = any(t in benchmark_col.lower() for t in ["attendance", "pct", "rate"])
            is_currency = any(t in benchmark_col.lower() for t in ["salary", "revenue", "price", "cost", "wage"])
            suffix = "%" if is_rate else ""
            prefix = "$" if is_currency else ""
            formatted = f"{prefix}{mean_val:,.1f}{suffix}"
            bm_trend, bm_dir = calc_trend(df[benchmark_col])
            kpis.append({
                "id": f"kpi-avg-{benchmark_col.lower()}",
                "title": f"Mean {benchmark_col.replace('_', ' ')}",
                "value": round(mean_val, 2),
                "formatted_value": formatted,
                "subtitle": "Average benchmark value",
                "icon": "activity",
                "color": "#06b6d4",
                "card_style": "glass",
                "badge": "Average",
                "trend": bm_trend,
                "trend_direction": bm_dir
            })

        # 4. Dimension Cardinality (Glass Card)
        cat_cols = [c for c, t in types.items() if t in ("categorical_nominal", "categorical_ordinal") and not is_id_or_ordinal(c)]
        if cat_cols:
            primary_cat = cat_cols[0]
            n_groups = int(df[primary_cat].nunique())
            kpis.append({
                "id": f"kpi-{primary_cat.lower()}",
                "title": f"Unique {primary_cat.replace('_', ' ')}s",
                "value": n_groups,
                "formatted_value": f"{n_groups:,}",
                "subtitle": "Distinct categorical segments",
                "icon": "layers",
                "color": "#f59e0b",
                "card_style": "glass",
                "badge": f"{n_groups} Segments",
                "trend": None,
                "trend_direction": None
            })
        elif len(num_cols) > 2:
            third_col = num_cols[2]
            max_val = float(df[third_col].max())
            kpis.append({
                "id": f"kpi-max-{third_col.lower()}",
                "title": f"Peak {third_col.replace('_', ' ')}",
                "value": round(max_val, 2),
                "formatted_value": f"{max_val:,.0f}",
                "subtitle": "Maximum observed point",
                "icon": "layers",
                "color": "#f59e0b",
                "card_style": "glass",
                "badge": "Peak",
                "trend": None,
                "trend_direction": None
            })

        return kpis[:4]

    def _build_visualization_spec(
        self,
        df: pd.DataFrame,
        rec: Dict[str, Any],
        order_idx: int,
        domains: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        chart_type = rec["chart_type"]
        x = rec["x_axis"]
        y = rec["y_axis"]
        agg = rec.get("aggregation", "SUM")

        # Find matching domain
        assigned_domain_id = "domain-1"
        for d in domains:
            if x in d.get("columns", []) or y in d.get("columns", []):
                assigned_domain_id = d["id"]
                break

        # Assign customized semantic theme properties per card
        card_styles = [
            {
                "accent": "#0284c7",
                "bg_tint": "linear-gradient(180deg, rgba(2, 132, 199, 0.08) 0%, rgba(15, 23, 42, 0.65) 100%)",
                "col_span": 2,
                "layout_size": "hero",
                "height": 370
            },
            {
                "accent": "#ea580c",
                "bg_tint": "linear-gradient(180deg, rgba(234, 88, 12, 0.08) 0%, rgba(15, 23, 42, 0.65) 100%)",
                "col_span": 1,
                "layout_size": "medium",
                "height": 340
            },
            {
                "accent": "#10b981",
                "bg_tint": "linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.65) 100%)",
                "col_span": 1,
                "layout_size": "medium",
                "height": 340
            },
            {
                "accent": "#f97316",
                "bg_tint": "linear-gradient(180deg, rgba(249, 115, 22, 0.08) 0%, rgba(15, 23, 42, 0.65) 100%)",
                "col_span": 1,
                "layout_size": "tall",
                "height": 360
            },
            {
                "accent": "#8b5cf6",
                "bg_tint": "linear-gradient(180deg, rgba(139, 92, 246, 0.08) 0%, rgba(15, 23, 42, 0.65) 100%)",
                "col_span": 1,
                "layout_size": "standard",
                "height": 340
            },
            {
                "accent": "#06b6d4",
                "bg_tint": "linear-gradient(180deg, rgba(6, 182, 212, 0.08) 0%, rgba(15, 23, 42, 0.65) 100%)",
                "col_span": 2,
                "layout_size": "progress",
                "height": 340
            },
            {
                "accent": "#ec4899",
                "bg_tint": "linear-gradient(180deg, rgba(236, 72, 153, 0.08) 0%, rgba(15, 23, 42, 0.65) 100%)",
                "col_span": 1,
                "layout_size": "standard",
                "height": 340
            },
            {
                "accent": "#eab308",
                "bg_tint": "linear-gradient(180deg, rgba(234, 179, 8, 0.08) 0%, rgba(15, 23, 42, 0.65) 100%)",
                "col_span": 1,
                "layout_size": "standard",
                "height": 340
            }
        ]

        style_cfg = card_styles[order_idx % len(card_styles)]

        echarts_option = self.compile_echarts_option(
            df, chart_type, x, y, agg, rec["title"], order_idx, style_cfg["accent"]
        )

        return {
            "id": f"viz-{order_idx + 1}",
            "chart_type": chart_type,
            "title": rec["title"],
            "x_axis": x,
            "y_axis": y,
            "dimension": x,
            "metric": y,
            "aggregation": agg,
            "score": rec["score"],
            "reason": rec["reason"],
            "domain_id": assigned_domain_id,
            "display_order": order_idx,
            "col_span": style_cfg["col_span"],
            "layout_size": style_cfg["layout_size"],
            "card_height": style_cfg["height"],
            "accent_color": style_cfg["accent"],
            "card_bg_tint": style_cfg["bg_tint"],
            "chart_options": echarts_option
        }

    def compile_echarts_option(
        self,
        df: pd.DataFrame,
        chart_type: str,
        x: str,
        y: str,
        agg: str,
        title: str,
        order_idx: int = 0,
        accent_color: str = "#6366f1"
    ) -> Dict[str, Any]:
        # Diverse palettes for distinct data marks
        distinct_palettes = [
            ["#0284c7", "#38bdf8", "#7dd3fc", "#bae6fd", "#e0f2fe"],  # Azure/Blue
            ["#ea580c", "#f97316", "#fb923c", "#fdba74", "#fed7aa"],  # Sunset Orange
            ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5"],  # Mint Emerald
            ["#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe"],  # Amethyst Purple
            ["#06b6d4", "#22d3ee", "#67e8f9", "#a5f3fc", "#cffafe"],  # Cyan Sky
            ["#f43f5e", "#fb7185", "#fda4af", "#fecdd3", "#ffe4e6"]   # Rose Coral
        ]
        palette = distinct_palettes[order_idx % len(distinct_palettes)]

        # Resolve x and y safely against dataframe columns
        cols = list(df.columns)
        if not cols:
            return {"title": {"text": title}, "series": []}

        num_cols = list(df.select_dtypes(include=[np.number]).columns)
        cat_cols = [c for c in cols if c not in num_cols]

        if not x or x not in df.columns:
            x = cat_cols[0] if cat_cols else cols[0]
        if not y or y not in df.columns:
            y = num_cols[0] if num_cols else x

        # 1. Bar Chart (with rounded pill caps & background column tracks like reference image)
        if chart_type == "bar":
            agg_fn = "mean" if agg == "AVG" else ("count" if agg == "COUNT" else "sum")
            if x == y or y not in num_cols:
                grouped = df[x].value_counts().reset_index()
                grouped.columns = [x, "count"]
                grouped = grouped.head(12)
                categories = grouped[x].astype(str).tolist()
                values = [int(v) for v in grouped["count"]]
            else:
                grouped = df.groupby(x, as_index=False)[y].agg(agg_fn)
                grouped = grouped.sort_values(y, ascending=False).head(12)
                categories = grouped[x].astype(str).tolist()
                values = [round(float(v), 2) for v in grouped[y]]

            return {
                "title": {"text": title, "textStyle": {"color": "#f8fafc", "fontSize": 14, "fontWeight": 600}},
                "tooltip": {"trigger": "axis", "axisPointer": {"type": "shadow"}},
                "grid": {"left": "3%", "right": "4%", "bottom": "12%", "top": "18%", "containLabel": True},
                "xAxis": {
                    "type": "category",
                    "data": categories,
                    "axisLabel": {"color": "#94a3b8", "rotate": 25 if len(categories) > 6 else 0},
                    "axisLine": {"lineStyle": {"color": "#334155"}}
                },
                "yAxis": {
                    "type": "value",
                    "axisLabel": {"color": "#94a3b8"},
                    "splitLine": {"lineStyle": {"color": "rgba(255, 255, 255, 0.05)"}}
                },
                "series": [{
                    "type": "bar",
                    "data": values,
                    "showBackground": True,
                    "backgroundStyle": {
                        "color": "rgba(255, 255, 255, 0.05)",
                        "borderRadius": [6, 6, 0, 0]
                    },
                    "itemStyle": {
                        "color": accent_color,
                        "borderRadius": [6, 6, 0, 0]
                    }
                }]
            }

        # 2. Line Chart / Area Chart (with rich area fill and glowing strokes)
        elif chart_type in ("line", "area"):
            is_area = chart_type == "area" or order_idx == 0 or order_idx == 1
            agg_fn = "mean" if agg == "AVG" else "sum"
            grouped = df.groupby(x, as_index=False)[y].agg(agg_fn)
            try:
                grouped[x] = pd.to_datetime(grouped[x])
                grouped = grouped.sort_values(x)
                categories = grouped[x].dt.strftime("%Y-%m-%d").tolist()
            except Exception:
                grouped = grouped.sort_values(x).head(30)
                categories = grouped[x].astype(str).tolist()

            values = [round(float(v), 2) for v in grouped[y]]

            area_stop_alpha = "0.36" if order_idx == 0 else "0.25"
            series_def = {
                "type": "line",
                "data": values,
                "smooth": 0.35,
                "lineStyle": {"width": 3.2, "color": accent_color},
                "itemStyle": {"color": accent_color}
            }
            if is_area:
                # Custom linear gradient for area fill
                series_def["areaStyle"] = {
                    "color": {
                        "type": "linear",
                        "x": 0, "y": 0, "x2": 0, "y2": 1,
                        "colorStops": [
                            {"offset": 0, "color": f"{accent_color}55"},
                            {"offset": 1, "color": f"{accent_color}00"}
                        ]
                    }
                }

            return {
                "title": {"text": title, "textStyle": {"color": "#f8fafc", "fontSize": 14, "fontWeight": 600}},
                "tooltip": {"trigger": "axis"},
                "grid": {"left": "3%", "right": "4%", "bottom": "12%", "top": "18%", "containLabel": True},
                "xAxis": {
                    "type": "category",
                    "data": categories,
                    "axisLabel": {"color": "#94a3b8", "rotate": 25 if len(categories) > 8 else 0},
                    "axisLine": {"lineStyle": {"color": "#334155"}}
                },
                "yAxis": {
                    "type": "value",
                    "axisLabel": {"color": "#94a3b8"},
                    "splitLine": {"lineStyle": {"color": "rgba(255, 255, 255, 0.05)"}}
                },
                "series": [series_def]
            }

        # 3. Pie / Donut Chart (Matching "Percentage Share %" in reference image)
        elif chart_type in ("pie", "donut"):
            agg_fn = "count" if agg == "COUNT" else ("mean" if agg == "AVG" else "sum")
            grouped = df.groupby(x, as_index=False)[y].agg(agg_fn)
            grouped = grouped.sort_values(y, ascending=False).head(6)
            pie_data = [{"name": str(r[x]), "value": round(float(r[y]), 2)} for _, r in grouped.iterrows()]

            return {
                "title": {"text": title, "textStyle": {"color": "#f8fafc", "fontSize": 14, "fontWeight": 600}},
                "tooltip": {"trigger": "item", "formatter": "{b}: {c} ({d}%)"},
                "legend": {
                    "orient": "vertical",
                    "right": "4%",
                    "top": "center",
                    "textStyle": {"color": "#94a3b8", "fontSize": 11},
                    "itemWidth": 10,
                    "itemHeight": 10
                },
                "color": palette,
                "series": [{
                    "type": "pie",
                    "radius": ["52%", "76%"],
                    "center": ["38%", "50%"],
                    "avoidLabelOverlap": True,
                    "itemStyle": {"borderRadius": 5, "borderColor": "#0f172a", "borderWidth": 2},
                    "label": {"show": False},
                    "emphasis": {"label": {"show": True, "fontSize": 12, "fontWeight": "bold", "color": "#f8fafc"}},
                    "data": pie_data
                }]
            }

        # 4. Progress / Benchmark Completion (Matching "Project Completion Rate" in reference image)
        elif chart_type == "progress":
            clean_vals = pd.to_numeric(df[y], errors="coerce").dropna()
            avg_rate = min(100.0, max(10.0, float(clean_vals.mean()))) if len(clean_vals) > 0 else 72.0
            
            return {
                "title": {"text": title, "textStyle": {"color": "#f8fafc", "fontSize": 14, "fontWeight": 600}},
                "tooltip": {"formatter": "{a} <br/>{b} : {c}%"},
                "grid": {"left": "5%", "right": "5%", "bottom": "15%", "top": "25%", "containLabel": True},
                "xAxis": {"type": "value", "max": 100, "show": False},
                "yAxis": {"type": "category", "data": [x], "show": False},
                "series": [
                    {
                        "name": "Target Track",
                        "type": "bar",
                        "data": [100],
                        "barWidth": 16,
                        "itemStyle": {"color": "rgba(255, 255, 255, 0.08)", "borderRadius": 8},
                        "z": 1
                    },
                    {
                        "name": "Completed",
                        "type": "bar",
                        "data": [round(avg_rate, 1)],
                        "barWidth": 16,
                        "barGap": "-100%",
                        "itemStyle": {"color": accent_color, "borderRadius": 8},
                        "label": {
                            "show": True,
                            "position": "right",
                            "formatter": f"{avg_rate:.1f}%",
                            "color": "#f8fafc",
                            "fontWeight": "bold"
                        },
                        "z": 2
                    }
                ]
            }

        # 5. Scatter Plot
        elif chart_type == "scatter":
            clean_df = df.dropna(subset=[x, y]) if (x in df.columns and y in df.columns) else df.dropna()
            if len(clean_df) > 250:
                clean_df = clean_df.sample(n=250, random_state=42)

            is_x_num = pd.to_numeric(clean_df[x], errors="coerce").notnull().mean() > 0.6
            is_y_num = pd.to_numeric(clean_df[y], errors="coerce").notnull().mean() > 0.6

            if not is_y_num and num_cols:
                y = num_cols[0]

            clean_df[y] = pd.to_numeric(clean_df[y], errors="coerce")
            clean_df = clean_df.dropna(subset=[y])

            if is_x_num:
                clean_df[x] = pd.to_numeric(clean_df[x], errors="coerce")
                clean_df = clean_df.dropna(subset=[x])
                scatter_data = [[round(float(r[x]), 2), round(float(r[y]), 2)] for _, r in clean_df.iterrows()]
                x_axis_def: Dict[str, Any] = {
                    "name": x,
                    "type": "value",
                    "nameTextStyle": {"color": "#94a3b8"},
                    "axisLabel": {"color": "#94a3b8"},
                    "splitLine": {"lineStyle": {"color": "rgba(255, 255, 255, 0.05)"}}
                }
            else:
                cats = list(clean_df[x].astype(str).unique())
                cat_to_idx = {c: i for i, c in enumerate(cats)}
                scatter_data = [[cat_to_idx[str(r[x])], round(float(r[y]), 2)] for _, r in clean_df.iterrows()]
                x_axis_def = {
                    "name": x,
                    "type": "category",
                    "data": cats,
                    "nameTextStyle": {"color": "#94a3b8"},
                    "axisLabel": {"color": "#94a3b8", "rotate": 20 if len(cats) > 6 else 0},
                    "splitLine": {"lineStyle": {"color": "rgba(255, 255, 255, 0.05)"}}
                }

            return {
                "title": {"text": title, "textStyle": {"color": "#f8fafc", "fontSize": 14, "fontWeight": 600}},
                "tooltip": {"trigger": "item", "formatter": f"{x}: {{c[0]}}<br/>{y}: {{c[1]}}"},
                "grid": {"left": "3%", "right": "4%", "bottom": "12%", "top": "18%", "containLabel": True},
                "xAxis": x_axis_def,
                "yAxis": {
                    "name": y,
                    "type": "value",
                    "nameTextStyle": {"color": "#94a3b8"},
                    "axisLabel": {"color": "#94a3b8"},
                    "splitLine": {"lineStyle": {"color": "rgba(255, 255, 255, 0.05)"}}
                },
                "series": [{
                    "type": "scatter",
                    "data": scatter_data,
                    "symbolSize": 9,
                    "itemStyle": {"color": accent_color, "opacity": 0.85}
                }]
            }

        # 6. Histogram
        elif chart_type == "histogram":
            target_col = x if (x in num_cols) else (y if y in num_cols else (num_cols[0] if num_cols else x))
            clean_vals = pd.to_numeric(df[target_col], errors="coerce").dropna()
            if len(clean_vals) < 2:
                val_counts = df[x].value_counts().head(10)
                bin_labels = [str(k) for k in val_counts.index]
                counts = [int(v) for v in val_counts.values]
            else:
                counts_arr, bin_edges = np.histogram(clean_vals, bins=12)
                bin_labels = [f"{bin_edges[i]:.1f}-{bin_edges[i+1]:.1f}" for i in range(len(counts_arr))]
                counts = [int(c) for c in counts_arr]

            return {
                "title": {"text": title, "textStyle": {"color": "#f8fafc", "fontSize": 14, "fontWeight": 600}},
                "tooltip": {"trigger": "axis"},
                "grid": {"left": "3%", "right": "4%", "bottom": "12%", "top": "18%", "containLabel": True},
                "xAxis": {
                    "type": "category",
                    "data": bin_labels,
                    "axisLabel": {"color": "#94a3b8", "rotate": 25},
                    "axisLine": {"lineStyle": {"color": "#334155"}}
                },
                "yAxis": {"type": "value", "axisLabel": {"color": "#94a3b8"}, "splitLine": {"lineStyle": {"color": "rgba(255, 255, 255, 0.05)"}}},
                "series": [{
                    "type": "bar",
                    "data": counts,
                    "showBackground": True,
                    "backgroundStyle": {"color": "rgba(255, 255, 255, 0.04)", "borderRadius": [5, 5, 0, 0]},
                    "itemStyle": {"color": accent_color, "borderRadius": [5, 5, 0, 0]}
                }]
            }

        # 7. Box Plot (Dispersion & Outliers Analysis)
        elif chart_type in ("box", "boxplot"):
            if x and y and x != y and x in df.columns and y in df.columns:
                grouped_boxes = []
                categories = []
                top_cats = df[x].dropna().value_counts().head(8).index.tolist()
                for cat in top_cats:
                    group_vals = pd.to_numeric(df[df[x] == cat][y], errors="coerce").dropna()
                    if len(group_vals) >= 3:
                        q1 = float(np.percentile(group_vals, 25))
                        med = float(np.percentile(group_vals, 50))
                        q3 = float(np.percentile(group_vals, 75))
                        low = float(group_vals.min())
                        high = float(group_vals.max())
                        grouped_boxes.append([round(low, 2), round(q1, 2), round(med, 2), round(q3, 2), round(high, 2)])
                        categories.append(str(cat))
                if not categories:
                    val_col = y if y in df.columns else x
                    v = pd.to_numeric(df[val_col], errors="coerce").dropna()
                    if len(v) > 0:
                        categories = [str(val_col)]
                        grouped_boxes = [[round(float(v.min()), 2), round(float(np.percentile(v, 25)), 2), round(float(v.median()), 2), round(float(np.percentile(v, 75)), 2), round(float(v.max()), 2)]]
            else:
                val_col = y if (y and y in df.columns) else (x if (x and x in df.columns) else None)
                if not val_col:
                    num_avail = df.select_dtypes(include=[np.number]).columns
                    val_col = num_avail[0] if len(num_avail) > 0 else df.columns[0]
                v = pd.to_numeric(df[val_col], errors="coerce").dropna()
                categories = [str(val_col)]
                grouped_boxes = [[round(float(v.min()), 2), round(float(np.percentile(v, 25)), 2), round(float(v.median()), 2), round(float(np.percentile(v, 75)), 2), round(float(v.max()), 2)]]

            return {
                "title": {"text": title, "textStyle": {"color": "#f8fafc", "fontSize": 14, "fontWeight": 600}},
                "tooltip": {"trigger": "item"},
                "grid": {"left": "5%", "right": "5%", "bottom": "14%", "top": "18%", "containLabel": True},
                "xAxis": {
                    "type": "category",
                    "data": categories,
                    "axisLabel": {"color": "#94a3b8", "rotate": 20 if len(categories) > 5 else 0},
                    "axisLine": {"lineStyle": {"color": "#334155"}}
                },
                "yAxis": {"type": "value", "axisLabel": {"color": "#94a3b8"}, "splitLine": {"lineStyle": {"color": "rgba(255, 255, 255, 0.05)"}}},
                "series": [{
                    "name": "Boxplot",
                    "type": "boxplot",
                    "data": grouped_boxes,
                    "itemStyle": {
                        "color": f"{accent_color}33",
                        "borderColor": accent_color,
                        "borderWidth": 1.5
                    }
                }]
            }

        # 8. Heatmap (Correlation Matrix)
        elif chart_type == "heatmap":
            num_cols = df.select_dtypes(include=[np.number]).columns.tolist()[:6]
            if len(num_cols) >= 2:
                corr_matrix = df[num_cols].corr().fillna(0)
                features = [str(c).replace("_", " ") for c in num_cols]
                heatmap_data = []
                for i in range(len(num_cols)):
                    for j in range(len(num_cols)):
                        val = round(float(corr_matrix.iloc[i, j]), 2)
                        heatmap_data.append([i, j, val])

                return {
                    "title": {"text": title, "textStyle": {"color": "#f8fafc", "fontSize": 14, "fontWeight": 600}},
                    "tooltip": {"position": "top"},
                    "grid": {"left": "10%", "right": "5%", "bottom": "15%", "top": "18%", "containLabel": True},
                    "xAxis": {
                        "type": "category",
                        "data": features,
                        "axisLabel": {"color": "#94a3b8", "rotate": 25},
                        "axisLine": {"lineStyle": {"color": "#334155"}}
                    },
                    "yAxis": {
                        "type": "category",
                        "data": features,
                        "axisLabel": {"color": "#94a3b8"},
                        "axisLine": {"lineStyle": {"color": "#334155"}}
                    },
                    "visualMap": {
                        "min": -1,
                        "max": 1,
                        "calculable": True,
                        "orient": "horizontal",
                        "left": "center",
                        "bottom": "0%",
                        "inRange": {
                            "color": ["#ef4444", "#334155", "#0284c7"]
                        },
                        "textStyle": {"color": "#94a3b8"}
                    },
                    "series": [{
                        "name": "Correlation",
                        "type": "heatmap",
                        "data": heatmap_data,
                        "label": {"show": True, "color": "#f8fafc"},
                        "emphasis": {
                            "itemStyle": {"shadowBlur": 10, "shadowColor": "rgba(0, 0, 0, 0.5)"}
                        }
                    }]
                }

        # Fallback default
        return {
            "title": {"text": title, "textStyle": {"color": "#f8fafc", "fontSize": 14}},
            "xAxis": {"type": "category", "data": []},
            "yAxis": {"type": "value"},
            "series": [{"type": "bar", "data": []}]
        }

    def _generate_filters(self, profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        types = profile.get("column_types", {})
        col_stats = profile.get("column_statistics", {})
        filters = []

        for col, t in types.items():
            if t == "categorical_nominal":
                u_count = col_stats.get(col, {}).get("unique_count", 0)
                if 2 <= u_count <= 15:
                    top_vals = list(col_stats.get(col, {}).get("top_values", {}).keys())
                    filters.append({
                        "id": f"filter-{col.lower()}",
                        "column_name": col,
                        "type": "select",
                        "label": col.replace("_", " "),
                        "options": top_vals
                    })
            elif t == "datetime":
                filters.append({
                    "id": f"filter-{col.lower()}",
                    "column_name": col,
                    "type": "date_range",
                    "label": col.replace("_", " ")
                })

        return filters[:3]

    def _compute_layout_grid(self, n_charts: int) -> List[Dict[str, Any]]:
        # Bento asymmetric responsive layout:
        # Chart 0: Hero wide (col_span: 2)
        # Chart 1, 2, 3, 4: Focus cards (col_span: 1)
        # Chart 5: Milestone wide (col_span: 2)
        spans = [2, 1, 1, 1, 1, 2, 1, 1]
        grid = []
        for i in range(n_charts):
            span = spans[i % len(spans)]
            grid.append({
                "viz_index": i,
                "row": (i // 2) + 1,
                "col": (i % 2) + 1,
                "col_span": span,
                "row_span": 1
            })
        return grid
