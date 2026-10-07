import os
import sys
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from profiling.profiler import DataProfiler
from domains.domain_analyzer import DomainAnalyzer
from recommendation.recommender import RecommendationEngine
from dashboard.generator import DashboardGenerator
from commands.processor import CommandProcessor


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


class DataMorphAIRequestHandler(BaseHTTPRequestHandler):
    def _send_response_json(self, data: dict, status: int = 200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
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
        post_body = self.rfile.read(content_len) if content_len > 0 else b"{}"

        try:
            payload = json.loads(post_body.decode("utf-8")) if post_body else {}
        except Exception as e:
            self._send_response_json({"status": "error", "message": f"Malformed JSON: {str(e)}"}, 400)
            return

        path = self.path.rstrip("/")

        try:
            if path == "/profile":
                file_path = payload.get("file_path") or payload.get("file")
                if not file_path:
                    self._send_response_json({"status": "error", "message": "file_path is required"}, 400)
                    return
                profile = DataProfiler.profile_dataset(file_path)
                self._send_response_json({"status": "success", "data": profile})

            elif path == "/domains":
                file_path = payload.get("file_path") or payload.get("file")
                if not file_path:
                    self._send_response_json({"status": "error", "message": "file_path is required"}, 400)
                    return
                profile = DataProfiler.profile_dataset(file_path)
                domains = DomainAnalyzer.identify_domains(profile)
                self._send_response_json({"status": "success", "data": domains})

            elif path == "/recommend":
                file_path = payload.get("file_path") or payload.get("file")
                top_k = payload.get("top_k", 8)
                if not file_path:
                    self._send_response_json({"status": "error", "message": "file_path is required"}, 400)
                    return
                profile = DataProfiler.profile_dataset(file_path)
                recommender = RecommendationEngine()
                recs = recommender.recommend(profile, top_k=top_k)
                self._send_response_json({"status": "success", "data": recs})

            elif path == "/dashboard":
                file_path = payload.get("file_path") or payload.get("file")
                title = payload.get("title")
                if not file_path:
                    self._send_response_json({"status": "error", "message": "file_path is required"}, 400)
                    return
                generator = DashboardGenerator()
                dash = generator.generate_dashboard(file_path, title=title)
                self._send_response_json({"status": "success", "data": dash})

            elif path == "/widget/recompile":
                file_path = payload.get("file_path")
                chart_type = payload.get("chart_type", "bar")
                x_axis = payload.get("x_axis")
                y_axis = payload.get("y_axis")
                aggregation = payload.get("aggregation", "SUM")
                title = payload.get("title", f"{y_axis} by {x_axis}")

                if not file_path or not x_axis or not y_axis:
                    self._send_response_json({"status": "error", "message": "file_path, x_axis, and y_axis required"}, 400)
                    return

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
                file_path = payload.get("file_path")
                dash_config = payload.get("dashboard") or {}

                if not text or not file_path:
                    self._send_response_json({"status": "error", "message": "text and file_path required"}, 400)
                    return

                profile = DataProfiler.profile_dataset(file_path)
                if not dash_config:
                    dash_config = DashboardGenerator().generate_dashboard(file_path)

                result = CommandProcessor.process_command(text, dash_config, profile)
                self._send_response_json({"status": "success", "data": result})

            else:
                self._send_response_json({"status": "error", "message": f"Endpoint not found: {path}"}, 404)

        except Exception as err:
            self._send_response_json({"status": "error", "message": str(err)}, 500)

    def log_message(self, format, *args):
        # Suppress noisy standard request logs
        return


def run_server(port=5005):
    server_address = ("0.0.0.0", port)
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
