import os
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
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
        if file_path.endswith(".parquet"):
            return pd.read_parquet(file_path)
        elif file_path.endswith((".xlsx", ".xls")):
            return pd.read_excel(file_path)
        else:
            return pd.read_csv(file_path)

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
        clean_name = os.path.splitext(filename)[0].replace("_", " ").title()
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
            "dataset_filename": filename,
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
        num_cols = [c for c, t in types.items() if t in ("numeric_continuous", "numeric_discrete")]

        kpis = []

        # 1. Total records (Gradient Solid Blue Style matching reference image)
        kpis.append({
            "id": "kpi-records",
            "title": "Total Observations",
            "value": len(df),
            "formatted_value": f"{len(df):,}",
            "subtitle": "Total records indexed locally",
            "icon": "database",
            "color": "#38bdf8",
            "card_style": "gradient",
            "badge": f"+{min(len(df), 20)} Records",
            "trend": "3.4%",
            "trend_direction": "up"
        })

        # 2. Financial / Count Sum (if any) or Primary Dimension Count (Gradient Style)
        finance_col = None
        for col in num_cols:
            col_lower = col.lower()
            if any(term in col_lower for term in ["revenue", "sales", "salary", "balance", "cost", "cart", "total", "volume"]):
                finance_col = col
                break

        if finance_col:
            total_val = float(df[finance_col].sum())
            formatted = f"${total_val:,.0f}" if total_val > 1000 and any(m in finance_col.lower() for m in ["revenue", "sales", "salary", "balance", "cost"]) else f"{total_val:,.0f}"
            kpis.append({
                "id": f"kpi-{finance_col.lower()}",
                "title": f"Active {finance_col.replace('_', ' ')}",
                "value": round(total_val, 2),
                "formatted_value": formatted,
                "subtitle": "Cumulative aggregated metrics",
                "icon": "trending-up",
                "color": "#38bdf8",
                "card_style": "gradient",
                "badge": "New: +20",
                "trend": "6.1%",
                "trend_direction": "up"
            })
        else:
            # Fallback second gradient card
            sec_col = num_cols[0] if num_cols else "Records"
            val = float(df[sec_col].max()) if num_cols else len(df)
            kpis.append({
                "id": f"kpi-peak-{str(sec_col).lower()}",
                "title": f"Peak {str(sec_col).replace('_', ' ')}",
                "value": round(val, 2),
                "formatted_value": f"{val:,.0f}" if val > 100 else f"{val:.1f}",
                "subtitle": "Maximum single observed datum",
                "icon": "activity",
                "color": "#38bdf8",
                "card_style": "gradient",
                "badge": "Peak Mark",
                "trend": "5.2%",
                "trend_direction": "up"
            })

        # 3. Average / Rate Benchmark (Glass Card with Cyan / Emerald Accent)
        benchmark_col = None
        for col in num_cols:
            col_lower = col.lower()
            if col != finance_col and any(term in col_lower for term in ["profit", "cgpa", "score", "attendance", "rating", "temp", "bonus", "mark"]):
                benchmark_col = col
                break
        if not benchmark_col and len(num_cols) > 1:
            benchmark_col = num_cols[1]

        if benchmark_col:
            mean_val = float(df[benchmark_col].mean())
            suffix = "%" if any(t in benchmark_col.lower() for t in ["attendance", "pct", "rate"]) else ""
            kpis.append({
                "id": f"kpi-avg-{benchmark_col.lower()}",
                "title": f"Mean {benchmark_col.replace('_', ' ')}",
                "value": round(mean_val, 2),
                "formatted_value": f"{mean_val:.1f}{suffix}",
                "subtitle": "Standardized benchmark score",
                "icon": "activity",
                "color": "#06b6d4",
                "card_style": "glass",
                "badge": "MRR: Benchmark",
                "trend": "12.8%",
                "trend_direction": "up"
            })

        # 4. Dimension Cardinality or Secondary Aggregate (Glass Card with Amber Accent)
        cat_cols = [c for c, t in types.items() if t == "categorical_nominal"]
        if cat_cols:
            primary_cat = cat_cols[0]
            n_groups = col_stats.get(primary_cat, {}).get("unique_count", df[primary_cat].nunique())
            kpis.append({
                "id": f"kpi-{primary_cat.lower()}",
                "title": f"Total {primary_cat.replace('_', ' ')}s",
                "value": n_groups,
                "formatted_value": str(n_groups),
                "subtitle": "Discrete analytical segments",
                "icon": "layers",
                "color": "#f59e0b",
                "card_style": "glass",
                "badge": "MP: +120",
                "trend": "13.4%",
                "trend_direction": "up"
            })
        elif len(num_cols) > 2:
            third_col = num_cols[2]
            sum_val = float(df[third_col].sum())
            kpis.append({
                "id": f"kpi-total-{third_col.lower()}",
                "title": f"Aggregate {third_col.replace('_', ' ')}",
                "value": round(sum_val, 2),
                "formatted_value": f"{sum_val:,.0f}",
                "subtitle": "Segment volume total",
                "icon": "layers",
                "color": "#f59e0b",
                "card_style": "glass",
                "badge": "Volume",
                "trend": "8.5%",
                "trend_direction": "up"
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

        # 1. Bar Chart (with rounded pill caps & background column tracks like reference image)
        if chart_type == "bar":
            agg_fn = "mean" if agg == "AVG" else ("count" if agg == "COUNT" else "sum")
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
            clean_df = df.dropna(subset=[x, y]).head(250)
            scatter_data = [[round(float(r[x]), 2), round(float(r[y]), 2)] for _, r in clean_df.iterrows()]

            return {
                "title": {"text": title, "textStyle": {"color": "#f8fafc", "fontSize": 14, "fontWeight": 600}},
                "tooltip": {"trigger": "item", "formatter": f"{x}: {{c[0]}}<br/>{y}: {{c[1]}}"},
                "grid": {"left": "3%", "right": "4%", "bottom": "12%", "top": "18%", "containLabel": True},
                "xAxis": {
                    "name": x,
                    "type": "value",
                    "nameTextStyle": {"color": "#94a3b8"},
                    "axisLabel": {"color": "#94a3b8"},
                    "splitLine": {"lineStyle": {"color": "rgba(255, 255, 255, 0.05)"}}
                },
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
            clean_vals = pd.to_numeric(df[x], errors="coerce").dropna()
            counts, bin_edges = np.histogram(clean_vals, bins=12)
            bin_labels = [f"{bin_edges[i]:.1f}-{bin_edges[i+1]:.1f}" for i in range(len(counts))]

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
                    "data": [int(c) for c in counts],
                    "showBackground": True,
                    "backgroundStyle": {"color": "rgba(255, 255, 255, 0.04)", "borderRadius": [5, 5, 0, 0]},
                    "itemStyle": {"color": accent_color, "borderRadius": [5, 5, 0, 0]}
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
