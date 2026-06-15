# TalentPulse AI - Enterprise Candidate Screening Platform

TalentPulse AI is a production-grade enterprise candidate evaluation and screening application powered by Google AI Studio (Gemini 1.5 Pro and text-embedding-004), a FastAPI backend, a MariaDB database instance, and a high-fidelity 3D Glassmorphic frontend dashboard.

## Key Features

1. **Vibe & Culture Fit Scanner**: Evaluates candidates' resume tone and mapping profiles to specific personas (`Leadership`, `Solo Builder`, `Critical Thinker`, `Collaborator`) using Gemini 1.5 Pro.
2. **Fake Experience Anomaly Detector**: Standardizes metrics and computes Z-Scores on candidates' skill densities. Highlights outliers (> 2.5 standard deviations) as anomalies.
3. **Multi-Agent Interview Simulator**: Custom generates screening questions and mock-dispatches invitations, rendering an interactive 3-question secure interview wizard in the dashboard to record simulated performances.
4. **Automated Evaluation Reports**: Utilizes Gemini 1.5 Pro to generate structured **Pros**, **Cons**, and **Alignment Reason** reports in Markdown format.
5. **Dynamic Scaling & Integration Hooks**: Implements async hooks to interface with external evaluation loops (Hugging Face `ml-intern`) and evaluates load levels to execute mocked replica scaling configurations.

---

## Architecture Diagram

```
                 [ 3D Glassmorphic Frontend SPA ]
                                |
                     (HTTP REST & JSON APIs)
                                |
                   [ FastAPI Backend Service ]
                 /              |              \
                /               |               \
     [ Google AI Studio ]   [ MariaDB ]   [ ml-intern Hooks ]
     - Gemini 1.5 Pro       - Candidates  - Scaling Evaluation
     - text-embedding-004   - Interviews  - Validation Callback
```

---

## Getting Started

### Prerequisites
- Docker & Docker Compose
- A Google AI Studio API Key (Obtain from [Google AI Studio](https://aistudio.google.com/))

### Environment Configurations
1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open the `.env` file and insert your Google Gemini API Key:
   ```env
   GEMINI_API_KEY=AIzaSy...YourActualGeminiAPIKey
   ```

---

## Deployment (Docker Compose)

The simplest and recommended way to start the system is through Docker Compose, which spins up both the MariaDB database and the application container in an isolated network:

1. **Build and start the containers**:
   ```bash
   docker-compose up --build
   ```
2. **Access the application**:
   Open your browser and navigate to `http://localhost:8000/` to launch the 3D Glassmorphic Dashboard.
3. **Database Port Access**:
   The MariaDB instance is exposed locally on port `3306` with user `talentpulse_user` and password `talentpulse_password`.

---

## Local Development Setup

If you prefer to run the application server locally outside Docker:

1. **Create and activate a virtual environment**:
   ```bash
   python -m venv venv
   # On Windows (PowerShell)
   .\venv\Scripts\Activate.ps1
   # On macOS/Linux
   source venv/bin/activate
   ```
2. **Install dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. **Run MariaDB locally** (or utilize the dockerized MariaDB service):
   ```bash
   # Run only the database container
   docker-compose up -d db
   ```
4. **Modify local .env file** (adjust host from `db` to `localhost`):
   ```env
   DATABASE_URL=mysql+pymysql://talentpulse_user:talentpulse_password@localhost:3306/talentpulse_db
   ```
5. **Start the FastAPI application**:
   ```bash
   uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
   ```

---

## Git Repository Integration Guidelines

When pushing modifications back to enterprise repositories, utilize standard workflow conventions:

```bash
# 1. Stage modified components
git add backend/ frontend/ Dockerfile docker-compose.yml

# 2. Commit changes with semantic tags
git commit -m "feat(core): integrated gemini 1.5 pro, z-score math, and 3d glassmorphic front-end"

# 3. Pull updates from origin
git pull --rebase origin main

# 4. Push to production release branch
git push origin main
```
# TalentPulse-AI
