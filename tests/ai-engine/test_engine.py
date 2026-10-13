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
    # Check ECharts option structure and non-empty data points (H2, M19)
    for viz in dash["visualizations"]:
        assert "chart_options" in viz
        assert "series" in viz["chart_options"]
        series = viz["chart_options"]["series"]
        assert len(series) > 0
        assert len(series[0].get("data", [])) > 0, f"Visualization {viz['title']} has empty series data"


def test_compile_box_and_heatmap():
    sample_path = "datasets/samples/students.csv"
    generator = DashboardGenerator()
    df = generator.load_dataframe(sample_path)
    
    # Box plot (H2)
    box_opt = generator.compile_echarts_option(df, "box", "Department", "Exam_Score", "AVG", "Exam Score Distribution")
    assert "series" in box_opt
    assert box_opt["series"][0]["type"] == "boxplot"
    assert len(box_opt["series"][0]["data"]) > 0

    # Heatmap (H2)
    heat_opt = generator.compile_echarts_option(df, "heatmap", "Department", "Exam_Score", "SUM", "Feature Correlations")
    assert "series" in heat_opt
    assert heat_opt["series"][0]["type"] == "heatmap"
    assert len(heat_opt["series"][0]["data"]) > 0


def test_compile_edge_cases():
    sample_path = "datasets/samples/students.csv"
    generator = DashboardGenerator()
    df = generator.load_dataframe(sample_path)

    # Bar from histogram (y is None or same as x) -> should not raise KeyError
    bar_opt = generator.compile_echarts_option(df, "bar", "Department", None, "COUNT", "Student Count by Dept")
    assert "series" in bar_opt
    assert len(bar_opt["series"][0]["data"]) > 0

    # Scatter with categorical x -> should not raise ValueError
    scatter_opt = generator.compile_echarts_option(df, "scatter", "Department", "Exam_Score", "RAW", "Dept vs Score")
    assert "series" in scatter_opt
    assert len(scatter_opt["series"][0]["data"]) > 0


def test_kpi_no_fabricated_numbers():
    sample_path = "datasets/samples/students.csv"
    generator = DashboardGenerator()
    dash = generator.generate_dashboard(sample_path)

    # C3: No hardcoded fabricated badges
    forbidden_badges = ["MRR: Benchmark", "+20 Records", "MP: +120"]
    for kpi in dash["kpis"]:
        badge = kpi.get("badge", "")
        for fb in forbidden_badges:
            assert fb not in badge, f"Fabricated badge '{fb}' found in KPI: {kpi}"

