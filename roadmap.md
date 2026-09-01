1. Overall Agent Architecture

I recommend this:

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
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
                  RAG               LLM/AI
               Knowledge            Reasoning

The important design decision:

Agents should orchestrate intelligence. They should not independently calculate everything.

For example, Skill Analysis Agent can call a SkillGapEngine, while Opportunity Agent can call a MatchingEngine.

2. Shared Data Model

Before writing the six agents, create a common data structure.

Every agent should understand something like:

CandidateProfile
    ├── candidate_id
    ├── education
    ├── experience
    ├── skills
    ├── projects
    ├── certifications
    ├── courses
    ├── target_roles
    └── preferences

Skill:

Skill
    ├── name
    ├── normalized_name
    ├── proficiency
    ├── evidence
    ├── experience_months
    └── last_used

Target role:

TargetRole
    ├── role_name
    ├── required_skills
    ├── preferred_skills
    ├── experience_requirement
    └── education_requirement

This becomes the common language between agents.

3. Career Research Agent
SRS responsibilities

Your SRS says this agent should:

Research career paths
Identify emerging opportunities
Analyze career trends
Suggest career alternatives
Architecture
Candidate Profile
       │
       ▼
Career Research Agent
       │
       ├── O*NET
       ├── ESCO
       ├── Job Market Data
       ├── RAG
       └── Market Intelligence
              │
              ▼
        Career Analysis
Input
{
  "candidate_profile": {},
  "current_role": "Data Analyst",
  "target_role": "Data Scientist"
}
Processing

It should determine:

Current career
       ↓
Possible career paths
       ↓
Target career
       ↓
Alternative careers
       ↓
Market demand
       ↓
Emerging opportunities
Output
{
  "agent": "career_research",
  "career_paths": [
    {
      "role": "Data Scientist",
      "fit_score": 0.87
    },
    {
      "role": "ML Engineer",
      "fit_score": 0.76
    }
  ],
  "emerging_opportunities": [],
  "career_trends": [],
  "alternatives": []
}
Important

This agent should not invent career trends.

Your SRS says real market information should come from processed job data rather than being invented by the LLM.

4. Skill Analysis Agent ⭐

This is probably your most important agent.

SRS responsibilities
Analyze candidate skills
Compare skills with target roles
Identify missing skills
Prioritize skill gaps
Architecture
Candidate Profile
       │
       ▼
Skill Analysis Agent
       │
       ├── Skill Normalizer
       ├── O*NET / ESCO
       ├── Role Requirements
       └── Skill Gap Engine
                │
                ▼
           Skill Analysis
Example

Candidate:

Python       85%
SQL          75%
Pandas       80%
Docker       20%
Kubernetes    0%
MLOps         0%

Target:

ML Engineer

Agent produces:

Strong:
Python
Pandas

Moderate:
SQL

Gap:
Docker
Kubernetes
MLOps

Then prioritize:

1. Docker       HIGH
2. MLOps        HIGH
3. Kubernetes   MEDIUM
Output
{
  "agent": "skill_analysis",
  "target_role": "ML Engineer",
  "strengths": [],
  "skill_gaps": [
    {
      "skill": "Docker",
      "priority": "high",
      "current_level": 0.2,
      "required_level": 0.7
    }
  ]
}

This agent should call your deterministic Skill Gap Engine, rather than asking an LLM to calculate the gap.

5. Learning Agent
SRS responsibilities
Find relevant courses
Recommend certifications
Match learning resources to gaps
Generate learning sequences
Architecture
Skill Gaps
     │
     ▼
Learning Agent
     │
     ├── Course Database
     ├── Skill ↔ Course Mapping
     ├── Certification Database
     └── Recommendation Engine
             │
             ▼
       Learning Plan
Example

Input:

Skill Gap:
Docker
MLOps
Kubernetes

Output:

Step 1
Docker fundamentals

Step 2
Containerize ML application

Step 3
Kubernetes fundamentals

Step 4
MLOps pipeline

Step 5
Deploy ML model

The key is sequence, not simply a list of courses.

Output
{
  "agent": "learning",
  "learning_plan": [
    {
      "skill": "Docker",
      "resources": [],
      "priority": 1
    },
    {
      "skill": "MLOps",
      "resources": [],
      "priority": 2
    }
  ],
  "certifications": []
}
6. Opportunity Agent ⭐
SRS responsibilities
Match internships
Match entry-level jobs
Identify suitable opportunities
Calculate compatibility
Architecture
Candidate Profile
       │
       ▼
Opportunity Agent
       │
       ├── Job Database
       ├── Skill Matcher
       ├── Experience Matcher
       ├── Education Matcher
       └── Preference Matcher
               │
               ▼
        Compatibility Score

Example:

Job A

Skill Match       92%
Experience Match  85%
Education Match   100%
Location Match    100%

Overall           91%

And explain:

WHY MATCHED

✓ Python
✓ SQL
✓ Machine Learning
✓ Pandas

GAPS

⚠ AWS
⚠ Docker

This explanation capability aligns with your SRS's explainability requirement.

7. Industry Intelligence Agent ⭐⭐⭐

This is another potentially very strong differentiator.

SRS responsibilities
Monitor technology trends
Analyze changing skill requirements
Identify emerging tools
Architecture
                    Job Market Data
                           │
        ┌──────────────────┼─────────────────┐
        ▼                  ▼                 ▼
   Current Jobs       Historical Jobs    Tech Data
        │                  │                 │
        └──────────────────┼─────────────────┘
                           ▼
              Industry Intelligence Agent
                           │
                    Trend Analyzer
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
          Skill Trends  Tool Trends  Demand Trends

For example:

Skill          Current Demand    Trend
Python              72%            →
SQL                 64%            →
Docker              41%            ↑
Kubernetes          29%            ↑
MLOps               24%            ↑↑

The agent can then tell the user:

"MLOps demand is increasing among ML engineering roles, so it has been elevated in your roadmap."

That's much more defensible than:

"AI says MLOps is important."

8. Profile Intelligence Agent
SRS responsibilities
Analyze user progress
Track projects
Evaluate resume improvements
Monitor career readiness
Architecture
User Activity
     │
     ├── Courses
     ├── Projects
     ├── Certifications
     ├── Skills
     ├── Resume
     └── Applications
            │
            ▼
 Profile Intelligence Agent
            │
       Progress Analyzer
            │
      ┌─────┼─────┐
      ▼     ▼     ▼
   Skills Projects Readiness

Example:

Previous Profile

Python       70%
Docker       10%
ML           60%

        ↓

Completed:
✓ Docker course
✓ ML deployment project

        ↓

Updated Profile

Python       70%
Docker       55%
ML           72%

This agent is what makes the platform continuous, rather than a one-time recommendation system.

9. The Orchestrator

I strongly recommend creating one more component:

AgentOrchestrator

This doesn't replace your six agents.

It coordinates them.

                    Orchestrator
                         │
       ┌─────────────────┼─────────────────┐
       ↓                 ↓                 ↓
Career Research    Skill Analysis     Industry Intel
       │                 │                 │
       └─────────────────┼─────────────────┘
                         ↓
                    Learning Agent
                         │
                         ↓
                  Opportunity Agent
                         │
                         ↓
                Profile Intelligence

For example, when a new resume is uploaded:

Resume
  ↓
Profile Intelligence
  ↓
Skill Analysis
  ↓
Career Research
  ↓
Industry Intelligence
  ↓
Learning
  ↓
Opportunity
  ↓
Updated Profile
10. Shared State

This is extremely important.

Don't let each agent maintain its own copy of the user.

Create:

Career Intelligence State

Example:

{
  "candidate": {},
  "skills": [],
  "target_roles": [],
  "skill_gaps": [],
  "learning_progress": [],
  "projects": [],
  "market_intelligence": {},
  "opportunities": [],
  "readiness": {},
  "roadmap": []
}

Agents read and update specific portions of this state.

11. What should use LLM vs normal code?

This is where I would be strict.

Component	LLM?	Normal algorithm?
Resume extraction	✅	✅
Skill normalization	Maybe	✅
Skill gap calculation	❌	✅
Skill prioritization	Maybe	✅
Job matching	❌/Maybe	✅
Course ranking	❌/Maybe	✅
Market statistics	❌	✅
Trend calculation	❌	✅
Career explanation	✅	
Roadmap explanation	✅	
Career Q&A	✅	
Resume feedback	✅	
Recommendation reasoning	✅	
RAG		✅
Agent coordination	Maybe	✅

Don't make the LLM responsible for numerical truth.

12. Suggested project structure

I'd create your AI layer like this:

ai-career-engine/
│
├── agents/
│   ├── career_research_agent.py
│   ├── skill_analysis_agent.py
│   ├── learning_agent.py
│   ├── opportunity_agent.py
│   ├── industry_intelligence_agent.py
│   └── profile_intelligence_agent.py
│
├── engines/
│   ├── resume_engine.py
│   ├── skill_engine.py
│   ├── skill_gap_engine.py
│   ├── matching_engine.py
│   ├── recommendation_engine.py
│   ├── market_engine.py
│   ├── readiness_engine.py
│   └── roadmap_engine.py
│
├── rag/
│   ├── retriever.py
│   ├── embeddings.py
│   ├── reranker.py
│   └── knowledge_base.py
│
├── orchestrator/
│   └── agent_orchestrator.py
│
├── models/
│   ├── candidate.py
│   ├── skill.py
│   ├── opportunity.py
│   └── responses.py
│
├── config/
│   └── settings.py
│
├── tests/
│   ├── test_skill_agent.py
│   ├── test_learning_agent.py
│   ├── test_opportunity_agent.py
│   └── test_orchestrator.py
│
├── examples/
│   └── sample_candidate.json
│
├── requirements.txt
└── README.md
13. Build order

I recommend not starting with Career Research Agent.

Build in this order:

STEP 1
Shared data models
        ↓
STEP 2
Skill Intelligence
        ↓
STEP 3
Skill Gap Engine
        ↓
STEP 4
Skill Analysis Agent
        ↓
STEP 5
Learning Agent
        ↓
STEP 6
Opportunity Agent
        ↓
STEP 7
Career Research Agent
        ↓
STEP 8
Industry Intelligence Agent
        ↓
STEP 9
Profile Intelligence Agent
        ↓
STEP 10
Orchestrator
        ↓
STEP 11
RAG integration
        ↓
STEP 12
Tests + API contract
        ↓
GITHUB
The first milestone I'd target

Get this working without any frontend or backend:

candidate.json
      ↓
Skill Analysis Agent
      ↓
Skill Gap Engine
      ↓
Learning Agent
      ↓
Opportunity Agent
      ↓
structured JSON

If you can run:

python demo.py

and get:

Candidate
   ↓
Skills detected
   ↓
Target role
   ↓
Skill gaps
   ↓
Prioritized gaps
   ↓
Courses
   ↓
Job matches
Yes. I would improve the agent layer, not just add more LLM prompts.

Your SRS defines six agents, so the improved design should keep exactly those six responsibilities while making them modular, typed, explainable, and safe around career gaps.

The architecture I recommend is:

                    Agent Orchestrator
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
 Career Research      Skill Analysis       Industry
     Agent               Agent           Intelligence
        │                  │                  │
        │                  ▼                  │
        │            Skill Gap Engine         │
        │                  │                  │
        ▼                  ▼                  ▼
      RAG              Learning Agent       Market
        │                  │               Engine
        │                  ▼
        │            Recommendation
        │               Engine
        │
        └──────────────┬──────────────────────┘
                       ▼
                Opportunity Agent
                       │
                       ▼
               Profile Intelligence
                       │
                       ▼
                 Updated State

The key improvement is:

Agents decide what intelligence to request; engines perform deterministic calculations; RAG provides evidence; the LLM explains the result.

Below is the agent layer I'd actually put into your repository.

1. Project structure
ai-career-engine/
│
├── agents/
│   ├── __init__.py
│   ├── base_agent.py
│   ├── career_research_agent.py
│   ├── skill_analysis_agent.py
│   ├── learning_agent.py
│   ├── opportunity_agent.py
│   ├── industry_intelligence_agent.py
│   └── profile_intelligence_agent.py
│
├── engines/
│   ├── resume_engine.py
│   ├── skill_engine.py
│   ├── skill_gap_engine.py
│   ├── matching_engine.py
│   ├── recommendation_engine.py
│   ├── market_engine.py
│   ├── readiness_engine.py
│   └── roadmap_engine.py
│
├── models/
│   └── schemas.py
│
├── rag/
│   └── retriever.py
│
├── orchestrator/
│   └── agent_orchestrator.py
│
└── tests/
2. Shared schemas

First, don't make every agent invent its own dictionaries.

Create:

models/schemas.py
from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


Priority = Literal["high", "medium", "low"]


class Skill(BaseModel):
    name: str
    normalized_name: str

    proficiency: float = Field(
        ge=0.0,
        le=1.0,
    )

    experience_months: int = Field(
        default=0,
        ge=0,
    )

    evidence: List[str] = Field(
        default_factory=list
    )

    project_evidence: int = Field(
        default=0,
        ge=0,
    )

    course_completion: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
    )

    recency_score: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
    )


class CareerGap(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None

    duration_months: int = Field(
        default=0,
        ge=0,
    )

    reason: str = "unspecified"

    # Protected gaps must never reduce readiness
    # or opportunity scores.
    protected: bool = True


class Project(BaseModel):
    name: str
    description: str = ""

    skills: List[str] = Field(
        default_factory=list
    )


class CandidateProfile(BaseModel):
    candidate_id: str

    name: str = ""

    education: List[str] = Field(
        default_factory=list
    )

    skills: List[Skill] = Field(
        default_factory=list
    )

    experience_years: float = 0.0

    projects: List[Project] = Field(
        default_factory=list
    )

    certifications: List[str] = Field(
        default_factory=list
    )

    courses_completed: List[str] = Field(
        default_factory=list
    )

    location: str = ""

    career_gaps: List[CareerGap] = Field(
        default_factory=list
    )


class TargetRole(BaseModel):
    name: str

    required_skills: List[Skill] = Field(
        default_factory=list
    )

    preferred_skills: List[Skill] = Field(
        default_factory=list
    )

    experience_min: float = 0.0

    education_requirements: List[str] = Field(
        default_factory=list
    )


class SkillGap(BaseModel):
    skill: str

    required_level: float
    current_level: float

    gap: float

    priority: Priority

    evidence: List[str] = Field(
        default_factory=list
    )


class AgentResult(BaseModel):
    agent: str

    status: Literal[
        "success",
        "partial",
        "error",
    ]

    summary: str = ""

    data: Dict[str, Any] = Field(
        default_factory=dict
    )

    evidence: List[Dict[str, Any]] = Field(
        default_factory=list
    )

    warnings: List[str] = Field(
        default_factory=list
    )

    errors: List[str] = Field(
        default_factory=list
    )

This gives your backend teammate a stable contract.

3. Base Agent
agents/base_agent.py
from __future__ import annotations

import logging
import time
from abc import ABC, abstractmethod
from typing import Any, Dict

from models.schemas import AgentResult


class BaseAgent(ABC):

    def __init__(
        self,
        name: str,
        version: str = "1.0.0",
    ):
        self.name = name
        self.version = version

        self.logger = logging.getLogger(
            f"agent.{name}"
        )

    def execute(
        self,
        context: Dict[str, Any],
    ) -> AgentResult:

        start = time.perf_counter()

        try:

            self.validate_context(context)

            result = self.run(context)

            elapsed = (
                time.perf_counter() - start
            )

            self.logger.info(
                "%s completed in %.3fs",
                self.name,
                elapsed,
            )

            return result

        except Exception as exc:

            self.logger.exception(
                "%s failed",
                self.name,
            )

            return AgentResult(
                agent=self.name,
                status="error",
                errors=[str(exc)],
            )

    def validate_context(
        self,
        context: Dict[str, Any],
    ) -> None:

        if not isinstance(context, dict):
            raise TypeError(
                "Agent context must be a dictionary."
            )

    @abstractmethod
    def run(
        self,
        context: Dict[str, Any],
    ) -> AgentResult:
        pass

Now all six agents behave consistently.

4. Skill Analysis Agent

This should be one of the first agents you implement.

agents/skill_analysis_agent.py
from __future__ import annotations

from typing import Any, Dict

from agents.base_agent import BaseAgent
from engines.skill_engine import SkillEngine
from engines.skill_gap_engine import SkillGapEngine
from models.schemas import (
    AgentResult,
    CandidateProfile,
    TargetRole,
)


class SkillAnalysisAgent(BaseAgent):

    def __init__(
        self,
        skill_engine: SkillEngine,
        gap_engine: SkillGapEngine,
    ):

        super().__init__(
            name="skill_analysis"
        )

        self.skill_engine = skill_engine
        self.gap_engine = gap_engine

    def run(
        self,
        context: Dict[str, Any],
    ) -> AgentResult:

        candidate = CandidateProfile.model_validate(
            context["candidate"]
        )

        target_role = TargetRole.model_validate(
            context["target_role"]
        )

        candidate_skills = [
            skill.model_dump()
            for skill in candidate.skills
        ]

        required_skills = [
            skill.model_dump()
            for skill in target_role.required_skills
        ]

        gaps = self.gap_engine.analyze(
            candidate_skills=candidate_skills,
            required_skills=required_skills,
        )

        strengths = [
            skill.model_dump()
            for skill in candidate.skills
            if skill.proficiency >= 0.70
        ]

        return AgentResult(
            agent=self.name,
            status="success",
            summary=(
                f"Analyzed skills for "
                f"{target_role.name}."
            ),
            data={
                "target_role": target_role.name,
                "strengths": strengths,
                "skill_gaps": gaps,
            },
        )

Notice something important:

The agent doesn't calculate the gap.

It delegates that to SkillGapEngine.

5. Career Research Agent
agents/career_research_agent.py
from __future__ import annotations

from typing import Any, Dict

from agents.base_agent import BaseAgent
from engines.market_engine import MarketEngine
from models.schemas import AgentResult


class CareerResearchAgent(BaseAgent):

    def __init__(
        self,
        market_engine: MarketEngine,
        retriever=None,
    ):

        super().__init__(
            name="career_research"
        )

        self.market_engine = market_engine
        self.retriever = retriever

    def run(
        self,
        context: Dict[str, Any],
    ) -> AgentResult:

        target_role = context.get(
            "target_role"
        )

        jobs = context.get(
            "jobs",
            [],
        )

        market = self.market_engine.analyze_skill_demand(
            jobs
        )

        alternatives = context.get(
            "career_alternatives",
            [],
        )

        evidence = []

        if self.retriever:

            documents = self.retriever.query(
                text=f"career path for {target_role}",
                collection="occupations",
                top_k=5,
            )

            evidence = [
                {
                    "title": doc.get(
                        "title",
                        "",
                    ),
                    "source": doc.get(
                        "source",
                        "",
                    ),
                }
                for doc in documents
            ]

        return AgentResult(
            agent=self.name,
            status="success",
            summary=(
                f"Career research completed "
                f"for {target_role}."
            ),
            data={
                "target_role": target_role,
                "market_demand": market,
                "career_alternatives": alternatives,
            },
            evidence=evidence,
        )

The important design choice here is that career research uses evidence, rather than letting an LLM hallucinate career information.

6. Learning Agent
agents/learning_agent.py
from __future__ import annotations

from typing import Any, Dict

from agents.base_agent import BaseAgent
from engines.recommendation_engine import (
    RecommendationEngine,
)
from models.schemas import AgentResult


class LearningAgent(BaseAgent):

    def __init__(
        self,
        recommendation_engine: RecommendationEngine,
    ):

        super().__init__(
            name="learning"
        )

        self.recommendation_engine = (
            recommendation_engine
        )

    def run(
        self,
        context: Dict[str, Any],
    ) -> AgentResult:

        gaps = context.get(
            "skill_gaps",
            [],
        )

        courses = context.get(
            "courses",
            [],
        )

        candidate_level = context.get(
            "candidate_level",
            "beginner",
        )

        recommendations = (
            self.recommendation_engine
            .recommend_courses(
                skill_gaps=gaps,
                courses=courses,
                candidate_level=candidate_level,
                top_k=10,
            )
        )

        sequence = self._build_sequence(
            recommendations
        )

        return AgentResult(
            agent=self.name,
            status="success",
            summary=(
                "Learning resources and "
                "sequence generated."
            ),
            data={
                "courses": recommendations,
                "learning_sequence": sequence,
            },
        )

    def _build_sequence(
        self,
        recommendations,
    ):

        return [
            {
                "step": index,
                "skill": self._course_primary_skill(
                    course
                ),
                "course": course.get(
                    "title",
                    "",
                ),
            }
            for index, course
            in enumerate(
                recommendations,
                start=1,
            )
        ]

    @staticmethod
    def _course_primary_skill(
        course,
    ):

        skills = course.get(
            "skills",
            [],
        )

        return skills[0] if skills else ""
7. Opportunity Agent
agents/opportunity_agent.py
from __future__ import annotations

from typing import Any, Dict

from agents.base_agent import BaseAgent
from engines.matching_engine import MatchingEngine
from models.schemas import (
    AgentResult,
    CandidateProfile,
)


class OpportunityAgent(BaseAgent):

    def __init__(
        self,
        matching_engine: MatchingEngine,
    ):

        super().__init__(
            name="opportunity"
        )

        self.matching_engine = matching_engine

    def run(
        self,
        context: Dict[str, Any],
    ) -> AgentResult:

        candidate = CandidateProfile.model_validate(
            context["candidate"]
        )

        opportunities = context.get(
            "opportunities",
            [],
        )

        candidate_data = self._candidate_to_matching_data(
            candidate
        )

        ranked = self.matching_engine.rank(
            candidate=candidate_data,
            opportunities=opportunities,
        )

        return AgentResult(
            agent=self.name,
            status="success",
            summary=(
                f"Ranked {len(ranked)} "
                "career opportunities."
            ),
            data={
                "opportunities": ranked
            },
        )

    def _candidate_to_matching_data(
        self,
        candidate: CandidateProfile,
    ) -> Dict:

        return {
            "skills": [
                skill.name
                for skill in candidate.skills
            ],
            "education": candidate.education,
            "experience_years": (
                candidate.experience_years
            ),
            "location": candidate.location,
            "career_gaps": [
                gap.model_dump()
                for gap in candidate.career_gaps
            ],
        }

Later we'll update your MatchingEngine so protected career gaps cannot negatively affect this score.

8. Industry Intelligence Agent
agents/industry_intelligence_agent.py
from __future__ import annotations

from typing import Any, Dict

from agents.base_agent import BaseAgent
from engines.market_engine import MarketEngine
from models.schemas import AgentResult


class IndustryIntelligenceAgent(BaseAgent):

    def __init__(
        self,
        market_engine: MarketEngine,
        retriever=None,
    ):

        super().__init__(
            name="industry_intelligence"
        )

        self.market_engine = market_engine
        self.retriever = retriever

    def run(
        self,
        context: Dict[str, Any],
    ) -> AgentResult:

        current_jobs = context.get(
            "current_jobs",
            [],
        )

        previous_jobs = context.get(
            "previous_jobs",
            [],
        )

        trends = self.market_engine.calculate_trends(
            current_jobs=current_jobs,
            previous_jobs=previous_jobs,
        )

        emerging = (
            self.market_engine.emerging_skills(
                trends
            )
        )

        return AgentResult(
            agent=self.name,
            status="success",
            summary=(
                "Industry trends and "
                "emerging skills analyzed."
            ),
            data={
                "trends": trends,
                "emerging_skills": emerging,
            },
        )

This directly corresponds to your SRS's industry-intelligence responsibilities.

9. Profile Intelligence Agent

This one is different because it looks at change over time.

agents/profile_intelligence_agent.py
from __future__ import annotations

from typing import Any, Dict

from agents.base_agent import BaseAgent
from engines.readiness_engine import ReadinessEngine
from engines.roadmap_engine import RoadmapEngine
from models.schemas import AgentResult


class ProfileIntelligenceAgent(BaseAgent):

    def __init__(
        self,
        readiness_engine: ReadinessEngine,
        roadmap_engine: RoadmapEngine,
    ):

        super().__init__(
            name="profile_intelligence"
        )

        self.readiness_engine = readiness_engine
        self.roadmap_engine = roadmap_engine

    def run(
        self,
        context: Dict[str, Any],
    ) -> AgentResult:

        candidate = context["candidate"]
        target_role = context["target_role"]

        readiness = (
            self.readiness_engine.calculate(
                candidate=candidate,
                target_role=target_role,
            )
        )

        roadmap = (
            self.roadmap_engine.generate(
                skill_gaps=context.get(
                    "skill_gaps",
                    [],
                ),
                courses=context.get(
                    "courses",
                    [],
                ),
                projects=context.get(
                    "projects",
                    [],
                ),
                target_role=target_role.get(
                    "name",
                    "",
                ),
            )
        )

        return AgentResult(
            agent=self.name,
            status="success",
            summary=(
                "Profile progress and "
                "career readiness analyzed."
            ),
            data={
                "readiness": readiness,
                "roadmap": roadmap,
                "project_count": len(
                    candidate.get(
                        "projects",
                        [],
                    )
                ),
            },
        )

This aligns with the SRS's requirement to track progress, projects, resume improvements and readiness.

10. Agent Orchestrator

This is the piece that makes your six agents a system rather than six unrelated scripts.

orchestrator/agent_orchestrator.py
from __future__ import annotations

from typing import Any, Dict

from models.schemas import AgentResult


class AgentOrchestrator:

    def __init__(
        self,
        career_research,
        skill_analysis,
        learning,
        opportunity,
        industry_intelligence,
        profile_intelligence,
    ):

        self.career_research = career_research
        self.skill_analysis = skill_analysis
        self.learning = learning
        self.opportunity = opportunity
        self.industry_intelligence = (
            industry_intelligence
        )
        self.profile_intelligence = (
            profile_intelligence
        )

    def run_career_analysis(
        self,
        context: Dict[str, Any],
    ) -> Dict[str, AgentResult]:

        results = {}

        # 1. Skill analysis
        results["skill_analysis"] = (
            self.skill_analysis.execute(
                context
            )
        )

        skill_result = results[
            "skill_analysis"
        ]

        if skill_result.status == "success":

            context["skill_gaps"] = (
                skill_result.data.get(
                    "skill_gaps",
                    [],
                )
            )

        # 2. Career research
        results["career_research"] = (
            self.career_research.execute(
                context
            )
        )

        # 3. Industry intelligence
        results["industry_intelligence"] = (
            self.industry_intelligence.execute(
                context
            )
        )

        # 4. Learning
        results["learning"] = (
            self.learning.execute(
                context
            )
        )

        learning_result = results["learning"]

        if learning_result.status == "success":

            context["recommended_courses"] = (
                learning_result.data.get(
                    "courses",
                    [],
                )
            )

        # 5. Opportunity matching
        results["opportunity"] = (
            self.opportunity.execute(
                context
            )
        )

        # 6. Profile intelligence
        results["profile_intelligence"] = (
            self.profile_intelligence.execute(
                context
            )
        )

        return results
11. But there's an even better approach

I would make the orchestration dependency-aware.

Instead of:

Agent 1
 ↓
Agent 2
 ↓
Agent 3
 ↓
Agent 4

use:

                    Candidate
                       │
          ┌────────────┴────────────┐
          ↓                         ↓
   Skill Analysis            Career Research
          │                         │
          ↓                         ↓
    Skill Gaps               Career Trends
          │                         │
          └────────────┬────────────┘
                       ↓
                 Industry Intel
                       │
             ┌─────────┴─────────┐
             ↓                   ↓
        Learning            Opportunity
             │                   │
             └─────────┬─────────┘
                       ↓
                Profile Intel
                       │
                       ↓
                    State

Why?

Because Career Research and Skill Analysis don't necessarily need to wait for each other.

Later you can run independent agents concurrently.

12. Don't put the LLM inside every agent

This is the biggest architectural improvement I'd make.

Use:

                  AGENT
                    │
        ┌───────────┼───────────┐
        ↓           ↓           ↓
     ENGINE       RAG        LLM
        │           │           │
     Numbers     Evidence    Explanation

For example:

Bad
Skill Analysis Agent
       ↓
LLM
       ↓
"Your Docker gap is 65%"
Good
Skill Analysis Agent
       ↓
SkillGapEngine
       ↓
Docker gap = 0.65
       ↓
RAG
       ↓
Evidence
       ↓
LLM
       ↓
"Your Docker proficiency is below the
target requirement because..."

That makes your system much easier to audit.

13. Add an evidence model

Your SRS specifically requires understandable reasons based on retrieved evidence.

So every agent should eventually return:

{
  "decision": "...",
  "reason": "...",
  "evidence": [
    {
      "source": "O*NET",
      "document_id": "123",
      "claim": "..."
    },
    {
      "source": "job_market",
      "document_id": "456",
      "claim": "..."
    }
  ]
}

This will be extremely useful when you're demonstrating the project.

14. Add an Agent Registry

Instead of manually importing everything everywhere:

agents/__init__.py
from .career_research_agent import (
    CareerResearchAgent,
)

from .skill_analysis_agent import (
    SkillAnalysisAgent,
)

from .learning_agent import (
    LearningAgent,
)

from .opportunity_agent import (
    OpportunityAgent,
)

from .industry_intelligence_agent import (
    IndustryIntelligenceAgent,
)

from .profile_intelligence_agent import (
    ProfileIntelligenceAgent,
)


__all__ = [
    "CareerResearchAgent",
    "SkillAnalysisAgent",
    "LearningAgent",
    "OpportunityAgent",
    "IndustryIntelligenceAgent",
    "ProfileIntelligenceAgent",
]
15. Your final agent responsibility matrix

This is how I'd document it in GitHub:

Agent	Primary responsibility	Uses
Career Research	Career paths, alternatives, trends	Market Engine + RAG
Skill Analysis	Candidate-vs-role skill analysis	Skill Engine + Skill Gap Engine
Learning	Courses, certifications, sequences	Recommendation Engine
Opportunity	Internship/job matching	Matching Engine
Industry Intelligence	Technology and skill trends	Market Engine + RAG
Profile Intelligence	Progress, projects, readiness	Readiness + Roadmap Engines

This follows the six-agent structure in your SRS.

16. One thing I would change from the previous version

Don't make this:

agents/
   career.py
   skills.py
   learning.py

where each file contains 500 lines of logic.

Instead:

Agent
  │
  ├── Engine
  ├── Retriever
  ├── optional LLM
  └── Schema

For example:

SkillAnalysisAgent
       │
       ├── SkillEngine
       ├── SkillGapEngine
       ├── Retriever
       └── LLM

The agent becomes a coordinator.

That's much easier for your teammate to integrate into the backend later.

What I would build next

Before you push this to GitHub, I'd do the implementation in this order:

PHASE 1
────────────────────────
Pydantic schemas
       ↓
SkillEngine
       ↓
SkillGapEngine
       ↓
SkillAnalysisAgent


PHASE 2
────────────────────────
RecommendationEngine
       ↓
LearningAgent

MatchingEngine
       ↓
OpportunityAgent


PHASE 3
────────────────────────
MarketEngine
       ↓
CareerResearchAgent
       ↓
IndustryIntelligenceAgent


PHASE 4
────────────────────────
ReadinessEngine
       ↓
RoadmapEngine
       ↓
ProfileIntelligenceAgent


PHASE 5
────────────────────────
RAG
       ↓
LLM explanation
       ↓
AgentOrchestrator
       ↓
Tests
       ↓
GitHub

And before calling this production-ready, we should fix the fairness logic you identified: your SRS explicitly says protected career interruptions must not reduce readiness or opportunity scores.

That should be built into the shared candidate/state model and scoring utilities rather than patched separately into individual agents.