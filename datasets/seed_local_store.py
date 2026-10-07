import os
import json
import hashlib
from datetime import datetime

os.makedirs("database", exist_ok=True)
store_path = os.path.abspath("database/local_store.json")

samples = [
    ("sales.csv", "datasets/samples/sales.csv"),
    ("students.csv", "datasets/samples/students.csv"),
    ("employees.csv", "datasets/samples/employees.csv"),
    ("ecommerce.csv", "datasets/samples/ecommerce.csv"),
    ("weather_timeseries.csv", "datasets/samples/weather_timeseries.csv"),
]

datasets = {}
for filename, rel_path in samples:
    abs_path = os.path.abspath(rel_path)
    if not os.path.exists(abs_path):
        continue
    with open(abs_path, "rb") as f:
        content = f.read()
        sha = hashlib.sha256(content).hexdigest()
    lines = content.decode("utf-8", errors="ignore").splitlines()
    row_count = max(0, len(lines) - 1)
    col_count = len(lines[0].split(",")) if lines else 0
    ds_id = f"sample-{filename.split('.')[0]}"
    datasets[ds_id] = {
        "id": ds_id,
        "filename": filename,
        "storage_path": abs_path,
        "file_size_bytes": len(content),
        "row_count": row_count,
        "column_count": col_count,
        "sha256_hash": sha,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }

store = {
    "datasets": datasets,
    "profiles": {},
    "dashboards": {},
    "history": []
}

with open(store_path, "w", encoding="utf-8") as f:
    json.dump(store, f, indent=2)

print(f"Successfully seeded {len(datasets)} benchmark datasets into {store_path}")
