import os
import sys
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

import math
from profiling.profiler import DataProfiler
from domains.domain_analyzer import DomainAnalyzer
from recommendation.recommender import RecommendationEngine
from dashboard.generator import DashboardGenerator
from commands.processor import CommandProcessor


def sanitize_floats(obj):
    """Recursively replaces NaN, Infinity, -Infinity with None for standard JSON compliance."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, dict):
        return {k: sanitize_floats(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_floats(v) for v in obj]
    return obj


def validate_file_path(file_path: str) -> str:
    """
    Validates that file_path is safe, exists, and resides within
    an authorized datasets directory or project workspace.
    Prevents directory traversal and arbitrary system file access.
    """
    if not file_path or not isinstance(file_path, str):
        raise ValueError("file_path parameter is required and must be a valid path string")

    abs_path = os.path.abspath(file_path)
    real_path = os.path.realpath(abs_path)

    project_dir = os.path.realpath(os.path.dirname(os.path.abspath(__file__)))
    workspace_root = os.path.realpath(os.path.dirname(project_dir))

    # Explicitly prohibit system and device paths
    forbidden_prefixes = ["/etc", "/proc", "/sys", "/dev", "/root", "/var", "C:\\Windows", "C:\\Users\\Default"]
    for forbidden in forbidden_prefixes:
        if real_path.lower().startswith(forbidden.lower()):
            raise PermissionError(f"Access to system path denied: '{file_path}'")

    # Allow datasets directories, workspace root, or test samples
    allowed_roots = [
        os.path.realpath(os.path.join(workspace_root, "datasets")),
        os.path.realpath(os.path.join(workspace_root, "frontend")),
        os.path.realpath(workspace_root)
    ]

    is_contained = any(real_path.startswith(root) for root in allowed_roots)
    if not is_contained:
        raise PermissionError(f"Access denied: file path '{file_path}' is outside the authorized project root")

    if not os.path.exists(real_path):
        raise FileNotFoundError(f"Dataset file not found at '{file_path}'")

    return real_path


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


class DataMorphAIRequestHandler(BaseHTTPRequestHandler):
    ALLOWED_ORIGINS = {
        "http://localhost:4200",
        "http://127.0.0.1:4200",
        "http://localhost:3001",
        "http://127.0.0.1:3001"
    }

    def _get_cors_origin(self) -> str:
        origin = self.headers.get("Origin", "")
        if origin in self.ALLOWED_ORIGINS:
            return origin
        return "http://127.0.0.1:4200"

    def _send_response_json(self, data: dict, status: int = 200):
        sanitized_data = sanitize_floats(data)
        body = json.dumps(sanitized_data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", self._get_cors_origin())
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Internal-Token")
        self.send_header("Vary", "Origin")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", self._get_cors_origin())
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Internal-Token")
        self.send_header("Vary", "Origin")
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self._send_response_json({
                "status": "success",
                "service": "DataMorph AI Engine",
                "version": "2.0.0",
                "port": 5005
            })
        else:
            self._send_response_json({"status": "error", "message": f"Route not found: {self.path}"}, 404)

    def do_POST(self):
        content_len = int(self.headers.get("Content-Length", 0))
        # Cap request body to 50MB to prevent memory exhaustion
        if content_len > 50 * 1024 * 1024:
            self._send_response_json({"status": "error", "message": "Request body exceeds maximum allowed size (50MB)"}, 413)
            return

        post_body = self.rfile.read(content_len) if content_len > 0 else b"{}"

        try:
            payload = json.loads(post_body.decode("utf-8")) if post_body else {}
        except Exception as e:
            self._send_response_json({"status": "error", "message": f"Malformed JSON: {str(e)}"}, 400)
            return

        path = self.path.rstrip("/")

        try:
            if path == "/profile":
                raw_path = payload.get("file_path") or payload.get("file")
                file_path = validate_file_path(raw_path)
                profile = DataProfiler.profile_dataset(file_path)
                self._send_response_json({"status": "success", "data": profile})

            elif path == "/domains":
                raw_path = payload.get("file_path") or payload.get("file")
                file_path = validate_file_path(raw_path)
                profile = DataProfiler.profile_dataset(file_path)
                domains = DomainAnalyzer.identify_domains(profile)
                self._send_response_json({"status": "success", "data": domains})

            elif path == "/recommend":
                raw_path = payload.get("file_path") or payload.get("file")
                top_k = payload.get("top_k", 8)
                file_path = validate_file_path(raw_path)
                profile = DataProfiler.profile_dataset(file_path)
                recommender = RecommendationEngine()
                recs = recommender.recommend(profile, top_k=top_k)
                self._send_response_json({"status": "success", "data": recs})

            elif path == "/dashboard":
                raw_path = payload.get("file_path") or payload.get("file")
                title = payload.get("title")
                file_path = validate_file_path(raw_path)
                generator = DashboardGenerator()
                dash = generator.generate_dashboard(file_path, title=title)
                self._send_response_json({"status": "success", "data": dash})

            elif path == "/widget/recompile":
                raw_path = payload.get("file_path")
                chart_type = payload.get("chart_type", "bar")
                x_axis = payload.get("x_axis")
                y_axis = payload.get("y_axis")
                aggregation = payload.get("aggregation", "SUM")
                title = payload.get("title", f"{y_axis} by {x_axis}")

                if not raw_path or not x_axis or not y_axis:
                    self._send_response_json({"status": "error", "message": "file_path, x_axis, and y_axis required"}, 400)
                    return

                file_path = validate_file_path(raw_path)
                generator = DashboardGenerator()
                df = generator.load_dataframe(file_path)
                chart_options = generator.compile_echarts_option(df, chart_type, x_axis, y_axis, aggregation, title)
                self._send_response_json({
                    "status": "success",
                    "data": {
                        "chart_type": chart_type,
                        "x_axis": x_axis,
                        "y_axis": y_axis,
                        "aggregation": aggregation,
                        "title": title,
                        "chart_options": chart_options
                    }
                })

            elif path == "/command":
                text = payload.get("text") or payload.get("command")
                raw_path = payload.get("file_path")
                dash_config = payload.get("dashboard") or {}

                if not text or not raw_path:
                    self._send_response_json({"status": "error", "message": "text and file_path required"}, 400)
                    return

                file_path = validate_file_path(raw_path)
                profile = DataProfiler.profile_dataset(file_path)
                if not dash_config:
                    dash_config = DashboardGenerator().generate_dashboard(file_path)

                result = CommandProcessor.process_command(text, dash_config, profile, file_path=file_path)
                self._send_response_json({"status": "success", "data": result})

            else:
                self._send_response_json({"status": "error", "message": f"Endpoint not found: {path}"}, 404)

        except PermissionError as perm_err:
            self._send_response_json({"status": "error", "message": str(perm_err)}, 403)
        except (ValueError, FileNotFoundError) as client_err:
            self._send_response_json({"status": "error", "message": str(client_err)}, 400)
        except Exception as err:
            self._send_response_json({"status": "error", "message": f"Server processing error: {str(err)}"}, 500)

    def log_message(self, format, *args):
        # Suppress noisy standard request logs
        return


def run_server(port=5005):
    server_address = ("127.0.0.1", port)
    httpd = ThreadedHTTPServer(server_address, DataMorphAIRequestHandler)
    print(f"[DataMorph AI Engine] High-performance REST service listening on http://127.0.0.1:{port}", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down AI Engine service.", flush=True)
        httpd.server_close()


if __name__ == "__main__":
    port = int(os.environ.get("AI_ENGINE_PORT", 5005))
    run_server(port)
