import re
from typing import Dict, Any, Tuple

INTENT_PATTERNS = [
    (r"\b(filter|show only|where|only for|subset)\b", "FILTER_DATA"),
    (r"\b(change|switch|turn|convert)\b.*\b(to|into)\b.*\b(line|bar|scatter|pie|donut|box|histogram|heatmap)\b", "CHANGE_CHART_TYPE"),
    (r"\b(add|create|new chart|plot|visualize)\b", "ADD_VISUALIZATION"),
    (r"\b(remove|delete|hide|drop)\b", "REMOVE_VISUALIZATION"),
    (r"\b(reset|clear|restore|default)\b", "RESET_DASHBOARD"),
    (r"\b(sort|order|rank|highest|lowest|top|bottom)\b", "SORT_DATA")
]


class IntentDetector:
    """
    Classifies natural language command intent using prioritized regex patterns
    with keyword fallback.
    """

    @classmethod
    def detect_intent(cls, command_text: str) -> str:
        text_clean = command_text.strip().lower()

        for pattern, intent in INTENT_PATTERNS:
            if re.search(pattern, text_clean):
                return intent

        # Fallback keyword checks
        if any(w in text_clean for w in ["line", "bar", "pie", "scatter", "histogram", "box"]):
            return "CHANGE_CHART_TYPE"
        elif any(w in text_clean for w in ["show", "revenue", "sales", "by", "against"]):
            return "ADD_VISUALIZATION"

        return "UNKNOWN"
