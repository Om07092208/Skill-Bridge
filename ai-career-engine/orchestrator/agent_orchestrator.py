from __future__ import annotations
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict
from agents import (
    CareerResearchAgent,
    SkillAnalysisAgent,
    LearningAgent,
    OpportunityAgent,
    IndustryIntelligenceAgent,
    ProfileIntelligenceAgent,
)
from models.schemas import AgentResult


class AgentOrchestrator:
    """Agent Orchestrator: Coordinates multi-agent workflow, managing context & shared intelligence state."""

    def __init__(
        self,
        career_research: CareerResearchAgent = None,
        skill_analysis: SkillAnalysisAgent = None,
        learning: LearningAgent = None,
        opportunity: OpportunityAgent = None,
        industry_intelligence: IndustryIntelligenceAgent = None,
        profile_intelligence: ProfileIntelligenceAgent = None,
    ):
        self.career_research = career_research or CareerResearchAgent()
        self.skill_analysis = skill_analysis or SkillAnalysisAgent()
        self.learning = learning or LearningAgent()
        self.opportunity = opportunity or OpportunityAgent()
        self.industry_intelligence = industry_intelligence or IndustryIntelligenceAgent()
        self.profile_intelligence = profile_intelligence or ProfileIntelligenceAgent()

    def _safe_execute(self, agent_name: str, agent_obj: Any, context: Dict[str, Any]) -> AgentResult:
        """Finding #20: Exception isolation helper preventing total pipeline failure if one agent errors."""
        try:
            res = agent_obj.execute(context)
            if not isinstance(res, AgentResult):
                return AgentResult(
                    agent=agent_name,
                    status="error",
                    summary=f"Agent {agent_name} returned non-standard result object.",
                    errors=["Invalid AgentResult returned"],
                )
            return res
        except Exception as exc:
            return AgentResult(
                agent=agent_name,
                status="error",
                summary=f"Agent {agent_name} encountered an exception.",
                errors=[str(exc)],
            )

    @staticmethod
    def _safe_data(result: AgentResult) -> Dict[str, Any]:
        """Finding #21: Safe dictionary extractor for agent results."""
        if not result or result.status not in ("success", "partial"):
            return {}
        return result.data if isinstance(result.data, dict) else {}

    def run_career_pipeline(self, initial_context: Dict[str, Any]) -> Dict[str, Any]:
        """Executes six-agent pipeline sequentially with safe state assembly."""
        context = dict(initial_context)
        agent_results: Dict[str, AgentResult] = {}

        # 1. Skill Analysis Agent
        skill_res = self._safe_execute("skill_analysis", self.skill_analysis, context)
        agent_results["skill_analysis"] = skill_res
        skill_data = self._safe_data(skill_res)
        context["skill_gaps"] = skill_data.get("skill_gaps", [])
        context["strengths"] = skill_data.get("strengths", [])

        # 2. Career Research Agent
        career_res = self._safe_execute("career_research", self.career_research, context)
        agent_results["career_research"] = career_res
        context["career_research"] = self._safe_data(career_res)

        # 3. Industry Intelligence Agent
        industry_res = self._safe_execute("industry_intelligence", self.industry_intelligence, context)
        agent_results["industry_intelligence"] = industry_res
        context["industry_intelligence"] = self._safe_data(industry_res)

        # 4. Learning Agent
        learning_res = self._safe_execute("learning", self.learning, context)
        agent_results["learning"] = learning_res
        learning_data = self._safe_data(learning_res)
        context["recommended_courses"] = learning_data.get("recommended_courses", [])
        context["learning_plan"] = learning_data.get("learning_plan", [])

        # 5. Opportunity Agent
        opportunity_res = self._safe_execute("opportunity", self.opportunity, context)
        agent_results["opportunity"] = opportunity_res
        context["opportunities"] = self._safe_data(opportunity_res)

        # 6. Profile Intelligence Agent
        profile_res = self._safe_execute("profile_intelligence", self.profile_intelligence, context)
        agent_results["profile_intelligence"] = profile_res

        return self._assemble_state(context, agent_results)

    async def run_career_pipeline_async(self, initial_context: Dict[str, Any]) -> Dict[str, Any]:
        """Priority 5 Upgrade: Async Parallel Orchestration via ThreadPoolExecutor & asyncio.gather() for 2-3x speedup."""
        context = dict(initial_context)
        agent_results: Dict[str, AgentResult] = {}
        loop = asyncio.get_running_loop()

        with ThreadPoolExecutor(max_workers=6) as executor:
            # Parallel Phase 1: Skill Analysis, Career Research, Industry Intelligence
            f_skill = loop.run_in_executor(executor, self._safe_execute, "skill_analysis", self.skill_analysis, context)
            f_career = loop.run_in_executor(executor, self._safe_execute, "career_research", self.career_research, context)
            f_industry = loop.run_in_executor(executor, self._safe_execute, "industry_intelligence", self.industry_intelligence, context)

            skill_res, career_res, industry_res = await asyncio.gather(f_skill, f_career, f_industry)

            agent_results["skill_analysis"] = skill_res
            agent_results["career_research"] = career_res
            agent_results["industry_intelligence"] = industry_res

            skill_data = self._safe_data(skill_res)
            context["skill_gaps"] = skill_data.get("skill_gaps", [])
            context["strengths"] = skill_data.get("strengths", [])
            context["career_research"] = self._safe_data(career_res)
            context["industry_intelligence"] = self._safe_data(industry_res)

            # Parallel Phase 2: Learning & Opportunity
            f_learning = loop.run_in_executor(executor, self._safe_execute, "learning", self.learning, context)
            f_opp = loop.run_in_executor(executor, self._safe_execute, "opportunity", self.opportunity, context)

            learning_res, opportunity_res = await asyncio.gather(f_learning, f_opp)

            agent_results["learning"] = learning_res
            agent_results["opportunity"] = opportunity_res

            learning_data = self._safe_data(learning_res)
            context["recommended_courses"] = learning_data.get("recommended_courses", [])
            context["learning_plan"] = learning_data.get("learning_plan", [])
            context["opportunities"] = self._safe_data(opportunity_res)

            # Phase 3: Profile Intelligence
            profile_res = await loop.run_in_executor(executor, self._safe_execute, "profile_intelligence", self.profile_intelligence, context)
            agent_results["profile_intelligence"] = profile_res

        return self._assemble_state(context, agent_results)

    def _assemble_state(self, context: Dict[str, Any], agent_results: Dict[str, AgentResult]) -> Dict[str, Any]:
        """Assembles consolidated state safely."""
        career_data = self._safe_data(agent_results.get("career_research"))
        industry_data = self._safe_data(agent_results.get("industry_intelligence"))
        learning_data = self._safe_data(agent_results.get("learning"))
        opportunity_data = self._safe_data(agent_results.get("opportunity"))
        profile_data = self._safe_data(agent_results.get("profile_intelligence"))

        return {
            "candidate_id": context.get("candidate", {}).get("candidate_id", "unknown"),
            "target_role": context.get("target_role", {}).get("name", "Target Role"),
            "agent_summaries": {name: res.summary for name, res in agent_results.items() if res},
            "agent_explanations": {
                name: self._safe_data(res).get("explanation", "")
                for name, res in agent_results.items()
                if res and self._safe_data(res).get("explanation")
            },
            "strengths": context.get("strengths", []),
            "skill_gaps": context.get("skill_gaps", []),
            "career_paths": career_data.get("career_paths", []),
            "skill_trends": industry_data.get("skill_trends", []),
            "emerging_skills": industry_data.get("emerging_skills", []),
            "learning_plan": learning_data.get("learning_plan", []),
            "certifications": learning_data.get("certifications", []),
            "matched_opportunities": opportunity_data.get("matched_opportunities", []),
            "readiness": profile_data.get("readiness", {}),
            "roadmap": profile_data.get("roadmap", []),
        }
