from __future__ import annotations
from typing import Dict, List, Any


class RoadmapEngine:
    """Deterministic engine to construct sequenced learning & project roadmaps."""

    def generate(
        self,
        skill_gaps: List[Dict[str, Any]],
        courses: List[Dict[str, Any]] = None,
        projects: List[Dict[str, Any]] = None,
        target_role: str = "Target Role",
    ) -> List[Dict[str, Any]]:
        """Generates sequenced roadmap steps based on prioritized skill gaps and candidate projects."""
        courses = courses or []
        projects = projects or []
        roadmap = []

        # Finding #15: Sort gaps by priority sequence (high -> medium -> low)
        priority_rank = {"high": 0, "medium": 1, "low": 2}
        ordered_gaps = sorted(
            skill_gaps,
            key=lambda g: (priority_rank.get(str(g.get("priority", "medium")).lower(), 1), -float(g.get("gap", 0.0)))
        )

        step_counter = 1
        for gap in ordered_gaps:
            skill_name = gap.get("skill", "Required Skill")
            prio = gap.get("priority", "medium")

            matching_course = next(
                (c for c in courses if c.get("primary_skill", "").lower() == skill_name.lower()),
                None
            )
            course_title = matching_course.get("title") if matching_course else f"{skill_name} Fundamentals & Best Practices"

            # Finding #16: Match candidate projects to gap skills to create specific project milestones
            matching_proj = next(
                (
                    p for p in projects
                    if any(skill_name.lower() in str(s).lower() for s in p.get("skills", []))
                ),
                None
            )

            if matching_proj:
                proj_name = matching_proj.get("name", "Hands-on Project")
                milestone_text = f"Expand '{proj_name}' by integrating production-grade {skill_name}"
            else:
                milestone_text = f"Build portfolio project showcasing {skill_name} implementation"

            roadmap.append({
                "step": step_counter,
                "title": f"Master {skill_name}",
                "skill": skill_name,
                "priority": prio,
                "action": f"Complete '{course_title}'",
                "milestone": milestone_text,
                "target_role": target_role,
            })
            step_counter += 1

        if not roadmap:
            roadmap.append({
                "step": 1,
                "title": "Role Consolidation",
                "skill": "Advanced Skills",
                "priority": "low",
                "action": "Build portfolio project showcasing target role competencies",
                "milestone": "Submit applications for target role",
                "target_role": target_role,
            })

        return roadmap
