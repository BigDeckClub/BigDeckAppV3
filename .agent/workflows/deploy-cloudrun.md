---
description: Deploy to Google Cloud Run
---

# Deploy BigDeck App to Google Cloud Run

This workflow builds and deploys the BigDeck application to Google Cloud Run.

## Prerequisites

- Google Cloud CLI (`gcloud`) installed and authenticated
- A GCP project with Cloud Run and Artifact Registry enabled
- Required environment variables configured in Cloud Run

## Configuration

Set these values before running (update for your environment):

```
PROJECT_ID=your-gcp-project-id
REGION=us-central1
SERVICE_NAME=bigdeck-app
REPO_NAME=bigdeck-repo
```

---

## Steps

### 1. Authenticate with Google Cloud (if needed)
```powershell
gcloud auth login
gcloud config set project $PROJECT_ID
```

### 2. Enable Required APIs (first time only)
```powershell
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
```

### 3. Create Artifact Registry Repository (first time only)
```powershell
gcloud artifacts repositories create $REPO_NAME --repository-format=docker --location=$REGION --description="BigDeck Docker images"
```

### 4. Configure Docker authentication
```powershell
gcloud auth configure-docker $REGION-docker.pkg.dev
```

// turbo
### 5. Build the Docker image
```powershell
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$SERVICE_NAME:latest .
```

### 6. Push the image to Artifact Registry
```powershell
docker push $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$SERVICE_NAME:latest
```

### 7. Deploy to Cloud Run
```powershell
gcloud run deploy $SERVICE_NAME --image $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$SERVICE_NAME:latest --region $REGION --platform managed --allow-unauthenticated --port 8080
```

---

## Environment Variables

Configure these in Cloud Run (via console or `--set-env-vars`):

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `SUPABASE_URL` | Supabase project URL | ✅ |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `OPENAI_API_KEY` | OpenAI API key for AI features | ⚠️ Optional |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | ⚠️ Recommended |
| `NODE_ENV` | Set to `production` | ✅ |

### Setting environment variables during deploy:
```powershell
gcloud run deploy $SERVICE_NAME --image $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$SERVICE_NAME:latest --region $REGION --platform managed --allow-unauthenticated --port 8080 --set-env-vars="NODE_ENV=production,ALLOWED_ORIGINS=https://yourdomain.com"
```

---

## Update Existing Deployment

// turbo
### Build new image
```powershell
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$SERVICE_NAME:latest .
```

### Push and deploy
```powershell
docker push $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$SERVICE_NAME:latest
gcloud run deploy $SERVICE_NAME --image $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$SERVICE_NAME:latest --region $REGION
```

---

## Troubleshooting

### View logs
```powershell
gcloud run logs read --service=$SERVICE_NAME --region=$REGION --limit=50
```

### Describe service
```powershell
gcloud run services describe $SERVICE_NAME --region=$REGION
```

### Check container startup issues
Look for `[BOOT]` logs - the server outputs diagnostic info during startup.

---

## Notes

- The Dockerfile uses a multi-stage build for smaller images
- Port 8080 is configured (Cloud Run default)
- Graceful shutdown is implemented for proper container termination
- Static assets are cached for 1 day
