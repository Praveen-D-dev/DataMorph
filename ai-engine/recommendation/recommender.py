from typing import Dict, Any, List
from recommendation.rules import RuleCandidateGenerator
from recommendation.scoring import CandidateScorer
from recommendation.ml_model import MLRecommendationModel
from feature_engineering.feature_extractor import FeatureExtractor


class RecommendationEngine:
    """
    Hybrid recommendation orchestrator combining Grammar of Graphics candidate generation,
    heuristic multi-criteria scoring, Scikit-learn ML suitability, and explainability reasoning.
    """

    def __init__(self):
        self.ml_ranker = MLRecommendationModel()

    def recommend(self, profile: Dict[str, Any], top_k: int = 10) -> List[Dict[str, Any]]:
        # 1. Feature extraction
        feature_vector = FeatureExtractor.extract_vector(profile)

        # 2. Predict ML chart preferences
        ml_probs = self.ml_ranker.predict_chart_probabilities(feature_vector)

        # 3. Rule-based candidate generation
        candidates = RuleCandidateGenerator.generate_candidates(profile)

        scored_candidates = []
        for cand in candidates:
            chart_type = cand["chart_type"]
            rule_score = CandidateScorer.score_candidate(cand, profile)
            ml_boost = ml_probs.get(chart_type, 0.10)

            # Hybrid score synthesis
            final_score = round(0.65 * rule_score + 0.35 * (ml_boost * 1.5), 4)
            final_score = min(0.99, max(0.10, final_score))

            # Explainability rationale
            explanation = self._build_explanation(cand, profile, final_score)

            scored_candidates.append({
                "chart_type": chart_type,
                "title": cand["title"],
                "x_axis": cand["x_axis"],
                "y_axis": cand["y_axis"],
                "aggregation": cand["aggregation"],
                "score": final_score,
                "reason": explanation
            })

        # 4. Sort by score descending
        scored_candidates.sort(key=lambda x: x["score"], reverse=True)

        # 5. Apply diversity filter
        diversified = self._apply_diversity_filter(scored_candidates, top_k)
        return diversified

    def _build_explanation(self, candidate: Dict[str, Any], profile: Dict[str, Any], score: float) -> str:
        chart_type = candidate["chart_type"]
        x = candidate["x_axis"]
        y = candidate["y_axis"]
        types = profile.get("column_types", {})
        col_stats = profile.get("column_statistics", {})
        corr_matrix = profile.get("correlation_matrix", {})

        x_type = types.get(x, "unknown")
        y_type = types.get(y, "unknown")

        if chart_type == "line":
            return f"'{x}' is a temporal dimension ({x_type}) and '{y}' is numerical ({y_type}). Line charts highlight trends, fluctuations, and progression over time."
        elif chart_type == "bar":
            u_count = col_stats.get(x, {}).get("unique_count", "discrete")
            return f"'{x}' is categorical with {u_count} categories, paired with numerical '{y}'. A bar chart enables immediate comparison of aggregated values across distinct groups."
        elif chart_type == "pie":
            u_count = col_stats.get(x, {}).get("unique_count", 5)
            return f"'{x}' has {u_count} low-cardinality categories. A donut/pie chart clearly visualizes proportional distribution of '{y}' without visual clutter."
        elif chart_type == "scatter":
            r_val = corr_matrix.get(x, {}).get(y, 0.0)
            return f"Both '{x}' and '{y}' are numerical (correlation r={r_val:.2f}). A scatter plot reveals bivariate correlation, clusters, and potential non-linear relationships."
        elif chart_type == "box":
            outliers = col_stats.get(y, {}).get("outlier_count", 0)
            return f"'{y}' has {outliers} outlier points. A box plot visualizes median, quartiles, and dispersion boundaries."
        elif chart_type == "histogram":
            return f"'{x}' is numerical. A histogram bins values to reveal skewness, multi-modality, and underlying probability density."
        elif chart_type == "heatmap":
            return f"Evaluates pairwise correlations across multiple numerical features simultaneously to identify collinearity clusters."
        
        return f"Selected based on schema compatibility between {x} ({x_type}) and {y} ({y_type}) with suitability score {score:.2f}."

    def _apply_diversity_filter(self, candidates: List[Dict[str, Any]], top_k: int) -> List[Dict[str, Any]]:
        counts_by_type: Dict[str, int] = {}
        result = []

        # Pass 1: Select top candidates with a cap per chart type (max 2 of any single type)
        for c in candidates:
            ctype = c["chart_type"]
            current_count = counts_by_type.get(ctype, 0)
            if current_count < 2:
                result.append(c)
                counts_by_type[ctype] = current_count + 1
                if len(result) >= top_k:
                    break

        # Pass 2: If we haven't reached top_k, fill with remaining highest scoring candidates
        if len(result) < top_k:
            for c in candidates:
                if c not in result:
                    result.append(c)
                    if len(result) >= top_k:
                        break

        return result
