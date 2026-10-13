import re
from typing import Dict, Any, List, Optional


class EntityExtractor:
    """
    Extracts chart types, target columns, filter thresholds, and categorical values
    from command text using token matching and string similarity.
    """

    SUPPORTED_CHARTS = ["bar", "line", "area", "pie", "scatter", "box", "histogram", "heatmap"]

    @classmethod
    def extract_entities(
        cls,
        command_text: str,
        columns: List[str],
        top_values: Optional[Dict[str, List[str]]] = None,
        column_types: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        text_lower = command_text.strip().lower()
        entities: Dict[str, Any] = {}

        # 1. Target chart type (word-boundary matched)
        for chart in cls.SUPPORTED_CHARTS:
            if re.search(r"\b" + re.escape(chart) + r"\b", text_lower) or (
                chart == "pie" and re.search(r"\b(donut|doughnut)\b", text_lower)
            ) or (
                chart == "box" and re.search(r"\b(box\s*plot|boxplot)\b", text_lower)
            ):
                entities["chart_type"] = chart
                break

        # 2. Match column names (longest match first with word boundaries)
        matched_cols = []
        sorted_cols = sorted(columns, key=lambda c: len(c), reverse=True)
        for col in sorted_cols:
            col_clean = col.lower().replace("_", " ")
            if re.search(r"\b" + re.escape(col_clean) + r"\b", text_lower):
                matched_cols.append(col)

        if matched_cols:
            entities["matched_columns"] = matched_cols
            
            # Use column types if provided to accurately assign measure vs dimension
            if column_types:
                numerics = [c for c in matched_cols if column_types.get(c, "").startswith("numeric")]
                categoricals = [c for c in matched_cols if c not in numerics]
                if numerics:
                    entities["measure"] = numerics[0]
                if categoricals:
                    entities["dimension"] = categoricals[0]

            if "dimension" not in entities and len(matched_cols) >= 1:
                entities["dimension"] = matched_cols[0]
            if "measure" not in entities and len(matched_cols) >= 2:
                entities["measure"] = matched_cols[1]

        # 3. Categorical values for filtering (longest match first, boundary-enforced)
        if top_values:
            candidates = []
            for col, vals in top_values.items():
                for val in vals:
                    if val is not None:
                        val_str = str(val).strip().lower()
                        if val_str:
                            candidates.append((col, str(val), val_str))

            # Prioritize longer candidate strings first
            candidates.sort(key=lambda item: len(item[2]), reverse=True)

            for col, original_val, val_str in candidates:
                if len(val_str) < 2:
                    # Single-character values (like grades 'A', 'B') must be quoted or explicitly preceded by context
                    is_quoted = re.search(r"['\"]" + re.escape(val_str) + r"['\"]", text_lower)
                    is_contextual = re.search(r"\b(?:" + re.escape(col.lower().replace("_", " ")) + r"|is|=|to|grade)\s+" + re.escape(val_str) + r"\b", text_lower)
                    if is_quoted or is_contextual:
                        entities["filter_column"] = col
                        entities["filter_value"] = original_val
                        break
                else:
                    if re.search(r"\b" + re.escape(val_str) + r"\b", text_lower):
                        entities["filter_column"] = col
                        entities["filter_value"] = original_val
                        break

        # 4. Sorting direction
        if re.search(r"\b(highest|descending|desc|top|greatest|max)\b", text_lower):
            entities["sort_direction"] = "desc"
        elif re.search(r"\b(lowest|ascending|asc|bottom|least|min)\b", text_lower):
            entities["sort_direction"] = "asc"

        return entities

