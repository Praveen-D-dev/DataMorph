import numpy as np
import pandas as pd
from typing import Dict, Any, List


class StatisticsEngine:
    """
    Computes statistical moments, cardinality, null counts, and correlations
    using vectorized operations with downcasted data views.
    """

    @staticmethod
    def compute_column_statistics(series: pd.Series, col_type: str) -> Dict[str, Any]:
        total_count = len(series)
        null_count = int(series.isnull().sum())
        non_null_series = series.dropna()
        n_valid = len(non_null_series)
        unique_count = int(non_null_series.nunique()) if n_valid > 0 else 0

        stats: Dict[str, Any] = {
            "total_count": total_count,
            "null_count": null_count,
            "null_ratio": round(null_count / total_count, 4) if total_count > 0 else 0.0,
            "unique_count": unique_count,
            "unique_ratio": round(unique_count / n_valid, 4) if n_valid > 0 else 0.0,
            "detected_type": col_type,
        }

        if col_type in ("numeric_continuous", "numeric_discrete") and n_valid > 0:
            numeric_vals = pd.to_numeric(non_null_series, errors="coerce").dropna()
            if len(numeric_vals) > 0:
                q25 = float(np.percentile(numeric_vals, 25))
                q50 = float(np.percentile(numeric_vals, 50))
                q75 = float(np.percentile(numeric_vals, 75))
                iqr = q75 - q25
                std = float(numeric_vals.std()) if len(numeric_vals) > 1 else 0.0
                mean = float(numeric_vals.mean())
                skew = float(numeric_vals.skew()) if len(numeric_vals) > 2 else 0.0

                stats.update({
                    "min": float(numeric_vals.min()),
                    "max": float(numeric_vals.max()),
                    "mean": round(mean, 4),
                    "std": round(std, 4),
                    "median": round(q50, 4),
                    "q25": round(q25, 4),
                    "q75": round(q75, 4),
                    "iqr": round(iqr, 4),
                    "skewness": round(skew, 4),
                    "outlier_count": int(((numeric_vals < (q25 - 1.5 * iqr)) | (numeric_vals > (q75 + 1.5 * iqr))).sum())
                })
        elif col_type == "categorical_nominal" and n_valid > 0:
            top_vals = non_null_series.value_counts().head(10).to_dict()
            stats["top_values"] = {str(k): int(v) for k, v in top_vals.items()}

        elif col_type == "datetime" and n_valid > 0:
            try:
                dt_series = pd.to_datetime(non_null_series, errors="coerce").dropna()
                if len(dt_series) > 0:
                    stats.update({
                        "min_date": dt_series.min().isoformat(),
                        "max_date": dt_series.max().isoformat(),
                        "temporal_range_days": (dt_series.max() - dt_series.min()).days
                    })
            except Exception:
                pass

        return stats

    @staticmethod
    def compute_correlation_matrix(df: pd.DataFrame, numeric_cols: List[str]) -> Dict[str, Dict[str, float]]:
        if len(numeric_cols) < 2:
            return {}
        try:
            num_df = df[numeric_cols].apply(pd.to_numeric, errors="coerce")
            corr = num_df.corr(method="pearson").fillna(0.0)
            result = {}
            for col1 in numeric_cols:
                result[col1] = {}
                for col2 in numeric_cols:
                    val = float(corr.loc[col1, col2])
                    result[col1][col2] = round(val if not np.isnan(val) else 0.0, 4)
            return result
        except Exception:
            return {}
