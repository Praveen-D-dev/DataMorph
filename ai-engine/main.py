import sys
import json
import argparse
from profiling.profiler import DataProfiler
from recommendation.recommender import RecommendationEngine
from dashboard.generator import DashboardGenerator
from commands.processor import CommandProcessor


def main():
    parser = argparse.ArgumentParser(description="DataMorph AI Engine Core CLI")
    subparsers = parser.add_subparsers(dest="command", help="Sub-command to execute")

    # 1. Profile command
    profile_parser = subparsers.add_parser("profile", help="Profile a tabular dataset")
    profile_parser.add_argument("--file", required=True, help="Path to CSV/Parquet file")

    # 2. Recommend command
    recommend_parser = subparsers.add_parser("recommend", help="Generate chart recommendations")
    recommend_parser.add_argument("--file", required=True, help="Path to CSV/Parquet file")
    recommend_parser.add_argument("--top_k", type=int, default=10, help="Number of recommendations")

    # 3. Dashboard command
    dashboard_parser = subparsers.add_parser("dashboard", help="Generate adaptive dashboard config")
    dashboard_parser.add_argument("--file", required=True, help="Path to CSV/Parquet file")
    dashboard_parser.add_argument("--title", default=None, help="Optional dashboard title")

    # 4. Command execution
    cmd_parser = subparsers.add_parser("command", help="Process a natural-language command")
    cmd_parser.add_argument("--text", required=True, help="Command text")
    cmd_parser.add_argument("--file", required=True, help="Path to dataset file")
    cmd_parser.add_argument("--dashboard_file", default=None, help="Path to current dashboard JSON")
    cmd_parser.add_argument("--dashboard_json", default=None, help="Inline JSON string of current dashboard")

    args = parser.parse_args()

    if not args.command:
        parser.print_help(file=sys.stderr)
        sys.exit(1)

    try:
        if args.command == "profile":
            profile = DataProfiler.profile_dataset(args.file)
            print(json.dumps({"status": "success", "data": profile}))

        elif args.command == "recommend":
            profile = DataProfiler.profile_dataset(args.file)
            recommender = RecommendationEngine()
            recs = recommender.recommend(profile, top_k=args.top_k)
            print(json.dumps({"status": "success", "data": recs}))

        elif args.command == "dashboard":
            generator = DashboardGenerator()
            dash = generator.generate_dashboard(args.file, title=args.title)
            print(json.dumps({"status": "success", "data": dash}))

        elif args.command == "command":
            profile = DataProfiler.profile_dataset(args.file)
            dash_config = {}
            if args.dashboard_json:
                try:
                    dash_config = json.loads(args.dashboard_json)
                except Exception:
                    dash_config = {}
            elif args.dashboard_file and os.path.exists(args.dashboard_file):
                with open(args.dashboard_file, "r") as f:
                    dash_config = json.load(f)

            if not dash_config:
                dash_config = DashboardGenerator().generate_dashboard(args.file)

            result = CommandProcessor.process_command(args.text, dash_config, profile, file_path=args.file)
            print(json.dumps({"status": "success", "data": result}))

    except Exception as e:
        print(json.dumps({"status": "error", "error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
