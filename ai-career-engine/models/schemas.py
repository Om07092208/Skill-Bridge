from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

Priority = Literal["high", "medium", "low"]


class Skill(BaseModel):
    name: str
    normalized_name: str = ""
    proficiency: float = Field(default=0.0, ge=0.0, le=1.0)
    experience_months: int = Field(default=0, ge=0)
    evidence: List[str] = Field(default_factory=list)
    project_evidence: int = Field(default=0, ge=0)
    course_completion: float = Field(default=0.0, ge=0.0, le=1.0)
    recency_score: float = Field(default=1.0, ge=0.0, le=1.0)


class CareerGap(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    duration_months: int = Field(default=0, ge=0)
    reason: str = "unspecified"
    # Protected gaps must never reduce readiness or opportunity scores, but do not inflate actual experience years.
    protected: bool = False


class Project(BaseModel):
    name: str
    description: str = ""
    skills: List[str] = Field(default_factory=list)
    outcomes: List[str] = Field(default_factory=list)


class CandidateProfile(BaseModel):
    candidate_id: str
    name: str = ""
    current_role: str = ""
    education: List[str] = Field(default_factory=list)
    skills: List[Skill] = Field(default_factory=list)
    experience_years: float = 0.0
    projects: List[Project] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    courses_completed: List[str] = Field(default_factory=list)
    location: str = ""
    target_roles: List[str] = Field(default_factory=list)
    preferences: Dict[str, Any] = Field(default_factory=dict)
    career_gaps: List[CareerGap] = Field(default_factory=list)


class TargetRole(BaseModel):
    name: str
    required_skills: List[Skill] = Field(default_factory=list)
    preferred_skills: List[Skill] = Field(default_factory=list)
    experience_min: float = 0.0
    education_requirements: List[str] = Field(default_factory=list)


class SkillGap(BaseModel):
    skill: str
    required_level: float
    current_level: float
    gap: float
    priority: Priority
    evidence: List[str] = Field(default_factory=list)


class AgentResult(BaseModel):
    agent: str
    status: Literal["success", "partial", "error"]
    summary: str = ""
    data: Dict[str, Any] = Field(default_factory=dict)
    evidence: List[Dict[str, Any]] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
