# Content Refinery - Render Setup Guide

## 🚀 Get Running in 20 Minutes

### Overview
This app deploys entirely on Render:
- **Web Service**: Next.js app
- **Database**: PostgreSQL
- **Storage**: Cloudflare R2 (or local for dev)

---

## Step 1: Create Render PostgreSQL Database

1. Go to [render.com](https://render.com) and sign in
2. Click **New +** → **PostgreSQL**
3. Configure:
   - **Name**: `content-refinery-db`
   - **Database**: `content_refinery`
   - **User**: `content_refinery`
   - **Region**: Oregon (or closest)
   - **Plan**: Free (for dev) or Starter ($7/mo for prod)
4. Click **Create Database**
5. Wait for provisioning (~2 min)
6. Copy the **External Database URL** (starts with `postgresql://`)

---

## Step 2: Run Database Migrations

### Option A: From Local Machine
```bash
cd /Users/kr/Development/content-refinery

# Set your database URL
export DATABASE_URL="postgresql://user:pass@host:5432/database"

# Run migrations
node scripts/migrate.js
```

### Option B: From Render Shell
1. Go to your Web Service → **Shell**
2. Run: `node scripts/migrate.js`

---

## Step 3: Create Render Web Service

1. Click **New +** → **Web Service**
2. Connect your GitHub repo (or use "Public Git repository")
3. Configure:
   - **Name**: `content-refinery`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (for dev) or Starter ($7/mo for prod)

---

## Step 4: Set Environment Variables

In Render Dashboard → Your Web Service → **Environment**:

### Required Variables
```
DATABASE_URL=postgresql://... (from Step 1)
ANTHROPIC_API_KEY=sk-ant-...
DEEPGRAM_API_KEY=...
STORAGE_PROVIDER=local
NEXT_PUBLIC_APP_URL=https://your-app.onrender.com
```

### Shopify (Already Have)
```
SHOPIFY_STORE=store-letstruck
SHOPIFY_ACCESS_TOKEN=shpat_YOUR_TOKEN_HERE
```

### Optional: Cloudflare R2 Storage
If you want persistent file storage (recommended for production):
```
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=content-refinery
R2_PUBLIC_URL=https://...r2.cloudflarestorage.com
```

### Optional: Social Publishing
```
TWITTER_API_KEY=...
TWITTER_API_SECRET=...
TWITTER_ACCESS_TOKEN=...
TWITTER_ACCESS_SECRET=...
```

---

## Step 5: Deploy!

1. Click **Create Web Service**
2. Watch the build logs
3. Once deployed, visit your URL

---

## Local Development

```bash
cd /Users/kr/Development/content-refinery

# Install dependencies
npm install

# Copy env example and fill in values
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL and API keys

# Run migrations
node scripts/migrate.js

# Start dev server
npm run dev

# Open http://localhost:3000
```

---

## Get API Keys

| Service | URL | Notes |
|---------|-----|-------|
| **Deepgram** | console.deepgram.com | Free tier: 200 hours transcription |
| **Anthropic** | console.anthropic.com | Pay-as-you-go |
| **Twitter/X** | developer.twitter.com | Free API for posting |
| **Cloudflare R2** | dash.cloudflare.com | Free 10GB storage |

---

## Test the Pipeline

1. Visit `http://localhost:3000` (or your Render URL)
2. Click **Ingest Content**
3. Upload a short audio file (< 5 min for testing)
4. Watch it process:
   - Upload ✓
   - Transcribe ✓
   - Extract ✓
5. Go to **Review Queue**
6. See extracted content!

---

## Troubleshooting

### "Database connection failed"
- Check DATABASE_URL is correct
- Ensure database is active in Render dashboard
- Check SSL settings (Render requires SSL)

### "Transcription failed"
- Verify DEEPGRAM_API_KEY is set
- Check Deepgram console for API usage/errors
- Ensure audio file is valid format (MP3, WAV, M4A)

### "Extraction returned empty"
- Verify ANTHROPIC_API_KEY is set
- Check Claude API console for errors
- Review transcript quality (may need longer content)

### "Build failed on Render"
- Check build logs for specific error
- Ensure all dependencies are in package.json
- Verify Node version compatibility

---

## Open in Cursor

```bash
cursor /Users/kr/Development/content-refinery
```

First prompt:
```
Read CLAUDE.md and .cursorrules first, then tell me what needs to be built next.
```

---

## Architecture

```
┌─────────────────────────────────────┐
│           RENDER                    │
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────────┐ │
│  │     Web Service (Next.js)     │ │
│  │                               │ │
│  │  • Dashboard UI               │ │
│  │  • API Routes                 │ │
│  │  • AI Integration             │ │
│  └───────────────────────────────┘ │
│              │                      │
│              ▼                      │
│  ┌───────────────────────────────┐ │
│  │     PostgreSQL Database       │ │
│  │                               │ │
│  │  • sources                    │ │
│  │  • transcripts                │ │
│  │  • extractions                │ │
│  │  • generated_content          │ │
│  │  • products                   │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│        EXTERNAL SERVICES            │
├─────────────────────────────────────┤
│  • Deepgram (transcription)         │
│  • Anthropic Claude (AI)            │
│  • Cloudflare R2 (file storage)     │
│  • Twitter/X API (publishing)       │
│  • Shopify API (products)           │
└─────────────────────────────────────┘
```

---

## Cost Estimate

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| Render Web Service | Starter | $7 |
| Render PostgreSQL | Starter | $7 |
| Deepgram | Pay-as-you-go | ~$10-30 |
| Anthropic | Pay-as-you-go | ~$20-50 |
| Cloudflare R2 | Free tier | $0 |
| **Total** | | **~$44-94/mo** |

Free tier available for development (with limitations).
