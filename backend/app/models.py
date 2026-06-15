import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    experience_years = Column(Float, nullable=False, default=0.0)
    skills = Column(Text, nullable=False)  # Stores comma-separated values or stringified JSON list
    resume_text = Column(Text(length=16777215), nullable=True)  # MEDIUMTEXT or LONGTEXT equivalent
    resume_tone = Column(String(100), nullable=True)  # mapped to specific personas (Leadership, Solo Builder, Critical Thinker, Collaborator)
    match_score = Column(Float, nullable=True, default=0.0)
    z_score = Column(Float, nullable=True, default=0.0)
    is_anomaly = Column(Boolean, nullable=True, default=False)
    why_report = Column(Text, nullable=True)  # Markdown: Pros, Cons, Alignment Reason
    embedding = Column(Text(length=16777215), nullable=True)  # Stringified JSON float list
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationship to interview simulation log
    interviews = relationship("InterviewLog", back_populates="candidate", cascade="all, delete-orphan")


class InterviewLog(Base):
    __tablename__ = "interview_logs"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    
    question_1 = Column(Text, nullable=True)
    answer_1 = Column(Text, nullable=True)
    question_2 = Column(Text, nullable=True)
    answer_2 = Column(Text, nullable=True)
    question_3 = Column(Text, nullable=True)
    answer_3 = Column(Text, nullable=True)
    
    simulated_performance_index = Column(Float, nullable=True, default=0.0)
    status = Column(String(50), nullable=False, default="Pending")  # 'Completed', 'Pending'
    completed_at = Column(DateTime, nullable=True)

    candidate = relationship("Candidate", back_populates="interviews")
