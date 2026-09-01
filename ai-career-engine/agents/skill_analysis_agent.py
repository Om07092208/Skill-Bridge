from __future__ import annotations
from typing import Any, Dict
from agents.base_agent import BaseAgent
from engines.skill_engine import SkillEngine
from engines.skill_gap_engine import SkillGapEngine
from models.schemas import AgentResult, CandidateProfile, TargetRole


class SkillAnalysisAgent(BaseAgent):
    """Skill Analysis Agent: Compares candidate skills with target role requirements, identifies missing skills, and prioritizes gaps."""

    def __init__(
        self,
        skill_engine: SkillEngine = None,
        gap_engine: SkillGapEngine = None,
    ):
        super().__init__(name="skill_analysis")
        self.skill_engine = skill_engine or SkillEngine()
        self.gap_engine = gap_engine or SkillGapEngine()

    def run(self, context: Dict[str, Any]) -> AgentResult:
        cand_dict = context.get("candidate", {})
        target_dict = context.get("target_role", {})

        candidate = CandidateProfile.model_validate(cand_dict) if isinstance(cand_dict, dict) else cand_dict
        target_role = TargetRole.model_validate(target_dict) if isinstance(target_dict, dict) else target_dict

        # 1. Process candidate skills with recency & evidence weighting
        processed_cand_skills = self.skill_engine.process_candidate_skills(
            [s.model_dump() for s in candidate.skills]
        )

        # 2. Process required/preferred skills
        required_skills = [s.model_dump() for s in target_role.required_skills]
        preferred_skills = [s.model_dump() for s in target_role.preferred_skills]

        # 3. Calculate skill gaps deterministically via SkillGapEngine
        gaps = self.gap_engine.analyze(
            candidate_skills=[s.model_dump() for s in processed_cand_skills],
            required_skills=required_skills,
            preferred_skills=preferred_skills,
            candidate_experience_years=candidate.experience_years,
        )


        # Categorize strengths (>= 70%) and moderate skills (40-69%)
        strengths = [s.model_dump() for s in processed_cand_skills if s.proficiency >= 0.70]
        moderate = [s.model_dump() for s in processed_cand_skills if 0.40 <= s.proficiency < 0.70]

        # Generate LLM Natural Language Strategic Skill Analysis
        gap_names = [g.get("skill", "") for g in gaps[:5]]
        strength_names = [s.get("name", "") for s in strengths[:5]]
        prompt = (
            f"Analyze skill alignment for target role '{target_role.name}'. "
            f"Candidate Strengths: {', '.join(strength_names) if strength_names else 'None'}. "
            f"Key Skill Gaps: {', '.join(gap_names) if gap_names else 'None'}. "
            f"Provide a concise 2-sentence strategic summary on how to leverage strengths to bridge gaps."
        )
        explanation = self.llm.generate_explanation(
            prompt=prompt,
            system_instruction="You are an expert AI Career Skill Analyst."
        )

        return AgentResult(
            agent=self.name,
            status="success",
            summary=f"Skill analysis completed for target role: {target_role.name}. Identified {len(strengths)} strengths and {len(gaps)} skill gaps.",
            data={
                "target_role": target_role.name,
                "strengths": strengths,
                "moderate_skills": moderate,
                "skill_gaps": gaps,
                "explanation": explanation,
            },
            evidence=[
                {"source": "O*NET / ESCO Framework", "claim": f"Mapped requirements for {target_role.name}"}
            ]
        )

