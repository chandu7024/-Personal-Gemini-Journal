#!/bin/bash
# Helper script to apply the Cloud Run Build & Deploy Social Challenge verification label
set -e

SERVICE_NAME="${1:-reflect-ai}"
REGION="${2:-us-central1}"

echo "Applying challenge verification label to Cloud Run service '${SERVICE_NAME}' in region '${REGION}'..."
echo "Label: dev-tutorial=cloud-run-ai-challenge"

if ! command -v gcloud &> /dev/null; then
  echo "Error: gcloud CLI not found. Run this command in Google Cloud Shell or install the gcloud SDK."
  exit 1
fi

gcloud run services update "${SERVICE_NAME}" \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region="${REGION}"

echo "Successfully applied label: dev-tutorial=cloud-run-ai-challenge"
