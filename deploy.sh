#!/usr/bin/env bash

# GCP Cloud Run deployment script for TalentPulse AI
# Project ID: talentpulse-ai-501608
# Target Region: us-central1
# Service Name: talentpulse-app

set -euo pipefail

PROJECT_ID="talentpulse-ai-501608"
REGION="us-central1"
SERVICE_NAME="talentpulse-app"

echo "=========================================================="
echo "Starting GCP Production Deployment for TalentPulse AI"
echo "Project ID: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "=========================================================="

# 1. Configure gcloud CLI
echo "--> Configuring gcloud CLI project..."
gcloud config set project "${PROJECT_ID}"

# 2. Enable Required APIs
echo "--> Enabling Google Cloud Services (Cloud Run, Cloud Build, Artifact Registry)..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com

# 3. Prompt for Optional GCP Database & API Key Integration
echo "----------------------------------------------------------"
echo "Database Configuration & AI API Keys"
echo "To connect to a Cloud SQL instance and use a live Gemini API key,"
echo "you can configure them below. If skipped, the app will run with"
echo "local SQLite storage and simulated AI mock mode."
echo "----------------------------------------------------------"

read -p "Enter GEMINI_API_KEY (leave empty to use mock AI): " USER_GEMINI_KEY || USER_GEMINI_KEY=""
read -p "Enter Cloud SQL Connection Name (e.g. project:region:instance) [leave empty for SQLite]: " CLOUD_SQL_CONNECTION || CLOUD_SQL_CONNECTION=""
read -p "Enter Production DATABASE_URL (e.g. mysql+pymysql://user:pass@/db?unix_socket=/cloudsql/conn) [leave empty for SQLite]: " PROD_DB_URL || PROD_DB_URL=""

ENV_ARGS=()
DEPLOY_FLAGS=()

# Configure environment variables
if [ -n "${USER_GEMINI_KEY}" ]; then
  ENV_ARGS+=("GEMINI_API_KEY=${USER_GEMINI_KEY}")
fi

if [ -n "${PROD_DB_URL}" ]; then
  ENV_ARGS+=("DATABASE_URL=${PROD_DB_URL}")
fi

# Join env variables comma separated
if [ ${#ENV_ARGS[@]} -gt 0 ]; then
  # Join array elements with commas
  IFS=","
  ENV_STRING="${ENV_ARGS[*]}"
  unset IFS
  DEPLOY_FLAGS+=("--set-env-vars" "${ENV_STRING}")
fi

# Configure Cloud SQL database proxy binding
if [ -n "${CLOUD_SQL_CONNECTION}" ]; then
  DEPLOY_FLAGS+=("--add-cloudsql-instances" "${CLOUD_SQL_CONNECTION}")
fi

echo "--> Deploying service to Google Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --source . \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  "${DEPLOY_FLAGS[@]}"

echo "=========================================================="
echo "Deployment Finished Successfully!"
echo "Use the Service URL provided by the Cloud Run output above."
echo "=========================================================="
