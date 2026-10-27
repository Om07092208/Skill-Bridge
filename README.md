# Skill Bridge

> **AI-Powered Career Intelligence, Fair Opportunity Matching & Interactive Interview Readiness Platform**

Skill Bridge is an end-to-end career guidance and interview preparation platform. It combines a **multi-agent AI pipeline** with **deterministic computational engines** to provide explainable skill-gap analysis, sequenced learning roadmaps, fair opportunity matching, and real-time multiplayer practice arenas for technical interviews, group discussions, and aptitude tests.

---

## Table of Contents

- [Overview & Core Value](#-overview--core-value)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Platform Modules](#-platform-modules)
- [The 6 AI Agents & Deterministic Engines](#-the-6-ai-agents--deterministic-engines)
- [Tech Stack](#-tech-stack)
- [Repository Structure](#-repository-structure)
- [Installation & Quick Start](#-installation--quick-start)
  - [1. Prerequisites](#1-prerequisites)
  - [2. Environment Configuration](#2-environment-configuration)
  - [3. Running the AI Career Engine & Dashboard](#3-running-the-ai-career-engine--dashboard)
  - [4. Running the Aptitude Quiz Arena](#4-running-the-aptitude-quiz-arena)
  - [5. Running the GD (Group Discussion) Arena](#5-running-the-gd-group-discussion-arena)
  - [6. Running Code Collaboration](#6-running-code-collaboration)
- [Running Tests & Benchmarks](#-running-tests--benchmarks)
- [Protected Career Gap Policy](#-protected-career-gap-policy)
- [Contributing](#-contributing)
- [License](#-license)

---

## Overview & Core Value

Traditional job boards and resume screeners act as a "black box": candidates receive automated rejections without clear explanations, career advice is often based on hallucinated trends, and individuals with legitimate career pauses (parental leave, caregiving, medical recovery) face unfair scoring penalties.

**Skill Bridge solves this by enforcing three fundamental principles:**
1. **Math Stays Deterministic:** AI agents do not calculate scores; deterministic algorithmic engines compute skill gaps, readiness percentages, and compatibility metrics.
2. **Transparent Explanations:** AI agents interpret verified data and craft clear, actionable guidance.
3. **Protected Career Gap Fairness:** Gaps designated as protected are structurally excluded from scoring penalties.

---

## Key Features

* **Verifiable Resume Parsing:** Extracts technical skills and maps them line-by-line back to the candidate's uploaded resume with confidence scoring.
* **Prioritized Skill Gap Analysis:** Analyzes current competencies against target role requirements (benchmarked against O\*NET and ESCO standards).
* **Logical Course Sequencing:** Delivers a step-by-step learning roadmap ensuring foundational prerequisites precede advanced specializations.
* **Explainable Opportunity Matching:** Matches candidates to open roles with transparent "Why You Match" and "Remaining Gaps" insights.
* **AI Group Discussion (GD) Arena:** Interactive practice room with simulated AI participants featuring diverse communication styles and audio synthesis.
* **Multiplayer Aptitude Arena:** Real-time competitive testing powered by WebSockets, server-authoritative scoring, and live leaderboards.
* **Live Collaborative Code Studio:** Pair-programming room with syntax highlighting, live cursor tracking, and collaborative editing.

---

## System Architecture

Skill Bridge uses a hybrid architecture separating deterministic calculation from LLM reasoning:

                         [ USER PROFILE / RESUME ]
                                    │
                         ┌──────────▼──────────┐
                         │  AGENT ORCHESTRATOR │
                         └──────────┬──────────┘
                                    │
        ┌──────────────┬────────────┼────────────┬──────────────┐
        ▼              ▼            ▼            ▼              ▼
     CAREER          SKILL       LEARNING   OPPORTUNITY     INDUSTRY
    RESEARCH       ANALYSIS       AGENT        AGENT       INTELLIGENCE
      AGENT          AGENT                                    AGENT
        │              │            │            │              │
        │              └────────────┼────────────┘              │
        ▼                           ▼                           ▼
  [MarketEngine]            [SkillGapEngine]            [MarketEngine]
                            [MatchingEngine]
                            [Recommendation]
                                    │
                                    ▼
                         PROFILE INTELLIGENCE
                                AGENT
                       (ReadinessEngine + Roadmap)
                                    │
                                    ▼
                           [ SHARED STATE JSON ]
                                    │
            ┌───────────────────────┴───────────────────────┐
            ▼                                               ▼
  [ CareerIntel Dashboard ]                       [ Practice Arenas ]
  • Skill Gap Matrix                              • Group Discussion (GD)
  • Sequenced Course Roadmap                      • Aptitude Arena (Socket.IO)
  • Matched Jobs & Internships                    • Collaborative Code Studio
```
## Platform Modules

---

## Running Tests & Benchmarks

Skill Bridge includes unit tests, integration suites, fairness validation, and performance benchmarks.

### Fast Unit & Integration Tests

From the project root:

```bash
python run_tests.py
```

Or target specific layers directly from `ai-career-engine/`:

```bash
cd ai-career-engine

# Run Unit Tests only
python run_tests.py unit

# Run Mocked Integration Tests
python run_tests.py integration

# Run All Tests
python run_tests.py all
```

### System Evaluation & Benchmark Suite

Execute the benchmark suite to measure latency, ranking precision, and career-gap fairness:

```bash
cd ai-career-engine
python evaluate.py
```

Evaluation charts will be generated in `ai-career-engine/reports/charts/`:
* `chart_protected_gap_fairness.png`
* `chart_agent_execution_times.png`
* `chart_readiness_distribution.png`
* `chart_skill_gap_prioritization.png`

---

##Protected Career Gap Policy

Skill Bridge enforces an explicit fairness constraint in all ranking and readiness calculations:

$$\text{Readiness}(\text{Candidate with Protected Gap}) \equiv \text{Readiness}(\text{Candidate without Gap})$$

* Any career interruption marked as `protected: true` (such as parental leave, family caregiving, or medical treatment) is isolated from penalty logic in `MatchingEngine` and `ReadinessEngine`.
* Automated regression tests (`tests/integration/test_invariants_mocked.py`) verify this invariant continuously to prevent bias regressions.

---

##Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature-name`.
3. Ensure all tests pass: `python run_tests.py`.
4. Commit your changes: `git commit -m "Add new capability"`.
5. Push to the branch: `git push origin feature/your-feature-name`.
6. Open a Pull Request.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

