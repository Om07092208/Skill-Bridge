from __future__ import annotations
import os
import sys
import unittest

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


def main():
    target = sys.argv[1].lower() if len(sys.argv) > 1 else "default"
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    tests_dir = os.path.join(PROJECT_ROOT, "tests")

    if target in ["unit", "u"]:
        print("[RUNNER] Executing Layer 1: Unit Tests (tests/unit)...")
        suite.addTests(loader.discover(os.path.join(tests_dir, "unit"), top_level_dir=PROJECT_ROOT))
    elif target in ["integration", "int", "i"]:
        print("[RUNNER] Executing Layer 2: Mocked Integration Tests (tests/integration)...")
        suite.addTests(loader.discover(os.path.join(tests_dir, "integration"), top_level_dir=PROJECT_ROOT))
    elif target in ["live", "l"]:
        print("[RUNNER] Executing Layer 3: Live E2E Tests (tests/live)...")
        suite.addTests(loader.discover(os.path.join(tests_dir, "live"), top_level_dir=PROJECT_ROOT))
    elif target in ["all", "a"]:
        print("[RUNNER] Executing ALL Test Layers (unit + integration + live)...")
        suite.addTests(loader.discover(os.path.join(tests_dir, "unit"), top_level_dir=PROJECT_ROOT))
        suite.addTests(loader.discover(os.path.join(tests_dir, "integration"), top_level_dir=PROJECT_ROOT))
        suite.addTests(loader.discover(os.path.join(tests_dir, "live"), top_level_dir=PROJECT_ROOT))
    else:
        print("[RUNNER] Executing Fast Automated Tests (Unit + Integration)...")
        suite.addTests(loader.discover(os.path.join(tests_dir, "unit"), top_level_dir=PROJECT_ROOT))
        suite.addTests(loader.discover(os.path.join(tests_dir, "integration"), top_level_dir=PROJECT_ROOT))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)


if __name__ == "__main__":
    main()
