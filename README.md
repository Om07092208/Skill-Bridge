# Skill-Bridge | AI Career & Skill Intelligence Platform

[![CI Pipeline](https://github.com/Om07092208/Skill-Bridge/actions/workflows/ci.yml/badge.svg)](https://github.com/Om07092208/Skill-Bridge/actions)
[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An intelligent, multi-agent AI career analysis platform that evaluates candidate resumes, analyzes skill gaps against target roles, sequences learning paths, ranks job/internship opportunities, and provides continuous career readiness coaching.

---

## 🏗️ Architecture Overview

The system uses a **6-Agent Orchestrated Pipeline** combined with deterministic calculation engines:

```
                         USER PROFILE / RESUME
                                   │
                         ┌─────────▼─────────┐
                         │  AGENT ORCHESTRATOR│
                         └─────────┬─────────┘
                                   │
        ┌──────────┬───────────┼───────────┬───────────┐
        ▼          ▼           ▼           ▼           ▼
    CAREER      SKILL       LEARNING   OPPORTUNITY  INDUSTRY
    RESEARCH   ANALYSIS       AGENT       AGENT    INTELLIGENCE
      AGENT       AGENT                                   AGENT
        │          │           │           │              │
        └──────────┴───────────┼───────────┴──────────────┘
                                   ▼
                         PROFILE INTELLIGENCE
                                AGENT
                                   │
                                   ▼
                         CAREER INTELLIGENCE STATE
```

### Specialized Agents & Deterministic Engines

1. **Skill Analysis Agent** (`SkillGapEngine`): Normalizes skills, accounts for recency & project evidence, and identifies prioritized skill gaps.
2. **Career Research Agent** (`MarketEngine`): Maps career transitions and computes role compatibility scores.
3. **Industry Intelligence Agent** (`MarketEngine`): Tracks market demand trends and elevates emerging technology tools in roadmaps.
4. **Learning Agent** (`RecommendationEngine`): Recommends platform courses and sequences prerequisite-first learning plans.
5. **Opportunity Agent** (`MatchingEngine`): Ranks jobs & internships based on continuous proficiency matching, experience, education, and location.
6. **Profile Intelligence Agent** (`ReadinessEngine` & `RoadmapEngine`): Calculates overall career readiness scores and builds step-by-step roadmaps.

---

## ⚡ Quick Start & Setup

### 1. Prerequisites
- **Python 3.10+**
- Git

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/Om07092208/Skill-Bridge.git
cd Skill-Bridge

# Install core dependencies
pip install -r ai-career-engine/requirements.txt
```

### 3. Environment Configuration
Copy the example environment file and configure your API keys:
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```ini
LLM_PROVIDER=nemotron
NVIDIA_API_KEY=your_nvidia_api_key_here
LLM_MODEL=meta/llama-3.2-11b-vision-instruct
```

---

## 🚀 Running the Engine & Web Interface

### Run the Multi-Agent Demo CLI
```bash
python ai-career-engine/demo.py
```

### Run the Web Server (Frontend & API Bridge)
```bash
python frontend/server.py
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

---

## 🧪 Testing Architecture

The project enforces a **3-Layer Testing Strategy**:
- **Unit Tests** (`tests/unit`): 100% deterministic tests for core calculation engines.
- **Integration Tests** (`tests/integration`): Pipeline tests using mocked LLM responses.
- **Live E2E Tests** (`tests/e2e`): Real API smoke tests (isolated behind `@pytest.mark.live`).

### Run Unit & Integration Tests (Fast / Offline CI)
```bash
python ai-career-engine/run_tests.py
```
or
```bash
pytest ai-career-engine/tests -m "not live"
```

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
