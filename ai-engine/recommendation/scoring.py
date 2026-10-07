from typing import Dict, Any


class CandidateScorer:
    """
    Computes multi-criteria suitability scores for chart candidates based on:
    Score = DataTypeCompatibility + CardinalitySuitability + RelationshipStrength
          + TemporalSuitability + DistributionSuitability - MissingnessPenalty
    """

    @classmethod
    def score_candidate(cls, candidate: Dict[str, Any], profile: Dict[str, Any]) -> float:
        chart_type = candidate.get("chart_type")
        x_axis = candidate.get("x_axis")
        y_axis = candidate.get("y_axis")
        col_stats = profile.get("column_statistics", {})
        types = profile.get("column_types", {})
        corr_matrix = profile.get("correlation_matrix", {})

        score = 0.50  # Base score for matching rules

        # Missingness penalty
        x_null_ratio = col_stats.get(x_axis, {}).get("null_ratio", 0.0)
        y_null_ratio = col_stats.get(y_axis, {}).get("null_ratio", 0.0)
        penalty = (x_null_ratio + y_null_ratio) * 0.25
        score -= penalty

        # Specific chart-type scoring logic
        if chart_type == "line":
            if types.get(x_axis) == "datetime":
                score += 0.35
            # Bonus if high variance or trend
            y_std = col_stats.get(y_axis, {}).get("std", 0.0)
            if y_std > 0:
                score += 0.10

        elif chart_type == "bar":
            u_count = col_stats.get(x_axis, {}).get("unique_count", 0)
            if 3 <= u_count <= 10:
                score += 0.35  # Ideal category count
            elif 11 <= u_count <= 20:
                score += 0.25
            else:
                score += 0.10

        elif chart_type == "pie":
            u_count = col_stats.get(x_axis, {}).get("unique_count", 0)
            if 3 <= u_count <= 5:
                score += 0.30
            elif 6 <= u_count <= 7:
                score += 0.15
            else:
                score -= 0.30  # Pie with > 7 slices is strongly discouraged

        elif chart_type == "scatter":
            r_val = abs(corr_matrix.get(x_axis, {}).get(y_axis, 0.0))
            if r_val >= 0.6:
                score += 0.40
            elif r_val >= 0.3:
                score += 0.25
            else:
                score += 0.10

        elif chart_type == "box":
            outliers = col_stats.get(y_axis, {}).get("outlier_count", 0)
            skew = abs(col_stats.get(y_axis, {}).get("skewness", 0.0))
            if outliers > 5:
                score += 0.35
            elif outliers > 0 or skew > 1.0:
                score += 0.25
            else:
                score += 0.10

        elif chart_type == "histogram":
            skew = abs(col_stats.get(x_axis, {}).get("skewness", 0.0))
            score += 0.20 + min(0.15, skew * 0.1)

        elif chart_type == "heatmap":
            n_num = len([c for c, t in types.items() if t in ("numeric_continuous", "numeric_discrete")])
            if n_num >= 4:
                score += 0.40
            else:
                score += 0.20

        # Normalization to [0.05, 0.99]
        return round(max(0.05, min(0.99, score)), 4)
