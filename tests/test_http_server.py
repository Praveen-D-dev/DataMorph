import os
import sys
import json
import time
import threading
import urllib.request
import urllib.error

sys.path.insert(0, os.path.abspath("ai-engine"))
import server

def run_http_tests():
    # Start server in background thread
    server_thread = threading.Thread(target=server.run_server, kwargs={"port": 5005}, daemon=True)
    server_thread.start()
    time.sleep(1.2)  # Give server time to bind

    base_url = "http://127.0.0.1:5005"
    print("[1] Testing GET /health...")
    req = urllib.request.Request(f"{base_url}/health")
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        body = json.loads(resp.read().decode())
        assert body["status"] == "success"
        assert body["service"] == "DataMorph AI Engine"
        # Check CORS
        cors = resp.headers.get("Access-Control-Allow-Origin")
        assert cors in ["http://localhost:4200", "http://127.0.0.1:4200"]
    print(" -> /health OK!")

    print("[2] Testing Security: Path traversal rejected with 403...")
    traversal_payload = json.dumps({"file_path": "/etc/passwd"}).encode()
    req = urllib.request.Request(
        f"{base_url}/profile",
        data=traversal_payload,
        headers={"Content-Type": "application/json"}
    )
    try:
        urllib.request.urlopen(req)
        assert False, "Expected HTTP 403 for traversal path"
    except urllib.error.HTTPError as e:
        assert e.code == 403
        err_body = json.loads(e.read().decode())
        assert err_body["status"] == "error"
        assert "Access denied" in err_body["message"]
    print(" -> Path traversal successfully blocked with HTTP 403!")

    print("[3] Testing POST /profile on sales.csv...")
    profile_payload = json.dumps({"file_path": "datasets/samples/sales.csv"}).encode()
    req = urllib.request.Request(
        f"{base_url}/profile",
        data=profile_payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        body = json.loads(resp.read().decode())
        assert body["status"] == "success"
        data = body["data"]
        assert data["file_info"]["row_count"] == 500
        assert "Revenue" in data["column_types"]
    print(" -> /profile OK!")

    print("[4] Testing POST /dashboard on students.csv...")
    dash_payload = json.dumps({"file_path": "datasets/samples/students.csv", "title": "Test Dashboard"}).encode()
    req = urllib.request.Request(
        f"{base_url}/dashboard",
        data=dash_payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        body = json.loads(resp.read().decode())
        assert body["status"] == "success"
        dash = body["data"]
        assert len(dash["kpis"]) >= 2
        assert len(dash["visualizations"]) >= 3
        # Ensure no charts have empty data
        for v in dash["visualizations"]:
            assert len(v["chart_options"]["series"][0]["data"]) > 0
    print(" -> /dashboard OK with 100% rendered chart data points!")

    print("[5] Testing POST /command with active dashboard...")
    cmd_payload = json.dumps({
        "command": "filter by department CSE",
        "file_path": "datasets/samples/students.csv",
        "dashboard": dash
    }).encode()
    req = urllib.request.Request(
        f"{base_url}/command",
        data=cmd_payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        body = json.loads(resp.read().decode())
        assert body["status"] == "success"
        res = body["data"]
        assert res["intent"] == "FILTER_DATA"
        assert res["mutated_dashboard"]["active_filters"].get("Department") == "CSE"
    print(" -> /command OK!")

    print("\n=== ALL HTTP MICROSERVICE TESTS PASSED (100% Success) ===")

if __name__ == "__main__":
    run_http_tests()
