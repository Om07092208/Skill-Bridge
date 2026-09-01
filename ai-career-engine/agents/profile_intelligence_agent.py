from __future__ import annotations
from typing import Any, Dict
from agents.base_agent import BaseAgent
from engines.readiness_engine import ReadinessEngine
from engines.roadmap_engine import RoadmapEngine
from models.schemas import AgentResult, CandidateProfile, TargetRole


class ProfileIntelligenceAgent(BaseAgent):
    """Profile Intelligence Agent: Tracks user progress, evaluates project additions, and monitors continuous career readiness."""

    def __init__(
        self,
        readiness_engine: ReadinessEngine = None,
        roadmap_engine: RoadmapEngine = None,
    ):
        super().__init__(name="profile_intelligence")
        self.readiness_engine = readiness_engine or ReadinessEngine()
        self.roadmap_engine = roadmap_engine or RoadmapEngine()

    def run(self, context: Dict[str, Any]) -> AgentResult:
        cand_dict = context.get("candidate", {})
        target_dict = context.get("target_role", {})

        candidate = CandidateProfile.model_validate(cand_dict) if isinstance(cand_dict, dict) else cand_dict
        target_role = TargetRole.model_validate(target_dict) if isinstance(target_dict, dict) else target_dict

        # Calculate readiness score deterministically
        readiness_data = self.readiness_engine.calculate(
            candidate=candidate.model_dump(),
            target_role=target_role.model_dump(),
        )

        # Generate sequenced roadmap
        skill_gaps = context.get("skill_gaps", [])
        recommended_courses = context.get("recommended_courses", [])
        
        roadmap = self.roadmap_engine.generate(
            skill_gaps=skill_gaps,
            courses=recommended_courses,
            projects=[p.model_dump() for p in candidate.projects],
            target_role=target_role.name,
        )

        # Generate LLM Career Readiness Coaching Summary
        prompt = (
            f"Evaluate candidate overall career readiness score: {readiness_data.get('readiness_score', 0)}% ({readiness_data.get('status', 'In Progress')}). "
            f"Skill Readiness: {readiness_data.get('skill_readiness', 0)}%, Project Readiness: {readiness_data.get('project_readiness', 0)}%. "
            f"Provide a 2-sentence motivational career coaching guidance note on achieving full interview readiness."
        )
        explanation = self.llm.generate_explanation(
            prompt=prompt,
            system_instruction="You are a Senior Executive Career Readiness Coach."
        )

        return AgentResult(
            agent=self.name,
            status="success",
            summary=f"Profile intelligence updated: overall career readiness is {readiness_data['readiness_score']}%.",
            data={
                "readiness": readiness_data,
                "roadmap": roadmap,
                "project_count": len(candidate.projects),
                "completed_courses_count": len(candidate.courses_completed),
                "explanation": explanation,
            },
        )

