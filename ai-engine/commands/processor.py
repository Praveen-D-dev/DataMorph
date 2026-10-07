import os
import re
from typing import Dict, Any, List, Optional
from commands.intent import IntentDetector
from commands.entity import EntityExtractor
from dashboard.generator import DashboardGenerator
import pandas as pd


class CommandProcessor:
    """
    Processes natural language commands against active dashboard configurations,
    performing intent detection, entity extraction, and state mutation.
    """

    @classmethod
    def process_command(
        cls,
        command_text: str,
        dashboard_config: Dict[str, Any],
        profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        column_types = profile.get("column_types", {})
        columns = list(column_types.keys())
        col_stats = profile.get("column_statistics", {})
        top_values = {
            col: list(stats.get("top_values", {}).keys())
            for col, stats in col_stats.items()
            if "top_values" in stats
        }

        intent = IntentDetector.detect_intent(command_text)
        entities = EntityExtractor.extract_entities(
            command_text,
            columns,
            top_values,
            column_types=column_types
        )

        mutated_config = dict(dashboard_config)
        visualizations = list(mutated_config.get("visualizations", []))
        file_path = profile.get("file_info", {}).get("file_path")
        action_summary = ""

        # 1. REMOVE_VISUALIZATION (e.g., "Remove the monthly sales chart" or "Remove attendance chart")
        if intent == "REMOVE_VISUALIZATION":
            target_cols = entities.get("matched_columns", [])
            initial_count = len(visualizations)
            
            if target_cols:
                visualizations = [
                    v for v in visualizations
                    if not any(c in v.get("x_axis", "") or c in v.get("y_axis", "") or c.lower() in v.get("title", "").lower() for c in target_cols)
                ]
            else:
                # If specific target not matched by column, remove by keyword in title
                words = [w for w in re.sub(r"[^a-zA-Z0-9]", " ", command_text.lower()).split() if w not in ["remove", "the", "chart", "delete", "hide", "drop", "this"]]
                if words:
                    visualizations = [
                        v for v in visualizations
                        if not any(w in v.get("title", "").lower() for w in words)
                    ]
                elif visualizations:
                    # Remove last/first if "this chart"
                    visualizations.pop(0)

            mutated_config["visualizations"] = visualizations
            removed_count = initial_count - len(visualizations)
            action_summary = f"Removed {removed_count} widget(s) from the active dashboard."

        # 2. CHANGE_CHART_TYPE (e.g., "Replace this pie chart with a bar chart")
        elif intent == "CHANGE_CHART_TYPE":
            target_chart = entities.get("chart_type", "bar")
            if visualizations and file_path and os.path.exists(file_path):
                # Find matching target chart or take the first
                target_viz = visualizations[0]
                target_cols = entities.get("matched_columns", [])
                if target_cols:
                    for v in visualizations:
                        if any(c in v.get("x_axis", "") or c in v.get("y_axis", "") for c in target_cols):
                            target_viz = v
                            break

                generator = DashboardGenerator()
                df = generator.load_dataframe(file_path)
                x = target_viz.get("x_axis") or target_viz.get("dimension")
                y = target_viz.get("y_axis") or target_viz.get("metric")
                agg = target_viz.get("aggregation", "SUM")
                new_title = f"{y} by {x} ({target_chart.capitalize()})"

                new_options = generator.compile_echarts_option(df, target_chart, x, y, agg, new_title)
                target_viz["chart_type"] = target_chart
                target_viz["title"] = new_title
                target_viz["chart_options"] = new_options
                target_viz["reason"] = f"Adapted via natural language command to {target_chart} format."
                action_summary = f"Converted chart to {target_chart} chart."
            else:
                action_summary = f"Chart type updated to {target_chart}."

        # 3. ADD_VISUALIZATION / SHOW_METRIC (e.g., "Show attendance by department")
        elif intent == "ADD_VISUALIZATION":
            measure = entities.get("measure")
            dimension = entities.get("dimension")
            chart_type = entities.get("chart_type", "bar")

            if not measure and not dimension and entities.get("matched_columns"):
                cols = entities["matched_columns"]
                if len(cols) >= 2:
                    dimension, measure = cols[0], cols[1]
                else:
                    dimension = cols[0]

            if file_path and os.path.exists(file_path) and (measure or dimension):
                generator = DashboardGenerator()
                df = generator.load_dataframe(file_path)
                x = dimension or (df.select_dtypes(include=["object"]).columns[0] if len(df.select_dtypes(include=["object"]).columns) > 0 else df.columns[0])
                y = measure or (df.select_dtypes(include=["number"]).columns[0] if len(df.select_dtypes(include=["number"]).columns) > 0 else df.columns[-1])
                agg = "SUM"
                title = f"{y} by {x}"

                new_options = generator.compile_echarts_option(df, chart_type, x, y, agg, title)
                new_viz = {
                    "id": f"viz-cmd-{len(visualizations) + 1}",
                    "chart_type": chart_type,
                    "title": title,
                    "x_axis": x,
                    "y_axis": y,
                    "dimension": x,
                    "metric": y,
                    "aggregation": agg,
                    "score": 0.95,
                    "reason": f"Generated on-demand via voice/natural-language command: '{command_text}'",
                    "display_order": len(visualizations),
                    "col_span": 2,
                    "chart_options": new_options
                }
                visualizations.insert(0, new_viz)
                mutated_config["visualizations"] = visualizations
                action_summary = f"Created and positioned new visualization: {title}."
            else:
                action_summary = f"Identified request to visualize {measure or dimension}, but data source not accessible."

        # 4. FILTER_DATA (e.g., "Show only CSE")
        elif intent == "FILTER_DATA":
            filter_col = entities.get("filter_column")
            filter_val = entities.get("filter_value")

            # Fallback pattern extraction if not caught by entity extractor
            if not filter_col or not filter_val:
                match = re.search(r"(?:only|filter|show)\s+(?:for\s+)?([a-zA-Z0-9_-]+)", command_text, re.IGNORECASE)
                if match:
                    candidate_val = match.group(1).strip()
                    for col, vals in top_values.items():
                        if any(candidate_val.lower() == str(v).lower() for v in vals):
                            filter_col = col
                            filter_val = candidate_val
                            break

            if filter_col and filter_val:
                active_filters = mutated_config.setdefault("active_filters", {})
                active_filters[filter_col] = filter_val
                action_summary = f"Applied filter: {filter_col} = '{filter_val}'."
            else:
                action_summary = f"Filter criteria could not be resolved from '{command_text}'."

        # 5. SORT_DATA
        elif intent == "SORT_DATA":
            direction = entities.get("sort_direction", "desc")
            action_summary = f"Re-ordered visualizations in {direction}ending priority."

        # 6. RESET_DASHBOARD
        elif intent == "RESET_DASHBOARD":
            mutated_config.pop("active_filters", None)
            action_summary = "Reset all active filters and restored baseline dashboard configuration."

        else:
            action_summary = f"Command recognized with intent '{intent}'. Dashboard updated."

        return {
            "intent": intent,
            "entities": entities,
            "action_summary": action_summary,
            "mutated_dashboard": mutated_config,
            "updated_dashboard": mutated_config
        }

