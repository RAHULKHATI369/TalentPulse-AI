import random
import datetime
from sqlalchemy.orm import Session
from backend.app.models import Candidate, InterviewLog

def generate_default_questions(skills: str) -> list:
    """
    Generates 3 customized interview questions based on the candidate's skills.
    """
    skill_list = [s.strip() for s in skills.split(",") if s.strip()]
    primary_skill = skill_list[0] if skill_list else "Software Engineering"
    secondary_skill = skill_list[1] if len(skill_list) > 1 else "Systems Architecture"
    
    questions = [
        f"Can you explain your hands-on experience with {primary_skill} and walk us through a challenging project where you successfully implemented it?",
        f"In your experience with {secondary_skill}, how do you structure testing and validation loops to verify the scalability of your systems?",
        "Describe a situation where you had a strong disagreement with a technical decision made by your team. How did you resolve the conflict and what was the outcome?"
    ]
    return questions

def dispatch_screening_link(candidate_id: int, db: Session) -> str:
    """
    Mocks the dispatching of an automated screening link.
    Creates a pending InterviewLog in the database and returns a mock link.
    """
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise ValueError("Candidate not found")
        
    # Check if a log already exists
    existing_log = db.query(InterviewLog).filter(InterviewLog.candidate_id == candidate_id).first()
    
    questions = generate_default_questions(candidate.skills)
    
    if existing_log:
        existing_log.status = "Pending"
        existing_log.question_1 = questions[0]
        existing_log.question_2 = questions[1]
        existing_log.question_3 = questions[2]
        existing_log.answer_1 = ""
        existing_log.answer_2 = ""
        existing_log.answer_3 = ""
        existing_log.simulated_performance_index = 0.0
        existing_log.completed_at = None
    else:
        new_log = InterviewLog(
            candidate_id=candidate_id,
            question_1=questions[0],
            question_2=questions[1],
            question_3=questions[2],
            status="Pending",
            simulated_performance_index=0.0
        )
        db.add(new_log)
        
    db.commit()
    
    # Generate mock URL
    mock_url = f"https://talentpulse.ai/screening/secure-wizard?token=tp_auth_token_usr_{candidate_id}"
    return mock_url

def evaluate_interview_responses(answers: list) -> float:
    """
    Simulates performance evaluation of answers. Returns a score between 0 and 100.
    In a real system, this would analyze response length, vocabulary, and sentiment.
    """
    if len(answers) < 3:
        return 0.0
        
    # Simple calculation: combination of answer lengths, variety of keywords, and random factors
    lengths = [len(a) for a in answers]
    base_score = 60.0 # start with passing base
    
    # Reward thorough answers (longer responses up to 500 characters)
    avg_length = sum(lengths) / len(lengths)
    length_bonus = min(20.0, avg_length / 25.0)
    
    # Reward keyword density representing technical depth (e.g. mock keywords search)
    buzzwords = ["scale", "architecture", "solve", "lead", "test", "collaborate", "metric", "deploy", "design"]
    keyword_count = 0
    for ans in answers:
        for word in buzzwords:
            if word in ans.lower():
                keyword_count += 1
                
    keyword_bonus = min(15.0, keyword_count * 2.5)
    
    # Add a slight random noise representing subjective assessment
    noise = random.uniform(-5.0, 5.0)
    
    final_score = base_score + length_bonus + keyword_bonus + noise
    return round(max(0.0, min(100.0, final_score)), 1)
