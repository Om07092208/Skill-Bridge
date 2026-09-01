# AI Career Engine - 3-Layer Test Suite Architecture

This directory contains the automated test suite refactored into a **3-Layer Architecture** for sub-second deterministic execution, zero API quota consumption, and clean resource management.

---

## 🏗️ 3-Layer Test Architecture

```
                 ┌─────────────────────┐
                 │   UNIT TESTS        │  tests/unit/
                 │ Zero network calls  │  Sub-second execution
                 │ Deterministic       │
                 └──────────┬──────────┘
                            │
                 ┌──────────▼──────────┐
                 │ INTEGRATION TESTS   │  tests/integration/
                 │ Mocked LLM Provider │  Deterministic scenarios
                 │ Zero network calls  │  & Data contracts
                 └──────────┬──────────┘
                            │
                 ┌──────────▼──────────┐
                 │ LIVE E2E TESTS      │  tests/live/
                 │ Real NVIDIA NIM API │  On-demand execution
                 │ API key required    │
                 └─────────────────────┘
```

---

## 📁 Directory Layout

### 1. Unit Tests (`tests/unit/`)
Pure deterministic engine logic tests running in milliseconds without network or API dependencies:
- **`test_matching_engine.py`**: Unit tests for continuous skill matching, location/education scoring, and protected gap rules.
- **`test_skill_gap_engine.py`**: Unit tests for skill gap detection and priority boundaries.
- **`test_readiness_engine.py`**: Unit tests for readiness scoring and project coverage.

### 2. Integration Tests (`tests/integration/`)
Scenario evaluation and candidate matrix tests using **Mocked LLMs** (`@patch`) for fast, deterministic pipeline validation:
- **`test_scenarios_mocked.py`**: Runs SRS evaluation scenarios S001-S007 in < 1 second.
- **`test_invariants_mocked.py`**: Runs full candidate $\times$ role matrix tests in < 1 second.
- **`test_data_contracts.py`**: Dataset schema and ID contract tests.

### 3. Live E2E Tests (`tests/live/`)
Live API tests calling real LLM endpoints (NVIDIA Nemotron 3 Ultra):
- **`test_nvidia_llm_live.py`**: Real live API completion tests.

---

## 🚀 Running the Tests

### Run Unit Tests (Fast, Milliseconds)
```bash
python -m unittest discover -s tests/unit -v
```

### Run Integration Tests (Fast, Mocked LLM)
```bash
python -m unittest discover -s tests/integration -v
```

### Run Unit + Integration Tests Together (Standard CI/CD)
```bash
python -m unittest discover -s tests/unit && python -m unittest discover -s tests/integration
```

### Run Live E2E Tests (On-Demand, Real NVIDIA API)
```bash
python -m unittest discover -s tests/live -v
```
