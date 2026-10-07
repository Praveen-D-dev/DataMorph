from typing import Dict, Any, List


class RuleCandidateGenerator:
    """
    Evaluates Grammar of Graphics rules against dataset column profiles to generate
    viable visualization candidates.
    """

    @classmethod
    def generate_candidates(cls, profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        types = profile.get("column_types", {})
        col_stats = profile.get("column_statistics", {})
        corr_matrix = profile.get("correlation_matrix", {})

        numeric_cols = [c for c, t in types.items() if t in ("numeric_continuous", "numeric_discrete")]
        categorical_cols = [c for c, t in types.items() if t == "categorical_nominal"]
        datetime_cols = [c for c, t in types.items() if t == "datetime"]

        candidates = []

        # 1. Datetime + Numerical -> Line Chart
        for dt_col in datetime_cols:
            for num_col in numeric_cols:
                candidates.append({
                    "chart_type": "line",
                    "title": f"{num_col} Trend over {dt_col}",
                    "x_axis": dt_col,
                    "y_axis": num_col,
                    "aggregation": "AVG" if "continuous" in types[num_col] else "SUM",
                    "rule_tag": "temporal_trend",
                    "reason_template": f"{dt_col} provides an ordered time dimension, making line charts optimal for tracking {num_col} trends."
                })

        # 2. Categorical + Numerical -> Bar Chart
        for cat_col in categorical_cols:
            u_count = col_stats.get(cat_col, {}).get("unique_count", 0)
            if 2 <= u_count <= 25:
                for num_col in numeric_cols[:4]:
                    candidates.append({
                        "chart_type": "bar",
                        "title": f"Total {num_col} by {cat_col}",
                        "x_axis": cat_col,
                        "y_axis": num_col,
                        "aggregation": "SUM" if any(kw in num_col.lower() for kw in ["sales", "revenue", "cost", "unit", "profit", "hours"]) else "AVG",
                        "rule_tag": "categorical_comparison",
                        "reason_template": f"{cat_col} has {u_count} discrete categories, ideal for comparing {num_col} aggregates."
                    })

        # 3. Low-cardinality Categorical + Numerical -> Pie/Donut Chart
        for cat_col in categorical_cols:
            u_count = col_stats.get(cat_col, {}).get("unique_count", 0)
            if 3 <= u_count <= 7:
                for num_col in numeric_cols[:2]:
                    candidates.append({
                        "chart_type": "pie",
                        "title": f"{num_col} Share by {cat_col}",
                        "x_axis": cat_col,
                        "y_axis": num_col,
                        "aggregation": "SUM",
                        "rule_tag": "part_to_whole",
                        "reason_template": f"{cat_col} has {u_count} distinct categories, well within the 7-slice limit for clear part-to-whole share visualization."
                    })

        # 4. Numerical + Numerical -> Scatter Plot
        for i, col1 in enumerate(numeric_cols):
            for col2 in numeric_cols[i + 1:]:
                corr_val = abs(corr_matrix.get(col1, {}).get(col2, 0.0))
                candidates.append({
                    "chart_type": "scatter",
                    "title": f"{col2} vs {col1}",
                    "x_axis": col1,
                    "y_axis": col2,
                    "aggregation": "NONE",
                    "rule_tag": "bivariate_correlation",
                    "reason_template": f"Both {col1} and {col2} are continuous numerical variables (correlation |r|={corr_val:.2f}), suitable for scatter analysis."
                })

        # 5. Single Numerical Variable with Outliers / Variance -> Box Plot
        for num_col in numeric_cols:
            stats = col_stats.get(num_col, {})
            outliers = stats.get("outlier_count", 0)
            if outliers > 0 or abs(stats.get("skewness", 0.0)) > 0.5:
                # Pair with categorical if available for grouped box plot
                group_col = categorical_cols[0] if categorical_cols else None
                candidates.append({
                    "chart_type": "box",
                    "title": f"{num_col} Distribution" + (f" by {group_col}" if group_col else ""),
                    "x_axis": group_col or num_col,
                    "y_axis": num_col,
                    "aggregation": "NONE",
                    "rule_tag": "distribution_outlier",
                    "reason_template": f"{num_col} exhibits {outliers} outlier points (skewness={stats.get('skewness', 0.0):.2f}), making a box plot effective for dispersion analysis."
                })

        # 6. Single Numerical Distribution -> Histogram
        for num_col in numeric_cols:
            candidates.append({
                "chart_type": "histogram",
                "title": f"Frequency Distribution of {num_col}",
                "x_axis": num_col,
                "y_axis": "Frequency",
                "aggregation": "COUNT_BINS",
                "rule_tag": "univariate_distribution",
                "reason_template": f"{num_col} is numerical; histogram binning reveals its underlying probability density."
            })

        # 7. Multiple Numerical Variables -> Correlation Heatmap
        if len(numeric_cols) >= 3:
            candidates.append({
                "chart_type": "heatmap",
                "title": "Cross-Feature Correlation Heatmap",
                "x_axis": "Features",
                "y_axis": "Features",
                "aggregation": "CORRELATION",
                "rule_tag": "multivariate_correlation",
                "reason_template": f"Dataset contains {len(numeric_cols)} numerical features, ideal for a matrix correlation heatmap."
            })

        return candidates
