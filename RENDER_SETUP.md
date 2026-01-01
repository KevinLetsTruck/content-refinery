# Content Refinery - Render Setup Guide

## Overview

This guide sets up Content Refinery entirely on Render:
- **Web Service**: Next.js application
- **PostgreSQL**: Database
- **Persistent Disk**: File storage (for audio uploads)

Total estimated cost: ~$14/month (Starter tier)

---

## Step 1: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up / Sign in
3. Connect your GitHub account

---

## Step 2: Create PostgreSQL Database

1. Go to **Dashboard** → **New** → **PostgreSQL**
2. Configure:
   - **Name**: `content-refinery-db`
   - **Database**: `content_refinery`
   - **User**: `content_refinery_user`
   - **Region**: Oregon (or closest to you)
   - **Plan**: Starter ($7/month) or Free (limited)
3. Click **Create Database**
4. Wait for it to spin up (~2 minutes)
5. Copy the **Internal Database URL** (starts with `postgres://`)

---

## Step 3: Deploy the Web Service

### Option A: From GitHub

1. Push your code to GitHub:
```bash
cd /Users/kr/Development/content-refinery
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/content-refinery.git
git push -u origin main
```

2. In Render Dashboard → **New** → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Name**: `content-refinery`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Starter ($7/month)

### Option B: Using render.yaml (Blueprint)

Create `render.yaml` in project root, then connect repo.

---

## Step 4: Add Environment Variables

In Render Dashboard → Your Web Service → **Environment**

Add these variables:

```
# Database (paste your Internal Database URL)
DATABASE_URL=postgres://content_refinery_user:XXXXX@oregon-postgres.render.com/content_refinery

# Anthropic (get from console.anthropic.com)
ANTHROPIC_API_KEY=sk-ant-...

# Deepgram (get from console.deepgram.com)
DEEPGRAM_API_KEY=...

# Shopify (already have these)
SHOPIFY_STORE=store-letstruck
SHOPIFY_ACCESS_TOKEN=shpat_YOUR_TOKEN_HERE

# App URL (Render will give you this)
NEXT_PUBLIC_APP_URL=https://content-refinery.onrender.com

# Optional: Social platforms (add when ready)
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_SECRET=
```

---

## Step 5: Initialize Database

After deployment, run the Prisma migration:

### Option A: Via Render Shell

1. Go to your Web Service → **Shell**
2. Run:
```bash
npx prisma db push
```

### Option B: Via SSH

```bash
# From your local machine
render ssh content-refinery
npx prisma db push
```

### Option C: Add to Build Command

Update build command in Render to:
```
npm install && npx prisma generate && npx prisma db push && npm run build
```

---

## Step 6: Add Persistent Disk (for file uploads)

1. Go to your Web Service → **Disks**
2. Click **Add Disk**
3. Configure:
   - **Name**: `uploads`
   - **Mount Path**: `/app/uploads`
   - **Size**: 1 GB (can increase later)
4. Save

Update your `.env` to use this path:
```
UPLOAD_DIR=/app/uploads
```

---

## Step 7: Verify Deployment

1. Visit your Render URL: `https://content-refinery.onrender.com`
2. You should see the dashboard
3. Test upload flow:
   - Click **Ingest Content**
   - Upload a short test audio file
   - Watch it process

---

## Troubleshooting

### "Database connection failed"
- Check DATABASE_URL is correct
- Ensure using **Internal** URL (not External) for same-region connections
- Verify database is running in Render dashboard

### "Prisma client not generated"
```bash
# In Render Shell
npx prisma generate
```

### "Build failed"
- Check build logs in Render dashboard
- Common issues:
  - Missing environment variables
  - Node version mismatch (add `"engines": {"node": "18.x"}` to package.json)

### "Transcription failed"
- Verify DEEPGRAM_API_KEY is set
- Check Deepgram dashboard for quota/errors

### "AI extraction empty"
- Verify ANTHROPIC_API_KEY is set
- Check Anthropic console for API usage

---

## Local Development

For local development, still use `.env.local`:

```bash
cd /Users/kr/Development/content-refinery
npm install
npx prisma generate
npm run dev
```

For local database, you can:
1. Use Render's **External URL** (slower, but works)
2. Run PostgreSQL locally via Docker:
```bash
docker run --name content-refinery-db -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
```

---

## Cost Summary

| Service | Plan | Monthly |
|---------|------|---------|
| PostgreSQL | Starter | $7 |
| Web Service | Starter | $7 |
| Disk (1GB) | Included | $0 |
| **Total** | | **$14** |

Free tier available for testing (with limitations).

---

## Next Steps

After setup:

1. ✅ Test the full pipeline (upload → transcribe → extract → generate → review)
2. 🔧 Add Twitter API keys for publishing
3. 📊 Build out analytics dashboard
4. 📅 Add content calendar
5. 🚀 Scale as needed

---

## Support

- Render Docs: [render.com/docs](https://render.com/docs)
- Prisma Docs: [prisma.io/docs](https://prisma.io/docs)
- Project Docs: See `CLAUDE.md` in repo
