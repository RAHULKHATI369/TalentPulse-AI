from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

# Candidate Schemas
class CandidateBase(BaseModel):
    name: str = Field(..., example="Alice Smith")
    email: EmailStr = Field(..., example="alice.smith@example.com")
    experience_years: float = Field(..., ge=0, example=5.5)
    skills: str = Field(..., example="Python, FastAPI, Docker, SQL, Machine Learning")
    resume_text: Optional[str] = Field(None, example="Passionate software engineer with 5 years experience...")

class CandidateCreate(CandidateBase):
    pass

class CandidateResponse(CandidateBase):
    id: int
    resume_tone: Optional[str] = None
    match_score: Optional[float] = 0.0
    z_score: Optional[float] = 0.0
    is_anomaly: Optional[bool] = False
    why_report: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Interview Log Schemas
class InterviewLogBase(BaseModel):
    question_1: Optional[str] = None
    answer_1: Optional[str] = None
    question_2: Optional[str] = None
    answer_2: Optional[str] = None
    question_3: Optional[str] = None
    answer_3: Optional[str] = None

class InterviewLogCreate(BaseModel):
    candidate_id: int

class InterviewLogUpdate(BaseModel):
    answer_1: str
    answer_2: str
    answer_3: str

class InterviewLogResponse(InterviewLogBase):
    id: int
    candidate_id: int
    simulated_performance_index: Optional[float] = 0.0
    status: str
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Match Request (when screening candidates against a specific job role)
class JobDescription(BaseModel):
    job_title: str = Field(..., example="Senior Full-Stack Engineer")
    requirements: str = Field(..., example="Expertise in FastAPI, SQL, MariaDB, Docker, and Generative AI services.")

# Dashboard stats schema
class DashboardStats(BaseModel):
    total_candidates: int
    total_anomalies: int
    completed_interviews: int
    average_performance_index: float
