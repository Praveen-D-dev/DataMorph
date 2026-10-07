import os
import sys

# Ensure ai-engine is in Python path for test execution
ai_engine_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ai-engine"))
if ai_engine_path not in sys.path:
    sys.path.insert(0, ai_engine_path)
