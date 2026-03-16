# Deployment Guide (Frontend Vercel + Backend FastAPI)

This repository is a monorepo:
- Frontend web: `jira-api-craft`
- Backend API: `Test-Case-Generation-Backend`
- Mobile app: `testgenai-mobile` (not deployed on Vercel)

## 1) Frontend deploy to Vercel

### Recommended project settings
- Import repository to Vercel.
- Keep Root Directory as repository root (because root `vercel.json` is configured).
- Vercel will run:
  - installCommand: `cd jira-api-craft && npm install`
  - buildCommand: `cd jira-api-craft && npm run build`
  - outputDirectory: `jira-api-craft/dist`

### Required frontend environment variables
Set in Vercel Project Settings -> Environment Variables:
- `VITE_BACKEND_URL=https://<your-backend-domain>`

Example:
- `VITE_BACKEND_URL=https://testcase-backend.onrender.com`

### Why 404 NOT_FOUND happens on Vercel
Common causes:
- Deploying monorepo with wrong root/build/output settings.
- Missing SPA rewrite (already configured in `vercel.json`).
- Missing `VITE_BACKEND_URL`, so frontend calls wrong origin.

## 2) Backend deploy (Render/Railway/Fly recommended)

This backend uses FastAPI + sessions + optional Redis/Supabase/Jira integrations.
Running it on a Python-native host is more stable than static frontend hosts.

### Backend start command
- `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Required backend environment variables
From `Test-Case-Generation-Backend/.env.example`:
- `FASTAPI_SECRET_KEY=<strong-random-string>`
- `FRONTEND_URL=https://<your-vercel-domain>`
- `FRONTEND_ORIGINS=https://<your-vercel-domain>,https://<your-preview-domain-if-needed>`
- `JIRA_CLIENT_ID=<jira-client-id>`
- `JIRA_SECRET=<jira-client-secret>`
- `JIRA_REDIRECT_URL=https://<your-backend-domain>/jira/callback`
- `SUPABASE_URL=<optional-if-using-supabase>`
- `SUPABASE_KEY=<optional-if-using-supabase>`
- `REDIS_HOST/REDIS_PORT/REDIS_USERNAME/REDIS_PASSWORD=<optional-if-using-redis>`

## 3) Post-deploy verification checklist

### Frontend checks
1. Open `/` and `/dashboard/projects` directly (both should load, not 404).
2. Open browser network tab and verify API requests go to your backend domain, not Vercel domain.

### Backend checks
1. `GET /health` returns success.
2. `POST /admin/login` with admin credentials returns session token.
3. Jira login flow redirects back to frontend domain configured in `FRONTEND_URL`.

## 4) Fast troubleshooting map

### Error: `404: NOT_FOUND` with Vercel request id
- Check that deployment used repository root with root `vercel.json`.
- Check latest deployment status is Ready (not a previous failed URL).
- Check frontend route is rewritten to `index.html` (already configured).

### Error: frontend loads but API returns 404 from Vercel domain
- `VITE_BACKEND_URL` is missing or incorrect.
- Redeploy frontend after setting env variable.

### Error: CORS blocked
- Ensure backend `FRONTEND_URL` and `FRONTEND_ORIGINS` include exact Vercel domain.
- Include both production and preview domains when testing preview deployments.

### Error: Jira login returns to localhost
- `FRONTEND_URL` is missing on backend.
- `JIRA_REDIRECT_URL` is incorrect.

## 5) Current repository config already prepared

Frontend:
- Root monorepo Vercel config: `vercel.json`
- SPA rewrite inside frontend: `jira-api-craft/vercel.json`
- Production API base resolution: `jira-api-craft/src/config/apiconfig.ts`

Backend:
- Dynamic CORS allowlist + Vercel preview regex: `Test-Case-Generation-Backend/app/main.py`
- Frontend redirect URL from env: `Test-Case-Generation-Backend/app/services/auth.py`
- Frontend env settings: `Test-Case-Generation-Backend/app/core/config.py`
