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
        profile: Dict[str, Any],
        file_path: Optional[str] = None
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
        resolved_file_path = file_path or profile.get("file_info", {}).get("file_path")
        action_summary = ""

        # 1. REMOVE_VISUALIZATION (Scored matching to remove ONLY the single best match, never over-delete)
        if intent == "REMOVE_VISUALIZATION":
            target_cols = entities.get("matched_columns", [])
            stop_words = {"remove", "the", "chart", "delete", "hide", "drop", "this", "by", "of", "and", "a", "an", "view", "plot"}
            words = [w for w in re.sub(r"[^a-zA-Z0-9]", " ", command_text.lower()).split() if w not in stop_words and len(w) > 1]

            best_viz = None
            best_score = 0

            for v in visualizations:
                score = 0
                title_lower = v.get("title", "").lower()
                x_col = str(v.get("x_axis", "")).lower()
                y_col = str(v.get("y_axis", "")).lower()

                # Match against explicitly identified column targets
                for tc in target_cols:
                    tc_lower = tc.lower()
                    if re.search(r"\b" + re.escape(tc_lower) + r"\b", title_lower):
                        score += 5
                    if tc_lower == x_col or tc_lower == y_col:
                        score += 4

                # Match whole words from command
                for w in words:
                    if re.search(r"\b" + re.escape(w) + r"\b", title_lower):
                        score += 3
                    if w == x_col or w == y_col:
                        score += 2

                if score > best_score:
                    best_score = score
                    best_viz = v

            if best_viz and best_score >= 3:
                visualizations = [v for v in visualizations if v.get("id") != best_viz.get("id")]
                mutated_config["visualizations"] = visualizations
                action_summary = f"Removed chart '{best_viz.get('title')}' from the active dashboard."
            elif visualizations and any(kw in command_text.lower() for kw in ["this", "last", "current"]):
                removed = visualizations.pop(0)
                mutated_config["visualizations"] = visualizations
                action_summary = f"Removed widget '{removed.get('title')}' from the dashboard."
            else:
                action_summary = f"Could not find a matching chart to remove for command: '{command_text}'."

        # 2. CHANGE_CHART_TYPE (e.g., "Replace this pie chart with a bar chart")
        elif intent == "CHANGE_CHART_TYPE":
            target_chart = entities.get("chart_type", "bar")
            if visualizations and resolved_file_path and os.path.exists(resolved_file_path):
                # Find matching target chart or take the first
                target_viz = visualizations[0]
                target_cols = entities.get("matched_columns", [])
                if target_cols:
                    for v in visualizations:
                        if any(c in v.get("x_axis", "") or c in v.get("y_axis", "") for c in target_cols):
                            target_viz = v
                            break

                generator = DashboardGenerator()
                df = generator.load_dataframe(resolved_file_path)
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

            if resolved_file_path and os.path.exists(resolved_file_path) and (measure or dimension):
                generator = DashboardGenerator()
                df = generator.load_dataframe(resolved_file_path)
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

        # 4. FILTER_DATA (Applies filter to DataFrame and recomputes charts and KPIs)
        elif intent == "FILTER_DATA":
            filter_col = entities.get("filter_column")
            filter_val = entities.get("filter_value")

            # Fallback regex extraction if entity extractor missed
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

                if resolved_file_path and os.path.exists(resolved_file_path):
                    generator = DashboardGenerator()
                    df = generator.load_dataframe(resolved_file_path)

                    # Apply active filters to DataFrame
                    filtered_df = df.copy()
                    for f_col, f_val in active_filters.items():
                        if f_col in filtered_df.columns:
                            filtered_df = filtered_df[filtered_df[f_col].astype(str).str.strip().str.lower() == str(f_val).strip().lower()]

                    # Recompute charts with filtered data
                    updated_visualizations = []
                    for v in visualizations:
                        c_type = v.get("chart_type", "bar")
                        x_col = v.get("x_axis")
                        y_col = v.get("y_axis")
                        agg = v.get("aggregation", "SUM")
                        title = v.get("title", f"{y_col} by {x_col}")
                        new_opts = generator.compile_echarts_option(filtered_df, c_type, x_col, y_col, agg, title)
                        v["chart_options"] = new_opts
                        updated_visualizations.append(v)

                    mutated_config["visualizations"] = updated_visualizations

                    # Recompute KPIs with filtered data
                    mutated_config["kpis"] = generator._generate_adaptive_kpis(filtered_df, profile)

                    action_summary = f"Applied filter: {filter_col} = '{filter_val}' ({len(filtered_df):,} matching rows)."
                else:
                    action_summary = f"Applied filter: {filter_col} = '{filter_val}'."
            else:
                action_summary = f"Filter criteria could not be resolved from '{command_text}'."

        # 5. SORT_DATA (Re-orders charts by score ascending or descending)
        elif intent == "SORT_DATA":
            direction = entities.get("sort_direction", "desc")
            if visualizations:
                visualizations.sort(key=lambda v: float(v.get("score", 0.0)), reverse=(direction == "desc"))
                for idx, v in enumerate(visualizations):
                    v["display_order"] = idx
                mutated_config["visualizations"] = visualizations
                action_summary = f"Re-ordered visualizations by recommendation priority in {direction}ending order."
            else:
                action_summary = "No visualizations available to re-order."

        # 6. RESET_DASHBOARD (Clears filters and restores baseline charts & KPIs from full dataset)
        elif intent == "RESET_DASHBOARD":
            mutated_config["active_filters"] = {}
            if resolved_file_path and os.path.exists(resolved_file_path):
                generator = DashboardGenerator()
                baseline_dash = generator.generate_dashboard(resolved_file_path)
                mutated_config["visualizations"] = baseline_dash["visualizations"]
                mutated_config["kpis"] = baseline_dash["kpis"]
                mutated_config["layout_grid"] = baseline_dash["layout_grid"]
                action_summary = "Reset all active filters and restored baseline charts and KPI metrics."
            else:
                action_summary = "Cleared all active filters."

        else:
            action_summary = f"Command not recognized ('{command_text}'). You can try: 'filter by [column] [value]', 'change chart to line', 'remove [chart name]', or 'reset dashboard'."

        return {
            "intent": intent,
            "entities": entities,
            "action_summary": action_summary,
            "mutated_dashboard": mutated_config,
            "updated_dashboard": mutated_config
        }

