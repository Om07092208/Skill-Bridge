from __future__ import annotations
import os
import sys
import runpy

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
ENGINE_DIR = os.path.join(ROOT_DIR, "ai-career-engine")
ENGINE_RUNNER = os.path.join(ENGINE_DIR, "run_tests.py")

if ENGINE_DIR not in sys.path:
    sys.path.insert(0, ENGINE_DIR)

if __name__ == "__main__":
    runpy.run_path(ENGINE_RUNNER, run_name="__main__")
