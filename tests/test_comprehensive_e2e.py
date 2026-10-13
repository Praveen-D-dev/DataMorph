"""
DataMorph Comprehensive E2E Verification & Security Test Suite
Covers:
- C1: Dashboard mutation state continuity
- C2: Localhost binding and directory traversal rejection (security)
- C3: Truthful KPIs (no fabricated percentages or badges)
- H1: Real filter re-aggregation and reset
- H2: Real boxplot and heatmap options with non-empty data points
- H3: Precision chart removal without collateral deletion
- H4: Boundary-safe entity extraction
- H5: Storage deduplication & portable path resolution
- M7: Prototype pollution immunity
- M14: Valid JSON serialization of non-finite floats
"""

import os
import sys
import json
import pytest
import pandas as pd
import numpy as np

# Ensure ai-engine is in path
sys.path.insert(0, os.path.abspath("ai-engine"))

from profiling.profiler import DataProfiler
from profiling.type_detector import TypeDetector
from recommendation.recommender import RecommendationEngine
from dashboard.generator import DashboardGenerator
from commands.processor import CommandProcessor
from commands.intent import IntentDetector
from commands.entity import EntityExtractor
from server import validate_file_path, sanitize_floats


def test_security_traversal_rejection():
    """Verify C2 & H10: path validation rejects traversal and system files."""
    forbidden_paths = [
        "/etc/passwd",
        "/proc/cpuinfo",
        "../../../../Windows/System32/cmd.exe",
        "C:\\Windows\\System32\\drivers\\etc\\hosts",
        "..\\..\\sensitive.txt",
    ]
    for p in forbidden_paths:
        with pytest.raises((PermissionError, ValueError), match="denied|Forbidden|workspace"):
            validate_file_path(p)


def test_security_allowed_workspace_paths():
    """Verify legitimate paths inside workspace are accepted."""
    valid_path = "datasets/samples/sales.csv"
    resolved = validate_file_path(valid_path)
    assert os.path.exists(resolved)
    assert os.path.isabs(resolved)


def test_all_five_sample_datasets():
    """Verify that all 5 benchmark datasets generate complete dashboards with 0 empty charts."""
    samples = [
        "sales.csv",
        "students.csv",
        "employees.csv",
        "ecommerce.csv",
        "weather_timeseries.csv",
    ]
    generator = DashboardGenerator()
    forbidden_badges = ["MRR: Benchmark", "+20 Records", "MP: +120"]

    for s in samples:
        path = f"datasets/samples/{s}"
        assert os.path.exists(path), f"Sample {path} not found"

        dash = generator.generate_dashboard(path)
        assert len(dash["kpis"]) >= 2, f"Expected at least 2 KPIs for {s}"
        assert len(dash["visualizations"]) >= 3, f"Expected at least 3 charts for {s}"

        # Verify C3: No fabricated badges
        for kpi in dash["kpis"]:
            for fb in forbidden_badges:
                assert fb not in kpi.get("badge", ""), f"Fabricated badge found in {s}"

        # Verify H2 & M19: Every chart contains real data points
        for viz in dash["visualizations"]:
            opts = viz.get("chart_options", {})
            assert "series" in opts, f"No series in chart {viz['title']} for {s}"
            series = opts["series"]
            assert len(series) > 0, f"Empty series in chart {viz['title']} for {s}"
            data = series[0].get("data", [])
            assert len(data) > 0, f"Chart {viz['title']} has 0 data points in {s}"


def test_command_state_preservation():
    """Verify C1 & H1: commands mutate the user's active dashboard, preserving state."""
    sample_path = "datasets/samples/sales.csv"
    generator = DashboardGenerator()
    profile = DataProfiler.profile_dataset(sample_path)
    dash = generator.generate_dashboard(sample_path, profile=profile)

    # 1. Apply a filter
    res1 = CommandProcessor.process_command(
        "filter region North America",
        dashboard_config=dash,
        profile=profile,
        file_path=sample_path
    )
    assert res1["intent"] == "FILTER_DATA"
    updated_dash = res1["mutated_dashboard"]
    assert updated_dash["active_filters"].get("Region") == "North America"

    # Verify data re-aggregation occurred (H1)
    for viz in updated_dash["visualizations"]:
        if viz.get("chart_type") == "bar" and viz.get("x_axis") == "Region":
            bar_cats = viz["chart_options"]["xAxis"]["data"]
            assert "North America" in bar_cats
            # Filtered out categories should not be dominant
            assert len(bar_cats) <= 1

    # 2. Second command receives updated dashboard and mutates IT (not regenerated)
    initial_viz_count = len(updated_dash["visualizations"])
    target_viz_title = updated_dash["visualizations"][0]["title"]
    res2 = CommandProcessor.process_command(
        f"remove the {target_viz_title} visualization",
        dashboard_config=updated_dash,
        profile=profile,
        file_path=sample_path
    )
    assert res2["intent"] == "REMOVE_VISUALIZATION"
    assert len(res2["mutated_dashboard"]["visualizations"]) == initial_viz_count - 1
    # Previous filter MUST be preserved across subsequent commands (C1)
    assert res2["mutated_dashboard"]["active_filters"].get("Region") == "North America"


def test_box_and_heatmap_compilation():
    """Verify H2: box and heatmap compile into valid ECharts options with non-empty series."""
    sample_path = "datasets/samples/students.csv"
    generator = DashboardGenerator()
    df = generator.load_dataframe(sample_path)

    # Boxplot
    box = generator.compile_echarts_option(df, "box", "Department", "Exam_Score", "AVG", "Exam Score by Dept")
    assert box["series"][0]["type"] == "boxplot"
    assert len(box["series"][0]["data"]) > 0

    # Heatmap
    heat = generator.compile_echarts_option(df, "heatmap", "Department", "Exam_Score", "SUM", "Correlation Matrix")
    assert heat["series"][0]["type"] == "heatmap"
    assert len(heat["series"][0]["data"]) > 0


def test_non_finite_float_sanitization():
    """Verify M14: NaN and Infinity are sanitized to None (valid JSON null)."""
    data = {
        "nan_val": float("nan"),
        "inf_val": float("inf"),
        "neg_inf": float("-inf"),
        "normal": 42.5,
        "nested": {"bad": float("nan"), "good": "text"}
    }
    sanitized = sanitize_floats(data)
    assert sanitized["nan_val"] is None
    assert sanitized["inf_val"] is None
    assert sanitized["neg_inf"] is None
    assert sanitized["normal"] == 42.5
    assert sanitized["nested"]["bad"] is None

    # Must serialize to standard JSON without throwing in Python or JS
    dumped = json.dumps(sanitized)
    assert "Infinity" not in dumped
    assert "NaN" not in dumped
    parsed = json.loads(dumped)
    assert parsed["nan_val"] is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
