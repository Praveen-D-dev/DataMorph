import os
import hashlib
import pandas as pd
from typing import Dict, Any
from profiling.type_detector import TypeDetector
from profiling.statistics import StatisticsEngine


class DataProfiler:
    """
    Main profiling orchestrator. Performs staged analysis:
    Stage 1: Schema & row/col extraction
    Stage 2: Type detection
    Stage 3: Statistical moments & correlation matrix
    """

    @staticmethod
    def compute_file_hash(file_path: str) -> str:
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        return hasher.hexdigest()

    @classmethod
    def profile_dataset(cls, file_path: str) -> Dict[str, Any]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Dataset not found at {file_path}")

        file_size = os.path.getsize(file_path)
        file_hash = cls.compute_file_hash(file_path)

        # Stage 1: Load file with optimized types
        if file_path.endswith((".xlsx", ".xls")):
            df = pd.read_excel(file_path)
        elif file_path.endswith(".parquet"):
            df = pd.read_parquet(file_path)
        else:
            df = pd.read_csv(file_path)

        row_count, col_count = df.shape

        # Stage 2: Type detection
        types = TypeDetector.detect_all(df)

        # Group column types
        numeric_cols = [c for c, t in types.items() if t in ("numeric_continuous", "numeric_discrete")]
        categorical_cols = [c for c, t in types.items() if t == "categorical_nominal"]
        datetime_cols = [c for c, t in types.items() if t == "datetime"]
        boolean_cols = [c for c, t in types.items() if t == "boolean"]

        # Stage 3: Summary statistics
        column_stats = {}
        for col in df.columns:
            column_stats[col] = StatisticsEngine.compute_column_statistics(df[col], types[col])

        correlation_matrix = StatisticsEngine.compute_correlation_matrix(df, numeric_cols)

        # Overall summary
        profile = {
            "file_info": {
                "file_path": file_path,
                "filename": os.path.basename(file_path),
                "file_size_bytes": file_size,
                "sha256_hash": file_hash,
                "row_count": row_count,
                "column_count": col_count
            },
            "type_counts": {
                "numeric_continuous": sum(1 for t in types.values() if t == "numeric_continuous"),
                "numeric_discrete": sum(1 for t in types.values() if t == "numeric_discrete"),
                "categorical_nominal": len(categorical_cols),
                "datetime": len(datetime_cols),
                "boolean": len(boolean_cols),
                "high_cardinality_text": sum(1 for t in types.values() if t == "high_cardinality_text")
            },
            "column_types": types,
            "column_statistics": column_stats,
            "correlation_matrix": correlation_matrix,
            "structural_classification": cls._classify_dataset_structure(types, row_count)
        }

        return profile

    @staticmethod
    def _classify_dataset_structure(types: Dict[str, str], row_count: int) -> str:
        has_dt = any(t == "datetime" for t in types.values())
        num_count = sum(1 for t in types.values() if t in ("numeric_continuous", "numeric_discrete"))
        cat_count = sum(1 for t in types.values() if t == "categorical_nominal")

        if has_dt and num_count >= 1:
            return "time_series"
        elif cat_count >= 1 and num_count >= 1:
            return "business_tabular"
        elif num_count >= 3 and cat_count == 0:
            return "multivariate_numerical"
        else:
            return "generic_tabular"
