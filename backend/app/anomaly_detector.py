import math
import numpy as np
from sqlalchemy.orm import Session
from backend.app.models import Candidate

def calculate_skill_density(skills_str: str, experience_years: float) -> float:
    """
    Computes density: (Total listed skills / max(experience_years, 0.5))
    Safe guard against experience_years close to or equal to zero.
    """
    # Count skills split by comma and strip whitespace
    if not skills_str or not skills_str.strip():
        return 0.0
        
    skills = [s.strip() for s in skills_str.split(",") if s.strip()]
    skills_count = len(skills)
    
    # Cap minimum experience at 0.5 years to avoid division by zero or inflation
    effective_experience = max(experience_years, 0.5)
    
    return float(skills_count / effective_experience)

def recalculate_z_scores(db: Session):
    """
    Retrieves all candidates from database, calculates density,
    computes global mean & standard deviation, updates Z-Scores,
    and flags anomalies where Z-Score > 2.5.
    """
    candidates = db.query(Candidate).all()
    if not candidates:
        return
        
    # Step 1: Calculate individual densities
    densities = []
    candidate_densities = []
    
    for c in candidates:
        density = calculate_skill_density(c.skills, c.experience_years)
        densities.append(density)
        candidate_densities.append((c, density))
        
    # If there's only 1 candidate or all have same density, std dev is 0, so Z-Score is 0
    if len(candidates) < 2:
        for c, d in candidate_densities:
            c.z_score = 0.0
            c.is_anomaly = False
        db.commit()
        return

    # Step 2: Compute mean and standard deviation
    mean_density = np.mean(densities)
    std_density = np.std(densities)
    
    # Safety Check: If std deviation is near zero, avoid division by zero
    if std_density < 1e-6:
        for c, d in candidate_densities:
            c.z_score = 0.0
            c.is_anomaly = False
        db.commit()
        return

    # Step 3: Compute Z-Scores and update models
    for c, density in candidate_densities:
        z = (density - mean_density) / std_density
        c.z_score = float(z)
        # Check Z-Score boundary
        if z > 2.5:
            c.is_anomaly = True
        else:
            c.is_anomaly = False
            
    db.commit()
