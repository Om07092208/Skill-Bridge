from __future__ import annotations
from typing import Any, Dict
from agents.base_agent import BaseAgent
from engines.matching_engine import MatchingEngine
from models.schemas import AgentResult, CandidateProfile


class OpportunityAgent(BaseAgent):
    """Opportunity Agent: Matches internships and jobs, calculates sub-score compatibility, and provides explainable match criteria."""

    def __init__(self, matching_engine: MatchingEngine = None):
        super().__init__(name="opportunity")
        self.matching_engine = matching_engine or MatchingEngine()

    def run(self, context: Dict[str, Any]) -> AgentResult:
        cand_dict = context.get("candidate", {})
        candidate = CandidateProfile.model_validate(cand_dict) if isinstance(cand_dict, dict) else cand_dict
        opportunities = context.get("opportunities", [])

        # Default sample opportunities if none provided
        if not opportunities:
            opportunities = [
                {
                    "title": "Machine Learning Engineer",
                    "company": "TechCorp Solutions",
                    "required_skills": ["Python", "SQL", "Pandas", "Docker"],
                    "preferred_skills": ["MLOps", "Kubernetes", "AWS"],
                    "experience_required": 1.0,
                    "education_required": "Bachelor",
                    "location": "Remote",
                },
                {
                    "title": "Junior Data Scientist",
                    "company": "DataDynamics",
                    "required_skills": ["Python", "SQL", "Pandas"],
                    "preferred_skills": ["Scikit-Learn", "Docker"],
                    "experience_required": 0.0,
                    "education_required": "Bachelor",
                    "location": "Remote",
                },
                {
                    "title": "MLOps Engineer Intern",
                    "company": "AI Innovations Lab",
                    "required_skills": ["Python", "Docker"],
                    "preferred_skills": ["Kubernetes", "CI/CD"],
                    "experience_required": 0.0,
                    "education_required": "Bachelor",
                    "location": "Hybrid",
                },
            ]

        matching_cand_data = {
            "skills": [s.model_dump() for s in candidate.skills],
            "education": candidate.education,
            "experience_years": candidate.experience_years,
            "location": candidate.location,
            "career_gaps": [g.model_dump() for g in candidate.career_gaps],
        }


        target_dict = context.get("target_role", {})
        target_role_name = target_dict.get("name", "") if isinstance(target_dict, dict) else (target_dict.name if hasattr(target_dict, "name") else "")

        ranked_opportunities = self.matching_engine.rank(
            candidate=matching_cand_data,
            opportunities=opportunities,
            target_role_name=target_role_name,
        )

        # Generate LLM Match Criteria Explanation for Top Matching Opportunity
        top_job = ranked_opportunities[0] if ranked_opportunities else {}
        prompt = (
            f"Explain job match compatibility for top opportunity '{top_job.get('title', 'Target Job')}' at '{top_job.get('company', 'Company')}'. "
            f"Overall Compatibility Score: {top_job.get('compatibility_score', 0)}%. "
            f"Key matching highlights: {', '.join(top_job.get('why_matched', []))}. "
            f"Identified gaps: {', '.join(top_job.get('gaps', []))}. "
            f"Provide a 2-sentence rationale for candidate application strategic positioning."
        )
        explanation = self.llm.generate_explanation(
            prompt=prompt,
            system_instruction="You are an AI Recruitment & Candidate Matching Strategist."
        )

        return AgentResult(
            agent=self.name,
            status="success",
            summary=f"Ranked {len(ranked_opportunities)} matching opportunities based on candidate skills, experience, and education.",
            data={
                "matched_opportunities": ranked_opportunities,
                "explanation": explanation,
            },
        )

