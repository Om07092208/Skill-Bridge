from __future__ import annotations
import os
import sys

ENGINE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ai-career-engine")
if ENGINE_DIR not in sys.path:
    sys.path.insert(0, ENGINE_DIR)

from run_tests import main

if __name__ == "__main__":
    main()
