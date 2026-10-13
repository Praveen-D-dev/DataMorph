import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple


class DataCleaner:
    """
    Handles memory optimization (downcasting), missing value handling,
    and temporal parsing.
    """

    @staticmethod
    def downcast_dataframe(df: pd.DataFrame, types: Dict[str, str]) -> pd.DataFrame:
        df_opt = df.copy()
        for col, col_type in types.items():
            if col_type in ("numeric_continuous", "numeric_discrete"):
                s = pd.to_numeric(df_opt[col], errors="coerce")
                non_null = s.dropna()
                if col_type == "numeric_discrete" and len(non_null) > 0 and np.all(np.equal(np.mod(non_null.values, 1), 0)):
                    s_min, s_max = non_null.min(), non_null.max()
                    if s_min >= -32768 and s_max <= 32767:
                        df_opt[col] = s.astype("Int16")
                    elif s_min >= -2147483648 and s_max <= 2147483647:
                        df_opt[col] = s.astype("Int32")
                    else:
                        df_opt[col] = s.astype("Int64")
                else:
                    df_opt[col] = s.astype(np.float32)

            elif col_type == "categorical_nominal":
                df_opt[col] = df_opt[col].astype("category")

            elif col_type == "datetime":
                df_opt[col] = pd.to_datetime(df_opt[col], errors="coerce")

            elif col_type == "boolean":
                df_opt[col] = df_opt[col].astype(str).str.strip().str.lower().isin(["true", "1", "yes", "y", "t"])

        return df_opt

    @staticmethod
    def impute_missing(df: pd.DataFrame, types: Dict[str, str]) -> pd.DataFrame:
        df_clean = df.copy()
        for col, col_type in types.items():
            if df_clean[col].isnull().sum() == 0:
                continue

            if col_type in ("numeric_continuous", "numeric_discrete"):
                median_val = df_clean[col].median()
                df_clean[col] = df_clean[col].fillna(median_val)
            elif col_type == "categorical_nominal":
                mode_val = df_clean[col].mode()
                fill_val = mode_val.iloc[0] if not mode_val.empty else "Unknown"
                if hasattr(df_clean[col], "cat"):
                    if fill_val not in df_clean[col].cat.categories:
                        df_clean[col] = df_clean[col].cat.add_categories([fill_val])
                df_clean[col] = df_clean[col].fillna(fill_val)
            elif col_type == "datetime":
                df_clean[col] = df_clean[col].ffill().bfill()
        return df_clean
