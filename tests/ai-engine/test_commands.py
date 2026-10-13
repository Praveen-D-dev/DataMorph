import os
from commands.intent import IntentDetector
from commands.entity import EntityExtractor
from commands.processor import CommandProcessor
from profiling.profiler import DataProfiler
from dashboard.generator import DashboardGenerator


def test_intent_detection():
    assert IntentDetector.detect_intent("filter by region North America") == "FILTER_DATA"
    assert IntentDetector.detect_intent("change primary chart to line chart") == "CHANGE_CHART_TYPE"
    assert IntentDetector.detect_intent("convert this to scatter plot") == "CHANGE_CHART_TYPE"
    assert IntentDetector.detect_intent("reset the dashboard view") == "RESET_DASHBOARD"


def test_entity_extraction_boundaries():
    cols = ["Grade", "Gender", "Department", "Age", "Exam_Score"]
    top_vals = {
        "Grade": ["A", "B", "C"],
        "Gender": ["Female", "Male"],
        "Department": ["CSE", "ECE", "MECH"]
    }

    # Test H4: Single-character Grade='A' must not match "filter only female"
    e1 = EntityExtractor.extract_entities(
        "filter only female",
        columns=cols,
        top_values=top_vals
    )
    assert e1.get("filter_column") == "Gender"
    assert e1.get("filter_value") == "Female"
    assert e1.get("filter_value") != "A"

    # Test H4: Single-character Grade='C' must not match "show only CSE"
    e2 = EntityExtractor.extract_entities(
        "show only CSE",
        columns=cols,
        top_values=top_vals
    )
    assert e2.get("filter_column") == "Department"
    assert e2.get("filter_value") == "CSE"
    assert e2.get("filter_value") != "C"


def test_command_processor_removal():
    sample_path = "datasets/samples/sales.csv"
    profile = DataProfiler.profile_dataset(sample_path)
    generator = DashboardGenerator()
    dash = generator.generate_dashboard(sample_path, profile=profile)
    initial_count = len(dash["visualizations"])
    first_title = dash["visualizations"][0]["title"]

    # Test H3: Remove only the target chart, not multiple charts
    result = CommandProcessor.process_command(
        f"remove the {first_title} chart",
        dashboard_config=dash,
        profile=profile,
        file_path=sample_path
    )
    assert result["intent"] == "REMOVE_VISUALIZATION"
    assert len(result["mutated_dashboard"]["visualizations"]) == initial_count - 1


def test_box_and_heatmap_chart_compilation():
    sample_path = "datasets/samples/sales.csv"
    profile = DataProfiler.profile_dataset(sample_path)
    generator = DashboardGenerator()
    df = generator.load_dataframe(sample_path)

    # Test H2: Boxplot compiles with genuine non-empty data points
    box_opts = generator.compile_echarts_option(df, "box", "Region", "Sales_Units", "NONE", "Box Test")
    assert "series" in box_opts
    assert len(box_opts["series"]) > 0
    assert len(box_opts["series"][0]["data"]) > 0
    assert len(box_opts["series"][0]["data"][0]) == 5  # [min, Q1, median, Q3, max]

    # Test H2: Heatmap compiles with non-empty correlation matrix
    heat_opts = generator.compile_echarts_option(df, "heatmap", "Features", "Features", "CORRELATION", "Heatmap Test")
    assert "series" in heat_opts
    assert len(heat_opts["series"]) > 0
    assert len(heat_opts["series"][0]["data"]) > 0


def test_filter_mutation_recalculates_data():
    sample_path = "datasets/samples/sales.csv"
    profile = DataProfiler.profile_dataset(sample_path)
    generator = DashboardGenerator()
    dash = generator.generate_dashboard(sample_path, profile=profile)

    # Test H1: Filter command actually applies filter and updates active_filters
    result = CommandProcessor.process_command(
        "filter region to North America",
        dashboard_config=dash,
        profile=profile,
        file_path=sample_path
    )
    assert result["intent"] == "FILTER_DATA"
    assert result["mutated_dashboard"]["active_filters"]["Region"] == "North America"
    assert "Applied filter: Region" in result["action_summary"]

