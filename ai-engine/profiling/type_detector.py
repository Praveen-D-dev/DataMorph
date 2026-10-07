import re
import pandas as pd
import numpy as np
from typing import Dict, Any

DATE_REGEX = re.compile(
    r"^(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4})"
    r"(\s+|T)?(\d{1,2}:\d{2}(:\d{2})?(\.\d+)?)?(\s*(AM|PM|am|pm))?$"
)

BOOLEAN_TOKENS = {"true", "false", "yes", "no", "1", "0", "y", "n", "t", "f"}


class TypeDetector:
    """
    Staged semantic data-type detector for tabular datasets.
    Categorizes columns into:
    - datetime
    - boolean
    - numeric_continuous
    - numeric_discrete
    - categorical_nominal
    - high_cardinality_text
    """

    @staticmethod
    def detect_column_type(series: pd.Series) -> str:
        non_null_series = series.dropna()
        n_total = len(non_null_series)
        if n_total == 0:
            return "high_cardinality_text"

        n_unique = non_null_series.nunique()
        unique_ratio = n_unique / n_total

        # 1. Native Datetime check
        if pd.api.types.is_datetime64_any_dtype(series):
            return "datetime"

        # 2. Native Boolean check
        if pd.api.types.is_bool_dtype(series):
            return "boolean"

        # 3. String-based Boolean check
        if n_unique <= 2:
            sample_str = set(non_null_series.astype(str).str.strip().str.lower().unique())
            if sample_str.issubset(BOOLEAN_TOKENS):
                return "boolean"

        # 4. String-based Datetime check
        if pd.api.types.is_string_dtype(series) or pd.api.types.is_object_dtype(series):
            sample = non_null_series.astype(str).head(50)
            date_matches = sum(1 for v in sample if DATE_REGEX.match(v.strip()))
            if date_matches / len(sample) >= 0.8:
                try:
                    pd.to_datetime(non_null_series.head(100), errors="raise")
                    return "datetime"
                except Exception:
                    pass

        # 5. Numeric detection
        if pd.api.types.is_numeric_dtype(series):
            # Check if float
            if pd.api.types.is_float_dtype(series):
                # If all floats are whole numbers and low cardinality, could be discrete
                return "numeric_continuous"
            
            # Integer
            if n_unique <= 20 and unique_ratio < 0.05:
                return "numeric_discrete"
            return "numeric_continuous"

        # 6. Categorical vs High-Cardinality Text
        if n_unique <= 30 or unique_ratio < 0.15:
            return "categorical_nominal"

        return "high_cardinality_text"

    @classmethod
    def detect_all(cls, df: pd.DataFrame) -> Dict[str, str]:
        return {col: cls.detect_column_type(df[col]) for col in df.columns}
