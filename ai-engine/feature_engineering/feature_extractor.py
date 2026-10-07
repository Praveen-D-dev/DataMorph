import numpy as np
from typing import Dict, Any, List


class FeatureExtractor:
    """
    Transforms statistical profiles into normalized multi-dimensional feature vectors
    for machine-learning suitability scoring and ranking.
    """

    FEATURE_NAMES = [
        "log_row_count",
        "column_count",
        "ratio_numeric_continuous",
        "ratio_numeric_discrete",
        "ratio_categorical",
        "ratio_datetime",
        "ratio_boolean",
        "mean_missing_ratio",
        "max_missing_ratio",
        "mean_cardinality_ratio",
        "max_cardinality_ratio",
        "mean_skewness",
        "max_skewness",
        "mean_pairwise_correlation",
        "max_pairwise_correlation",
        "has_datetime_col",
        "has_high_cardinality_col",
        "is_time_series_structure",
        "is_business_tabular_structure"
    ]

    @classmethod
    def extract_vector(cls, profile: Dict[str, Any]) -> List[float]:
        file_info = profile.get("file_info", {})
        row_count = max(1, file_info.get("row_count", 1))
        col_count = max(1, file_info.get("column_count", 1))

        type_counts = profile.get("type_counts", {})
        n_cont = type_counts.get("numeric_continuous", 0)
        n_disc = type_counts.get("numeric_discrete", 0)
        n_cat = type_counts.get("categorical_nominal", 0)
        n_dt = type_counts.get("datetime", 0)
        n_bool = type_counts.get("boolean", 0)

        col_stats = profile.get("column_statistics", {})
        missing_ratios = [s.get("null_ratio", 0.0) for s in col_stats.values()]
        card_ratios = [s.get("unique_ratio", 0.0) for s in col_stats.values()]
        skewness_vals = [abs(s.get("skewness", 0.0)) for s in col_stats.values() if "skewness" in s]

        corr_matrix = profile.get("correlation_matrix", {})
        corr_vals = []
        for c1, row in corr_matrix.items():
            for c2, val in row.items():
                if c1 != c2:
                    corr_vals.append(abs(val))

        log_row_count = float(np.log10(row_count))
        mean_missing = float(np.mean(missing_ratios)) if missing_ratios else 0.0
        max_missing = float(np.max(missing_ratios)) if missing_ratios else 0.0
        mean_card = float(np.mean(card_ratios)) if card_ratios else 0.0
        max_card = float(np.max(card_ratios)) if card_ratios else 0.0
        mean_skew = float(np.mean(skewness_vals)) if skewness_vals else 0.0
        max_skew = float(np.max(skewness_vals)) if skewness_vals else 0.0
        mean_corr = float(np.mean(corr_vals)) if corr_vals else 0.0
        max_corr = float(np.max(corr_vals)) if corr_vals else 0.0

        struct_type = profile.get("structural_classification", "generic_tabular")

        vector = [
            round(log_row_count, 4),
            float(col_count),
            round(n_cont / col_count, 4),
            round(n_disc / col_count, 4),
            round(n_cat / col_count, 4),
            round(n_dt / col_count, 4),
            round(n_bool / col_count, 4),
            round(mean_missing, 4),
            round(max_missing, 4),
            round(mean_card, 4),
            round(max_card, 4),
            round(mean_skew, 4),
            round(max_skew, 4),
            round(mean_corr, 4),
            round(max_corr, 4),
            1.0 if n_dt > 0 else 0.0,
            1.0 if type_counts.get("high_cardinality_text", 0) > 0 else 0.0,
            1.0 if struct_type == "time_series" else 0.0,
            1.0 if struct_type == "business_tabular" else 0.0
        ]

        return vector
