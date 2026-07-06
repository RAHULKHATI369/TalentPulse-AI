# ==========================================
# STAGE 1: Dependency builder
# ==========================================
FROM python:3.11-slim AS builder

WORKDIR /build

# Install compilation dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libmariadb-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .

# Install dependencies into a wheel directory to prevent pollution of system directories
RUN pip install --no-cache-dir --user -r requirements.txt

# ==========================================
# STAGE 2: Secure runtime environment
# ==========================================
FROM python:3.11-slim AS runner

WORKDIR /app

# Install system runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmariadb3 \
    && rm -rf /var/lib/apt/lists/*

# Copy python packages from builder stage
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy source directories
COPY backend/ /app/backend/
COPY frontend/ /app/frontend/

# Expose FastAPI core server port
EXPOSE 8000

# Set environment defaults
ENV HOST=0.0.0.0
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

# Run server with uvicorn (reads dynamic PORT env var from Cloud Run)
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT"]
