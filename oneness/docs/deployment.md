# Oneness — Free-Tier Deployment Guide

Target: 500 users, $0/month infrastructure cost.

---

## Stack

| Layer | Service | Free tier |
|---|---|---|
| Database | Supabase | 500MB DB, 1GB storage, 50k MAU |
| Auth (phone OTP) | Supabase + Twilio | ~$0.008/SMS (~$8 for 500 users one-time) |
| File storage (photos) | Supabase Storage | 1GB (included in free tier) |
| Backend API | Render.com | Free web service (sleeps after 15min inactivity) |
| Frontend | Vercel | Free hobby plan |

**Total monthly cost for 500 users: ~$0 + ~$8 one-time SMS cost**

---

## Step 1: Supabase Setup

1. Create account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **SQL Editor** → paste contents of `supabase/migrations/001_initial_schema.sql` → Run
4. Go to **Authentication → Providers → Phone** → enable, configure Twilio:
   - Create free Twilio account at twilio.com
   - Copy Account SID, Auth Token, and a phone number
   - Paste into Supabase phone provider settings
5. Go to **Storage** → create bucket named `profile-photos` → set to Public
6. Add Storage RLS policies (SQL at bottom of migration file)
7. Copy your **Project URL**, **anon key**, and **service_role key** from Settings → API

---

## Step 2: Backend on Render.com

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Settings:
   - **Root directory**: `oneness/backend`
   - **Build command**: `pip install -r requirements.txt`
   - **Start command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Environment**: Python 3.12
   - **Plan**: Free
5. Add environment variables in Render dashboard:
   ```
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   DEBUG=false
   CORS_ORIGINS=["https://your-app.vercel.app"]
   ```
6. Set **PYTHONPATH** env var:
   ```
   PYTHONPATH=/opt/render/project/src/oneness/..
   ```
   Or alternatively, build a Docker image (see `Dockerfile`) and deploy via Render Docker service.

**Note on Render free tier**: The service sleeps after 15 minutes of inactivity.
First request after sleep takes ~30 seconds (cold start). Acceptable for a pilot.
When you're ready to pay (~$7/month), upgrade to Render Starter plan for always-on.

---

## Step 3: Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Settings:
   - **Root directory**: `oneness/frontend`
   - **Framework preset**: Next.js
4. Add environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   NEXT_PUBLIC_API_URL=https://oneness-api.onrender.com
   ```
5. Deploy

---

## Step 4: Update CORS

Once you have your Vercel URL (e.g. `https://oneness.vercel.app`), update the
`CORS_ORIGINS` environment variable in Render to include it:
```
CORS_ORIGINS=["https://oneness.vercel.app"]
```

---

## Scaling Beyond 500 Users

| Threshold | Action | Cost |
|---|---|---|
| 500 users | Upgrade Render free → Starter ($7/mo) | $7/mo |
| 1GB storage | Upgrade Supabase free → Pro ($25/mo) | $25/mo |
| 50k+ MAU auth | Supabase Pro includes 100k MAU | Included |
| ML training (Phase 2) | Add MLflow on same Render instance | $0 |
| 2000+ users | Migrate to Railway or Fly.io with auto-scale | ~$20/mo |

---

## Local Development

```bash
# Backend
cd oneness/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in Supabase values
uvicorn app.main:app --reload

# Frontend
cd oneness/frontend
cp .env.local.example .env.local  # fill in values
npm install
npm run dev
```

API docs (development only): http://localhost:8000/docs
Frontend: http://localhost:3000
