import httpx
import logging
from sqlalchemy.orm import Session
from backend.app.config import settings
from backend.app.models import Candidate

logger = logging.getLogger("HookService")

async def trigger_ml_intern_validation_hook(candidate_id: int, candidate_name: str, z_score: float, is_anomaly: bool):
    """
    Asynchronously POSTs candidate metadata to the external Hugging Face ml-intern runner.
    Fails silently if the endpoint is not configured or offline.
    """
    if not settings.ml_intern_hook_url:
        logger.info("ML Intern Hook URL is not configured. Skipping webhook call.")
        return

    payload = {
        "event": "candidate_evaluated",
        "candidate_id": candidate_id,
        "name": candidate_name,
        "z_score": z_score,
        "is_anomaly": is_anomaly,
        "timestamp": str(httpx.QueryParams())
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(settings.ml_intern_hook_url, json=payload)
            if response.status_code == 200:
                logger.info(f"Successfully triggered ml-intern hook for candidate {candidate_id}")
            else:
                logger.warning(f"ml-intern hook responded with code {response.status_code}")
    except Exception as e:
        logger.error(f"Failed to dispatch hook to ml-intern: {e}")

class ScalingHandler:
    """
    Simulates dynamic task routing and resource scaling handlers.
    Used during high-concurrency ingestion events.
    """
    def __init__(self):
        self.replica_count = 1
        self.cpu_allocation = "1.0"
        self.current_job_queue_depth = 0

    def evaluate_scale(self, queue_depth: int) -> dict:
        """
        Determines if container scaling is needed based on incoming queue depth.
        Mimics Kubernetes auto-scaling behavior or task queue scaling.
        """
        self.current_job_queue_depth = queue_depth
        prev_replicas = self.replica_count
        
        if queue_depth > 50:
            self.replica_count = 4
            self.cpu_allocation = "4.0"
        elif queue_depth > 20:
            self.replica_count = 2
            self.cpu_allocation = "2.0"
        else:
            self.replica_count = 1
            self.cpu_allocation = "1.0"
            
        is_scaled = self.replica_count != prev_replicas
        return {
            "scaled": is_scaled,
            "previous_replicas": prev_replicas,
            "current_replicas": self.replica_count,
            "cpu_allocated": self.cpu_allocation,
            "queue_depth": queue_depth
        }

scaling_handler = ScalingHandler()
