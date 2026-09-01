# AI Career Engine (Agent-Driven Career Platform)

An agentic AI architecture designed to provide continuous, explainable, and precise career guidance, skill gap analysis, course sequencing, opportunity matching, and industry intelligence.

---

## 🏛️ Agent Architecture

```
                         USER PROFILE
                              │
                    ┌─────────▼─────────┐
                    │  AGENT ORCHESTRATOR │
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
                       SHARED STATE
```

---

## ⚙️ Core Design Principle: Agent Orchestration + Deterministic Engines

Agents decide what intelligence to request and format explanations, while **deterministic engines** execute exact numerical computations:

1. **`SkillAnalysisAgent`** → Delegates to **`SkillGapEngine`** & **`SkillEngine`**
2. **`CareerResearchAgent`** → Delegates to **`MarketEngine`** & evidence documents
3. **`LearningAgent`** → Delegates to **`RecommendationEngine`** for sequenced step generation
4. **`OpportunityAgent`** → Delegates to **`MatchingEngine`** for sub-scores & explainable matching
5. **`IndustryIntelligenceAgent`** → Delegates to **`MarketEngine`** for real skill trends
6. **`ProfileIntelligenceAgent`** → Delegates to **`ReadinessEngine`** & **`RoadmapEngine`**

---

## 🔑 API Key & Environment Setup

The system works both with live LLMs (NVIDIA Nemotron 3 Ultra, Google Gemini, OpenAI) and in **Zero-Dependency Simulation Mode** if no key is set.

### Local Setup (Recommended):
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and paste your NVIDIA API Key:
   ```ini
   LLM_PROVIDER=nemotron
   NVIDIA_API_KEY=nvapi-your-key-here
   LLM_MODEL=nvidia/nemotron-3-ultra-550b-a55b
   ```

### Command Line / Deployment Setup:
You can also export your key directly in terminal before running:
```bash
export NVIDIA_API_KEY="nvapi-your-key-here"
python demo.py
```

---

## 🚀 Running the Engine


### Run Demo CLI
```bash
python demo.py
```

### Run Unit Tests
```bash
python -m unittest discover -s tests
```

---

## 🔒 Protected Career Gap Policy
Career interruptions marked as `protected: true` (such as family care, medical, or parental leave) are explicitly isolated in `MatchingEngine` and `ReadinessEngine` so that candidate score metrics are never penalized.
