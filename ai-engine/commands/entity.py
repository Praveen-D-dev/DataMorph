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

        # 1. Target chart type
        for chart in cls.SUPPORTED_CHARTS:
            if chart in text_lower or (chart == "pie" and "donut" in text_lower):
                entities["chart_type"] = chart
                break

        # 2. Match column names
        matched_cols = []
        for col in columns:
            col_clean = col.lower().replace("_", " ")
            if col_clean in text_lower:
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

        # 3. Categorical values for filtering
        if top_values:
            for col, vals in top_values.items():
                for val in vals:
                    val_str = str(val).lower()
                    if val_str and val_str in text_lower:
                        entities["filter_column"] = col
                        entities["filter_value"] = str(val)
                        break
                if "filter_column" in entities:
                    break

        # 4. Sorting direction
        if any(w in text_lower for w in ["highest", "descending", "desc", "top", "greatest"]):
            entities["sort_direction"] = "desc"
        elif any(w in text_lower for w in ["lowest", "ascending", "asc", "bottom", "least"]):
            entities["sort_direction"] = "asc"

        return entities

