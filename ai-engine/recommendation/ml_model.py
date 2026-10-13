import os
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from typing import Dict, List, Optional

CHART_CLASSES = ["bar", "line", "scatter", "pie", "box", "histogram", "heatmap"]


class MLRecommendationModel:
    """
    Lightweight Scikit-learn Random Forest model trained on tabular visualization
    meta-features to predict optimal chart category probabilities offline.
    Initialized in-memory with deterministic statistical priors to ensure safe,
    version-independent execution without unpickling binary artifacts.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model: Optional[RandomForestClassifier] = None
        self._train_baseline_model()

    def _train_baseline_model(self):
        # 19 features matching FeatureExtractor
        # Classes: 0: bar, 1: line, 2: scatter, 3: pie, 4: box, 5: histogram, 6: heatmap
        X_train = []
        y_train = []

        # Synthetic benchmark patterns
        for _ in range(50):
            # Time series pattern -> line (1)
            X_train.append([2.5, 6, 0.4, 0.1, 0.3, 0.2, 0.0, 0.01, 0.05, 0.15, 0.3, 0.2, 0.5, 0.3, 0.6, 1.0, 0.0, 1.0, 0.0])
            y_train.append(1)

            # Business tabular with categories & numeric -> bar (0)
            X_train.append([2.8, 8, 0.5, 0.2, 0.3, 0.0, 0.0, 0.02, 0.10, 0.08, 0.2, 0.4, 0.9, 0.2, 0.4, 0.0, 0.0, 0.0, 1.0])
            y_train.append(0)

            # High correlation numerical -> scatter (2)
            X_train.append([3.0, 5, 0.8, 0.2, 0.0, 0.0, 0.0, 0.00, 0.00, 0.40, 0.8, 0.1, 0.3, 0.7, 0.9, 0.0, 0.0, 0.0, 0.0])
            y_train.append(2)

            # Low cardinality part-to-whole -> pie (3)
            X_train.append([2.0, 4, 0.2, 0.1, 0.7, 0.0, 0.0, 0.01, 0.02, 0.02, 0.05, 0.1, 0.2, 0.1, 0.2, 0.0, 0.0, 0.0, 1.0])
            y_train.append(3)

            # High skew and outliers -> box (4)
            X_train.append([2.6, 6, 0.7, 0.1, 0.2, 0.0, 0.0, 0.03, 0.08, 0.25, 0.6, 1.8, 3.2, 0.2, 0.5, 0.0, 0.0, 0.0, 0.0])
            y_train.append(4)

            # Continuous univariates -> histogram (5)
            X_train.append([3.2, 4, 1.0, 0.0, 0.0, 0.0, 0.0, 0.00, 0.02, 0.50, 0.9, 0.6, 1.4, 0.1, 0.3, 0.0, 0.0, 0.0, 0.0])
            y_train.append(5)

            # Many numerical features with correlations -> heatmap (6)
            X_train.append([3.0, 10, 0.9, 0.1, 0.0, 0.0, 0.0, 0.01, 0.04, 0.30, 0.7, 0.3, 0.8, 0.5, 0.85, 0.0, 0.0, 0.0, 0.0])
            y_train.append(6)

        rf = RandomForestClassifier(n_estimators=30, max_depth=6, random_state=42)
        rf.fit(np.array(X_train), np.array(y_train))
        self.model = rf

    def predict_chart_probabilities(self, feature_vector: List[float]) -> Dict[str, float]:
        if self.model is None:
            return {c: 0.14 for c in CHART_CLASSES}

        probs = self.model.predict_proba(np.array([feature_vector]))[0]
        result = {}
        for idx, chart_name in enumerate(CHART_CLASSES):
            if idx < len(probs):
                result[chart_name] = round(float(probs[idx]), 4)
            else:
                result[chart_name] = 0.05
        return result
