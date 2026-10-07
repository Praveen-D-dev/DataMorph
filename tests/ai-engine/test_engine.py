import os
import pytest
import pandas as pd
from profiling.type_detector import TypeDetector
from profiling.statistics import StatisticsEngine
from profiling.profiler import DataProfiler
from recommendation.recommender import RecommendationEngine
from dashboard.generator import DashboardGenerator


def test_type_detector():
    df = pd.DataFrame({
        "dates": ["2024-01-01", "2024-01-02", "2024-01-03"],
        "bools": ["yes", "no", "yes"],
        "floats": [1.2, 3.4, 5.6],
        "categories": ["Dept A", "Dept B", "Dept A"]
    })
    types = TypeDetector.detect_all(df)
    assert types["dates"] == "datetime"
    assert types["bools"] == "boolean"
    assert types["floats"] == "numeric_continuous"
    assert types["categories"] == "categorical_nominal"


def test_profiler_sales():
    sample_path = "datasets/samples/sales.csv"
    assert os.path.exists(sample_path)
    profile = DataProfiler.profile_dataset(sample_path)
    assert profile["file_info"]["row_count"] == 500
    assert profile["file_info"]["column_count"] == 8
    assert "Revenue" in profile["column_types"]
    assert "Region" in profile["column_types"]


def test_recommender_sales():
    sample_path = "datasets/samples/sales.csv"
    profile = DataProfiler.profile_dataset(sample_path)
    recommender = RecommendationEngine()
    recs = recommender.recommend(profile, top_k=5)
    assert len(recs) > 0
    # Every recommendation must have score, reason, chart_type
    for r in recs:
        assert 0.0 < r["score"] <= 1.0
        assert len(r["reason"]) > 10
        assert r["chart_type"] in ["line", "bar", "pie", "scatter", "box", "histogram", "heatmap"]


def test_dashboard_generator():
    sample_path = "datasets/samples/students.csv"
    generator = DashboardGenerator()
    dash = generator.generate_dashboard(sample_path)
    assert len(dash["kpis"]) >= 2
    assert len(dash["visualizations"]) >= 3
    assert len(dash["layout_grid"]) == len(dash["visualizations"])
    # Check ECharts option structure
    for viz in dash["visualizations"]:
        assert "chart_options" in viz
        assert "series" in viz["chart_options"]
