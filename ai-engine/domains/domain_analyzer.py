import re
from typing import Dict, Any, List


class DomainAnalyzer:
    """
    Analyzes dataset columns, types, statistics, and correlation clusters
    to identify semantic analytical domains. Generates the dynamic sidebar
    configuration required by DataMorph.
    """

    DOMAIN_LEXICON = {
        "Academic Performance": {
            "keywords": ["mark", "marks", "score", "scores", "grade", "grades", "gpa", "cgpa", "exam", "test", "quiz", "result", "internal_marks"],
            "icon": "award",
            "description": "Student academic evaluations, grading tiers, and examination scores"
        },
        "Attendance & Engagement": {
            "keywords": ["attendance", "present", "absent", "working_day", "working_days", "leave", "session", "hours", "participation", "study_hours"],
            "icon": "calendar-check",
            "description": "Attendance tracking, working days, and engagement metrics"
        },
        "Departments & Cohorts": {
            "keywords": ["department", "major", "faculty", "stream", "course", "degree", "class", "section", "semester", "cohort"],
            "icon": "layers",
            "description": "Departmental distribution, semesters, and cohort structures"
        },
        "Revenue & Profitability": {
            "keywords": ["revenue", "profit", "margin", "income", "earning", "gross", "net", "loss", "ebitda"],
            "icon": "trending-up",
            "description": "Top-line revenue, net margins, and profitability metrics"
        },
        "Cost & Expenses": {
            "keywords": ["cost", "expense", "spend", "budget", "overhead", "cogs", "discount", "fee"],
            "icon": "dollar-sign",
            "description": "Operational costs, expenditure breakdowns, and discounting"
        },
        "Sales Volume & Pricing": {
            "keywords": ["unit", "price", "quantity", "volume", "order_unit", "sales_unit", "orders", "items"],
            "icon": "shopping-cart",
            "description": "Unit pricing economics, transaction volumes, and order sizes"
        },
        "Compensation & Benefits": {
            "keywords": ["salary", "wage", "bonus", "compensation", "pay", "stipend", "allowance", "commission"],
            "icon": "briefcase",
            "description": "Employee compensation, bonuses, and salary structures"
        },
        "Tenure & Performance": {
            "keywords": ["performance", "rating", "evaluation", "tenure", "experience", "years", "satisfaction", "kpi"],
            "icon": "user-check",
            "description": "Performance ratings, company tenure, and career progression"
        },
        "Atmospheric & Temperature": {
            "keywords": ["temp", "temperature", "heat", "thermal", "celsius", "fahrenheit", "warmth"],
            "icon": "sun",
            "description": "Temperature patterns, heat index fluctuations, and ambient states"
        },
        "Precipitation & Moisture": {
            "keywords": ["rain", "rainfall", "humidity", "moisture", "precipitation", "dew", "water"],
            "icon": "cloud-rain",
            "description": "Rainfall volume, humidity concentrations, and precipitation"
        },
        "Wind & Barometric Dynamics": {
            "keywords": ["wind", "gust", "speed", "pressure", "barometer", "storm", "direction"],
            "icon": "wind",
            "description": "Barometric pressure dynamics and wind speed distributions"
        },
        "Customer & Demographics": {
            "keywords": ["customer", "client", "buyer", "user", "age", "gender", "education", "demographic", "segment"],
            "icon": "users",
            "description": "Customer segments, user cohorts, and demographic profiles"
        },
        "Geographic Distribution": {
            "keywords": ["region", "country", "city", "state", "territory", "location", "zone", "address", "lat", "lon"],
            "icon": "map-pin",
            "description": "Territory distributions, regional comparisons, and location analysis"
        },
        "Products & Categories": {
            "keywords": ["product", "category", "sku", "item", "brand", "model", "type"],
            "icon": "tag",
            "description": "Product portfolio categorization, SKU distribution, and category performance"
        },
        "Temporal Trends": {
            "keywords": ["date", "time", "year", "month", "day", "quarter", "timestamp", "period"],
            "icon": "clock",
            "description": "Chronological progression, seasonality, and time-series behavior"
        }
    }

    @classmethod
    def identify_domains(cls, profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        column_types = profile.get("column_types", {})
        columns = list(column_types.keys())
        assigned_columns = set()
        domains = []

        # 1. Match columns against domain lexicon
        for domain_name, config in cls.DOMAIN_LEXICON.items():
            matching_cols = []
            for col in columns:
                if col in assigned_columns:
                    continue
                col_clean = re.sub(r"[^a-zA-Z0-9]", " ", col.lower()).split()
                if any(any(kw in token for token in col_clean) for kw in config["keywords"]):
                    matching_cols.append(col)

            if len(matching_cols) >= 1:
                numeric_in_domain = [c for c in matching_cols if column_types.get(c, "").startswith("numeric")]
                categorical_in_domain = [c for c in matching_cols if column_types.get(c, "") == "categorical_nominal"]
                
                domains.append({
                    "id": f"domain-{len(domains) + 1}",
                    "title": domain_name,
                    "type": "analysis",
                    "icon": config["icon"],
                    "description": config["description"],
                    "columns": matching_cols,
                    "numeric_metrics": numeric_in_domain,
                    "dimensions": categorical_in_domain,
                    "metric_count": len(matching_cols)
                })
                for c in matching_cols:
                    assigned_columns.add(c)

        # 2. Cluster remaining unassigned columns into fallback semantic groups
        unassigned = [c for c in columns if c not in assigned_columns]
        if unassigned:
            unassigned_numeric = [c for c in unassigned if column_types.get(c, "").startswith("numeric")]
            unassigned_cat = [c for c in unassigned if column_types.get(c, "") == "categorical_nominal"]
            unassigned_dt = [c for c in unassigned if column_types.get(c, "") == "datetime"]

            if unassigned_numeric:
                domains.append({
                    "id": f"domain-{len(domains) + 1}",
                    "title": "Quantitative Measures",
                    "type": "analysis",
                    "icon": "activity",
                    "description": "Numerical metrics and quantitative distributions",
                    "columns": unassigned_numeric,
                    "numeric_metrics": unassigned_numeric,
                    "dimensions": [],
                    "metric_count": len(unassigned_numeric)
                })

            if unassigned_cat:
                domains.append({
                    "id": f"domain-{len(domains) + 1}",
                    "title": "Categorical Dimensions",
                    "type": "analysis",
                    "icon": "layers",
                    "description": "Categorical breakdowns and segmentations",
                    "columns": unassigned_cat,
                    "numeric_metrics": [],
                    "dimensions": unassigned_cat,
                    "metric_count": len(unassigned_cat)
                })

            if unassigned_dt:
                domains.append({
                    "id": f"domain-{len(domains) + 1}",
                    "title": "Chronological Progression",
                    "type": "analysis",
                    "icon": "clock",
                    "description": "Time-based timelines and periodic variations",
                    "columns": unassigned_dt,
                    "numeric_metrics": [],
                    "dimensions": unassigned_dt,
                    "metric_count": len(unassigned_dt)
                })

        if not domains:
            domains.append({
                "id": "domain-general",
                "title": "General Analysis",
                "type": "analysis",
                "icon": "bar-chart-2",
                "description": "General distribution and correlation metrics",
                "columns": columns,
                "numeric_metrics": [c for c, t in column_types.items() if t.startswith("numeric")],
                "dimensions": [c for c, t in column_types.items() if t == "categorical_nominal"],
                "metric_count": len(columns)
            })

        return domains[:6]
