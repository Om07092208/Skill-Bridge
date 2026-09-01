from __future__ import annotations
from typing import Any, Dict
from agents.base_agent import BaseAgent
from engines.market_engine import MarketEngine
from models.schemas import AgentResult


class IndustryIntelligenceAgent(BaseAgent):
    """Industry Intelligence Agent: Monitors technology trends, analyzes changing skill requirements, and identifies emerging tools."""

    def __init__(self, market_engine: MarketEngine = None):
        super().__init__(name="industry_intelligence")
        self.market_engine = market_engine or MarketEngine()

    def run(self, context: Dict[str, Any]) -> AgentResult:
        jobs = context.get("jobs", [])
        trends = self.market_engine.calculate_trends(current_jobs=jobs)
        emerging = self.market_engine.emerging_skills(trends)

        insights = [
            f"Demand for {skill} is increasing across target role postings. Prioritize in roadmap."
            for skill in emerging
        ]

        # Generate LLM Industry Market Trend Intelligence Synthesis
        prompt = (
            f"Synthesize current market technology trends. "
            f"Emerging in-demand skills: {', '.join(emerging) if emerging else 'Standard data stack'}. "
            f"Summarize the industry shift and why these tools are vital in 2 sentences."
        )
        explanation = self.llm.generate_explanation(
            prompt=prompt,
            system_instruction="You are an Industry Market & Technology Trend Analyst."
        )

        return AgentResult(
            agent=self.name,
            status="success",
            summary=f"Analyzed industry market intelligence: identified {len(trends)} skill trends and {len(emerging)} emerging tools.",
            data={
                "skill_trends": trends,
                "emerging_skills": emerging,
                "insights": insights,
                "explanation": explanation,
            },
        )

