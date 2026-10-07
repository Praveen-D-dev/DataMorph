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


def test_entity_extraction():
    cols = ["Region", "Sales_Units", "Revenue", "Date"]
    top_vals = {"Region": ["North America", "Europe", "Asia Pacific"]}
    
    entities = EntityExtractor.extract_entities(
        "filter data where region is Europe",
        columns=cols,
        top_values=top_vals
    )
    assert entities.get("filter_column") == "Region"
    assert entities.get("filter_value") == "Europe"


def test_command_processor_mutation():
    sample_path = "datasets/samples/sales.csv"
    profile = DataProfiler.profile_dataset(sample_path)
    generator = DashboardGenerator()
    dash = generator.generate_dashboard(sample_path, profile=profile)

    # Convert chart to line
    result = CommandProcessor.process_command(
        "change chart to line chart",
        dashboard_config=dash,
        profile=profile
    )
    assert result["intent"] == "CHANGE_CHART_TYPE"
    assert result["mutated_dashboard"]["visualizations"][0]["chart_type"] == "line"

    # Filter data
    result2 = CommandProcessor.process_command(
        "filter region to Asia Pacific",
        dashboard_config=dash,
        profile=profile
    )
    assert result2["intent"] == "FILTER_DATA"
    assert result2["mutated_dashboard"]["active_filters"]["Region"] == "Asia Pacific"
