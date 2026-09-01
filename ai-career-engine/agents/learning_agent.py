from __future__ import annotations
from typing import Any, Dict
from agents.base_agent import BaseAgent
from engines.recommendation_engine import RecommendationEngine
from models.schemas import AgentResult


class LearningAgent(BaseAgent):
    """Learning Agent: Finds relevant courses, recommends certifications, and generates sequenced learning plans."""

    def __init__(self, recommendation_engine: RecommendationEngine = None):
        super().__init__(name="learning")
        self.recommendation_engine = recommendation_engine or RecommendationEngine()

    def run(self, context: Dict[str, Any]) -> AgentResult:
        gaps = context.get("skill_gaps", [])
        courses = context.get("courses", [])

        # Default standard course catalog if none provided in context
        if not courses:
            courses = [
                {"title": "Docker Fundamentals & Containerization", "skills": ["Docker"], "platform": "Coursera", "duration_hours": 15, "rating": 4.8},
                {"title": "Kubernetes for Developers", "skills": ["Kubernetes"], "platform": "edX", "duration_hours": 20, "rating": 4.7},
                {"title": "Production MLOps Engineering", "skills": ["MLOps"], "platform": "Udemy", "duration_hours": 25, "rating": 4.9},
                {"title": "Advanced SQL for Data Science", "skills": ["SQL"], "platform": "DataCamp", "duration_hours": 10, "rating": 4.6},
            ]

        rec_courses = self.recommendation_engine.recommend_courses(
            skill_gaps=gaps,
            courses=courses,
            top_k=10,
        )

        # Generate sequenced learning steps
        learning_plan = []
        for idx, course in enumerate(rec_courses, start=1):
            learning_plan.append({
                "step": idx,
                "skill": course["primary_skill"],
                "course_title": course["title"],
                "platform": course["platform"],
                "priority": course["priority"],
                "duration_hours": course["duration_hours"],
            })

        certifications = [
            {"title": "Docker Certified Associate (DCA)", "target_skill": "Docker", "level": "Intermediate"},
            {"title": "Certified Kubernetes Application Developer (CKAD)", "target_skill": "Kubernetes", "level": "Advanced"},
            {"title": "AWS Certified Machine Learning - Specialty", "target_skill": "MLOps", "level": "Advanced"},
        ]

        # Generate LLM Learning Plan Sequencing Explanation
        top_skills = [lp["skill"] for lp in learning_plan[:3]]
        prompt = (
            f"Explain the learning path sequence for acquiring skills: {', '.join(top_skills)}. "
            f"Why is taking foundational prerequisite courses before advanced specialization critical for career transition success? "
            f"Provide a 2-sentence explanation."
        )
        explanation = self.llm.generate_explanation(
            prompt=prompt,
            system_instruction="You are an Expert Technical Curriculum & Learning Strategist."
        )

        return AgentResult(
            agent=self.name,
            status="success",
            summary=f"Generated {len(learning_plan)}-step sequenced learning plan and recommended {len(certifications)} certifications.",
            data={
                "learning_plan": learning_plan,
                "recommended_courses": rec_courses,
                "certifications": certifications,
                "explanation": explanation,
            },
        )

