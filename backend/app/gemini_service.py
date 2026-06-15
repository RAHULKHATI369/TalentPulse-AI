import json
import logging
import random
import numpy as np
import google.generativeai as genai
from backend.app.config import settings

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("GeminiService")

# Initialize Gemini SDK
is_mock_mode = False
if not settings.gemini_api_key or "your_gemini" in settings.gemini_api_key or settings.gemini_api_key == "mock_api_key":
    logger.warning("No valid GEMINI_API_KEY found. Operating in MOCK/FALLBACK mode.")
    is_mock_mode = True
else:
    try:
        genai.configure(api_key=settings.gemini_api_key)
    except Exception as e:
        logger.error(f"Failed to configure Gemini SDK: {e}. Switching to Mock mode.")
        is_mock_mode = True

async def generate_candidate_tone_and_persona(name: str, skills: str, resume_text: str = "") -> str:
    """
    Evaluates the candidate's skills and resume narrative using Gemini 1.5 Pro
    to assign one of the specific personas: [Leadership, Solo Builder, Critical Thinker, Collaborator].
    """
    context = f"Candidate Name: {name}\nSkills: {skills}\nResume Text: {resume_text or 'Not Provided'}"
    
    if is_mock_mode:
        # Fallback simulation
        personas = ["Leadership", "Solo Builder", "Critical Thinker", "Collaborator"]
        # Seed slightly by candidate name to be deterministic-ish
        idx = sum(ord(c) for c in name) % len(personas)
        return personas[idx]

    prompt = (
        "You are an expert Talent Acquisition AI. Analyze the following candidate profile narrative and skills list. "
        "Determine which of the following cultural/vibe personas best fits the candidate:\n"
        "1. Leadership (shows guidance, management, vision, leading teams)\n"
        "2. Solo Builder (highly technical, individual contributor, thrives on solo delivery)\n"
        "3. Critical Thinker (strong analytical, research-oriented, problem solver, strategic)\n"
        "4. Collaborator (team player, communicator, integrates systems and processes)\n\n"
        f"Profile details:\n{context}\n\n"
        "Response requirement: Output exactly one word from this list: [Leadership, Solo Builder, Critical Thinker, Collaborator]. "
        "Do not include any punctuation, explanation, or extra characters."
    )

    try:
        model = genai.GenerativeModel('gemini-1.5-pro')
        # We run the synchronous call in an executor block if using sync sdk
        # Or use generate_content_async
        response = await model.generate_content_async(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.2,
                max_output_tokens=10
            )
        )
        persona = response.text.strip()
        # Verify result is one of the valid options
        valid_personas = ["Leadership", "Solo Builder", "Critical Thinker", "Collaborator"]
        for p in valid_personas:
            if p.lower() in persona.lower():
                return p
        return "Collaborator"  # Default fallback
    except Exception as e:
        logger.error(f"Gemini tone generation failed: {e}. Falling back to simulation.")
        personas = ["Leadership", "Solo Builder", "Critical Thinker", "Collaborator"]
        idx = sum(ord(c) for c in name) % len(personas)
        return personas[idx]

async def generate_why_this_candidate_report(name: str, skills: str, experience_years: float, persona: str, job_desc: str = None) -> str:
    """
    Generates a structured report detailing: **Pros**, **Cons**, and **Alignment Reason**
    for the candidate using Gemini 1.5 Pro.
    """
    job_context = job_desc or "Senior Software Engineer with full-stack capabilities"
    context = (
        f"Candidate: {name}\n"
        f"Skills: {skills}\n"
        f"Experience: {experience_years} years\n"
        f"Assigned Persona: {persona}\n"
        f"Target Job Description: {job_context}"
    )

    if is_mock_mode:
        # Mock structured report
        return (
            f"### Evaluation Report for {name}\n\n"
            f"**Pros**:\n"
            f"- Strong technical stack matching requirements: {skills.split(',')[0] if skills else 'Software Development'}.\n"
            f"- Solid track record of {experience_years} years, matching the target expectations.\n"
            f"- Strong fit under the **{persona}** persona, indicating excellent organizational alignment.\n\n"
            f"**Cons**:\n"
            f"- Might need ramp-up time for customized proprietary framework deployments.\n"
            f"- Higher experience levels could mean higher salary expectations.\n\n"
            f"**Alignment Reason**:\n"
            f"- The candidate's skill concentration in {skills[:50]} aligns directly with the target job profile. "
            f"As a {persona}, they will integrate seamlessly and contribute immediately to engineering pipelines."
        )

    prompt = (
        "You are a Senior Principal Talent Assessor. Create a structured evaluation report "
        "for the following candidate. You must output Markdown format with bullet points under these exact headings:\n"
        "**Pros**\n"
        "**Cons**\n"
        "**Alignment Reason**\n\n"
        f"Candidate Context:\n{context}\n\n"
        "Ensure the summary is concise, highly professional, and addresses specific alignment factors."
    )

    try:
        model = genai.GenerativeModel('gemini-1.5-pro')
        response = await model.generate_content_async(
            prompt,
            generation_config=genai.types.GenerationConfig(temperature=0.7)
        )
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini report generation failed: {e}. Falling back to simulation.")
        return (
            f"### Evaluation Report for {name}\n\n"
            f"**Pros**:\n"
            f"- Demonstrates capability in {skills}.\n"
            f"**Cons**:\n"
            f"- Experience levels may require specific scaling alignment.\n"
            f"**Alignment Reason**:\n"
            f"- Matched as {persona} showing strong capability match."
        )

async def get_embedding_vector(text: str) -> list:
    """
    Asynchronously queries Google AI Studio API for embedding vectors matching `text-embedding-004`.
    Returns list of floats.
    """
    if not text:
        return [0.0] * 768

    if is_mock_mode:
        # Deterministic dummy embedding generation (768 float array)
        random.seed(hash(text))
        embedding = [random.uniform(-0.1, 0.1) for _ in range(768)]
        # Normalize vector
        norm = sum(x**2 for x in embedding)**0.5
        return [x/norm for x in embedding]

    try:
        # Wait, embed_content is a synchronous call in current google-generativeai
        # We can run it using loop.run_in_executor to avoid blocking the async event loop
        import asyncio
        loop = asyncio.get_event_loop()
        
        def call_embedding():
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=text,
                task_type="retrieval_document"
            )
            return result['embedding']
            
        embedding = await loop.run_in_executor(None, call_embedding)
        return embedding
    except Exception as e:
        logger.error(f"Gemini embedding API call failed: {e}. Falling back to mock embeddings.")
        random.seed(hash(text))
        embedding = [random.uniform(-0.1, 0.1) for _ in range(768)]
        norm = sum(x**2 for x in embedding)**0.5
        return [x/norm for x in embedding]

async def extract_structured_candidate_data(resume_text: str) -> dict:
    """
    Parses the raw resume text and extracts a structured JSON object containing candidate profiles,
    persona archetype vibes, and evaluation pros/cons in a single request.
    """
    if is_mock_mode:
        # Mock/Fallback extraction from text
        import re
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', resume_text)
        email = email_match.group(0) if email_match else "mock.candidate@example.com"
        
        # Simple name parser: first line
        lines = [l.strip() for l in resume_text.split("\n") if l.strip()]
        name = lines[0] if lines else "Candidate Name"
        if len(name) > 40:
            name = "Candidate Name"
            
        personas = ["Leadership", "Solo Builder", "Critical Thinker", "Collaborator"]
        idx = sum(ord(c) for c in name) % len(personas)
        pers = personas[idx]

        return {
            "name": name,
            "email": email,
            "experience_years": 4.5,
            "skills": "Python, SQL, AWS, FastAPI, Docker",
            "persona": pers,
            "pros": [
                "Demonstrates solid command over full-stack engineering environments.",
                f"Exhibits characteristics of the **{pers}** archetype, proving good team synergy."
            ],
            "cons": [
                "May require brief overview of target cloud infrastructure configs."
            ],
            "alignment_reason": f"Direct capability match for target technical roles as a {pers}."
        }

    # Prompt instructing Gemini to output strict JSON
    prompt = (
        "You are a Senior Technical Recruiter AI. Extract the candidate's core profile information "
        "and perform a behavioral vibe and report evaluation from the provided CV text as a JSON object. "
        "You MUST return a single JSON object containing exactly these keys and no others:\n"
        "- 'name': string, full name of the candidate\n"
        "- 'email': string, contact email address\n"
        "- 'experience_years': float, total years of professional experience (default to 0.0 if not listed)\n"
        "- 'skills': string, a comma-separated list of technical skills/keywords extracted\n"
        "- 'persona': string, which of these vibe/culture fit archetypes best fits the CV narrative: "
        "['Leadership' (guides, leads, manages), 'Solo Builder' (highly technical individual builder), "
        "'Critical Thinker' (analytical problem-solver), 'Collaborator' (team player, system integrator)]. Must be exactly one of those four words.\n"
        "- 'pros': list of strings, 2-3 key strengths of the candidate\n"
        "- 'cons': list of strings, 1-2 potential drawbacks or alignment gaps\n"
        "- 'alignment_reason': string, a summary statement detailing why they align with technical roles\n\n"
        f"Resume text content:\n{resume_text}"
    )

    try:
        model = genai.GenerativeModel('gemini-1.5-pro')
        response = await model.generate_content_async(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.1
            )
        )
        data = json.loads(response.text.strip())
        
        # Validate persona
        valid_personas = ["Leadership", "Solo Builder", "Critical Thinker", "Collaborator"]
        persona = data.get("persona", "Collaborator")
        matched_persona = next((p for p in valid_personas if p.lower() in persona.lower()), "Collaborator")
        
        return {
            "name": data.get("name", "Unknown Candidate"),
            "email": data.get("email", "unknown@example.com"),
            "experience_years": float(data.get("experience_years", 0.0)),
            "skills": data.get("skills", "Technical Skills"),
            "persona": matched_persona,
            "pros": data.get("pros", ["Strong technical background."]),
            "cons": data.get("cons", ["None specified."]),
            "alignment_reason": data.get("alignment_reason", "Aligned with standard roles.")
        }
    except Exception as e:
        logger.error(f"Gemini structured data extraction failed: {e}. Falling back to basic regex parser.")
        import re
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', resume_text)
        email = email_match.group(0) if email_match else f"parsed_fallback_{random.randint(10,99)}@example.com"
        return {
            "name": "Parsed Fallback Candidate",
            "email": email,
            "experience_years": 2.0,
            "skills": "FastAPI, Docker, SQL",
            "persona": "Collaborator",
            "pros": ["Capable software developer."],
            "cons": ["Requires standard on-boarding."],
            "alignment_reason": "General technical competency matched."
        }

def calculate_cosine_similarity(vec1: list, vec2: list) -> float:
    """
    Utility function to calculate cosine similarity between two float vectors.
    """
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0
    
    a = np.array(vec1)
    b = np.array(vec2)
    dot_product = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
        
    return float(dot_product / (norm_a * norm_b))
