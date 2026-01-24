# Content Refinery - Handoff Document

**Date:** January 22, 2026  
**Prepared for:** Team member taking over development  
**Current State:** ~85% complete

---

## Quick Start

```bash
# 1. Clone and install
cd ~/Development/content-refinery
npm install

# 2. Set up environment
cp .env.example .env.local
# Fill in API keys (see Environment Variables section)

# 3. Set up database
npx prisma db push
npx prisma db seed

# 4. Run development server
npm run dev
# App runs at http://localhost:3000
```

---

## What This App Does

Content Refinery transforms Kevin's content (podcasts, coaching, products) into social media posts using AI. It maintains his voice while automating distribution.

**The Flow:**
1. Content arrives via API (AudioRoad podcasts, coaching success stories, etc.)
2. AI (Claude) extracts quotables, stats, hot takes, stories
3. AI generates platform-specific posts in Kevin's voice
4. Team reviews in queue (approve/edit/reject)
5. Approved posts publish to social platforms

---

## What's Working

| Feature | Status | Notes |
|---------|--------|-------|
| Content Ingestion API | ✅ Complete | POST /api/ingest with API key auth |
| Audio Transcription | ✅ Complete | Deepgram integration |
| AI Extraction | ✅ Complete | Claude extracts quotes, stats, hot takes |
| Content Generation | ✅ Complete | Platform-specific, voice-matched |
| Creation Wizard | ✅ Complete | 7-8 step flow, both modes |
| Review Queue | ✅ Complete | Full CRUD, filtering, preview |
| **Twitter/X Publishing** | ✅ Complete | OAuth 1.0a, media upload works |
| Gamma Visuals | ✅ Complete | AI-generated images |
| Dashboard | ✅ Complete | Stats, schedule, activity |
| Lead Magnets | ✅ Complete | PDF library with extraction |
| Landing Pages | ✅ Complete | Generation and hosting |
| Email Sequences | ✅ Complete | AI-generated nurture flows |
| A/B Testing | ✅ Complete | Framework in place |
| Evergreen Content | ✅ Complete | Reshare management |

---

## What Needs Finishing

### Priority 1: Critical Fixes

#### 1. Hardcoded Twitter Handle (Quick Fix)
**File:** `src/lib/social/twitter.ts` around line 165  
**Problem:** Twitter URL is hardcoded to `lets_truck`  
**Fix:** Make dynamic based on authenticated user or config

```typescript
// Current (BAD):
const tweetUrl = `https://twitter.com/lets_truck/status/${tweetId}`;

// Should be:
const tweetUrl = `https://twitter.com/${process.env.TWITTER_USERNAME}/status/${tweetId}`;
```

#### 2. Add Error Monitoring
**Why:** Currently no way to know when production errors occur  
**Recommended:** Sentry (free tier is fine)

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### Priority 2: Platform Integrations

#### Instagram/Facebook (Meta Business API)
**Status:** Code scaffolded in `src/lib/social/meta.ts`  
**What's missing:**
- Complete OAuth flow
- Media upload for images
- Publishing endpoint integration
- Error handling for rate limits

**Documentation:** https://developers.facebook.com/docs/instagram-api/

#### LinkedIn
**Status:** OAuth flow exists  
**What's missing:**
- Publishing implementation
- Rich media posting
- Company page vs personal profile handling

**Documentation:** https://learn.microsoft.com/en-us/linkedin/marketing/

#### YouTube (Shorts)
**Status:** OAuth flow exists  
**What's missing:**
- Video upload implementation
- Shorts-specific formatting
- Thumbnail generation

### Priority 3: Production Hardening

1. **Rate Limiting** - Add to `/api/ingest` endpoint
2. **Database Migrations** - Switch from `db push` to `prisma migrate`
3. **Test Coverage** - Core publish flow needs tests
4. **API Documentation** - OpenAPI/Swagger spec

---

## Key Files to Know

### Configuration
| File | Purpose |
|------|---------|
| `CLAUDE.md` | Main project documentation (read this!) |
| `.env.local` | Environment variables |
| `prisma/schema.prisma` | Database schema (37 models) |
| `package.json` | Dependencies and scripts |

### Core Business Logic
| Directory | Purpose |
|-----------|---------|
| `src/lib/ai/` | Claude integration, prompts |
| `src/lib/social/twitter.ts` | Twitter publishing (working) |
| `src/lib/social/meta.ts` | Instagram/Facebook (incomplete) |
| `src/lib/social/linkedin.ts` | LinkedIn (incomplete) |
| `src/lib/gamma/` | Visual generation |
| `src/lib/audio/` | Deepgram transcription |

### UI
| Directory | Purpose |
|-----------|---------|
| `src/app/page.tsx` | Dashboard |
| `src/app/create/` | Content creation wizard (30+ files) |
| `src/app/create/store.ts` | Wizard state (Zustand) |
| `src/app/queue/` | Review queue |
| `src/app/api/` | All API routes (45+ directories) |

### Key API Routes
| Route | Purpose |
|-------|---------|
| `POST /api/ingest` | External content ingestion |
| `POST /api/process` | Trigger AI processing |
| `GET/POST /api/queue` | Review queue CRUD |
| `POST /api/publish/twitter` | Publish to Twitter |
| `POST /api/gamma/generate` | Generate visuals |

---

## Environment Variables

Required in `.env.local`:

```bash
# Database
DATABASE_URL="postgresql://..."

# AI
ANTHROPIC_API_KEY="sk-ant-..."

# Transcription
DEEPGRAM_API_KEY="..."

# Twitter (WORKING)
TWITTER_API_KEY="..."
TWITTER_API_SECRET="..."
TWITTER_ACCESS_TOKEN="..."
TWITTER_ACCESS_TOKEN_SECRET="..."
TWITTER_USERNAME="lets_truck"  # ADD THIS

# Meta (Instagram/Facebook) - TO COMPLETE
META_APP_ID="..."
META_APP_SECRET="..."
META_ACCESS_TOKEN="..."
INSTAGRAM_BUSINESS_ACCOUNT_ID="..."
FACEBOOK_PAGE_ID="..."

# LinkedIn - TO COMPLETE
LINKEDIN_CLIENT_ID="..."
LINKEDIN_CLIENT_SECRET="..."

# Storage
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="..."
R2_ENDPOINT="..."

# Gamma (Visuals)
GAMMA_API_KEY="..."

# Email
RESEND_API_KEY="..."
CONSTANT_CONTACT_API_KEY="..."
```

---

## Deployment

**Host:** Render (auto-deploys on push to `main`)

```bash
# Deploy
git add .
git commit -m "Description of changes"
git push origin main

# Monitor
# Check Render dashboard for build status
# Or use Render MCP tools if available
```

**Important:** Always push to `main` directly. No feature branches unless specifically requested.

---

## Database

**Schema location:** `prisma/schema.prisma`  
**Key models:**

| Model | Purpose |
|-------|---------|
| `SourceApp` | External apps (AudioRoad, etc.) |
| `Source` | Raw uploaded content |
| `Extraction` | AI-extracted pieces |
| `GeneratedContent` | Platform-specific posts |
| `PostPerformance` | Analytics per post |
| `Campaign` | Marketing campaigns |
| `LeadMagnet` | PDF library |
| `LandingPage` | Generated landing pages |

**Commands:**
```bash
npx prisma studio      # GUI database browser
npx prisma db push     # Push schema changes (current method)
npx prisma generate    # Regenerate client after schema changes
```

---

## Testing

```bash
npm run test           # Run unit tests (Vitest)
npm run test:e2e       # Run E2E tests (Playwright)
```

**Test files location:** `/tests/`

**What needs tests:** The publish flow (`src/lib/social/*.ts`) is critical and under-tested.

---

## Known Issues

1. **Twitter handle hardcoded** - See Priority 1 above
2. **No rate limiting on ingestion API** - Could be abused
3. **Large Prisma schema** - 1187 lines, some duplication
4. **Wizard state complexity** - `store.ts` is 605 lines, could be split
5. **No error monitoring** - Errors in production go unnoticed

---

## Architecture Decisions

1. **Next.js App Router** - Modern React patterns, good for this use case
2. **Zustand for wizard state** - Simpler than Redux, persists to localStorage
3. **Prisma ORM** - Type-safe database access
4. **Claude for AI** - Using `claude-sonnet-4-20250514` model
5. **Gamma for visuals** - API-based image generation with brand rules

---

## Questions?

Check `CLAUDE.md` first - it's comprehensive (800+ lines).

If you need to understand a specific feature, search for related API routes in `src/app/api/` and trace the flow.

---

*Document created January 22, 2026*
