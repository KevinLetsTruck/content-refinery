# CLAUDE.md - Project Knowledge Base

## Deployment Rules

**IMPORTANT**: Always push changes directly to the `main` branch for automatic deployment to Render. Do not use feature branches unless specifically requested. The Render service auto-deploys on commits to `main`.

**BUILD MONITORING**: After pushing to main, always check the Render build status. If a build fails:
1. Check Render logs using `mcp__render__list_deploys` and `mcp__render__get_deploy` tools
2. Check service logs using `mcp__render__list_logs` to identify the error
3. Fix the issue immediately and push another commit to main
4. Verify the new build succeeds before moving on

## What Is This Project?

Content Refinery is an automated social media content engine for Let's Truck Health Coaching, founded by Kevin Rutherford, FNTP. It transforms 15+ hours of weekly podcast content into platform-optimized social media posts.

**NEW: Multi-App Content Hub** - Content Refinery now serves as the central marketing hub for multiple Let's Truck apps, receiving content from AudioRoad, Health Coaching App, and TruckTales.

## The Problem We're Solving

Kevin produces massive amounts of valuable content:
- 15 hours/week of podcast content (Trucking Business & Beyond, Destination Health, Power Hour)
- 3 hours/week of group coaching
- 12 comprehensive health guides
- 250+ products in Shopify store
- Years of accumulated wisdom
- TruckTales fiction stories
- Client success stories

**But almost none of it gets distributed effectively on social media.**

Agencies have failed because they don't understand:
1. Kevin's voice (direct, no-BS, anti-establishment)
2. The trucking industry context
3. How to connect content to products
4. The volume of content being produced

## Multi-App Content Ecosystem

Content Refinery is the central hub for three source applications:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CONTENT SOURCE APPS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │  AudioRoad   │  │   Health     │  │  TruckTales  │                      │
│  │  Broadcast   │  │  Coaching    │  │    App       │                      │
│  │   Console    │  │     App      │  │              │                      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                      │
│         │                 │                 │                               │
│         ▼                 ▼                 ▼                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     POST /api/ingest                                 │   │
│  │                  (Unified Ingestion API)                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
                          ┌─────────────────────┐
                          │  CONTENT REFINERY   │
                          │   Processing Hub    │
                          └─────────────────────┘
```

### Source Apps & Content Types

| App | Content Types | Voice Profile |
|-----|---------------|---------------|
| **AudioRoad** | Episodes, Caller Segments | kevin-health |
| **Health Coaching** | Success Stories, Protocols, Research, Lab Improvements | kevin-health |
| **TruckTales** | Chapter Teasers, Character Spotlights, Story Launches | trucktales-storyteller |

### Voice Profiles

**kevin-health**: Direct, no-BS health authority voice for all health-related content.

**trucktales-storyteller**: Engaging fiction storyteller that builds suspense and curiosity.

**testimonial**: Authentic success story voice that lets results speak.

## Ingestion API

External apps send content via `POST /api/ingest`:

```typescript
// Example: AudioRoad sending an episode
await fetch('https://content-refinery.onrender.com/api/ingest', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer cr_xxxxxxxxxxxx',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    source: 'audioroad',
    contentType: 'episode',
    title: 'TBB Episode 2847',
    audioUrl: 'https://...',
    transcript: '...',
    metadata: { showName: 'Trucking Business & Beyond' }
  })
});
```

### Content Type Configurations

Each content type has specific processing rules:

| Content Type | Source Type | Needs Transcription | Extraction Types |
|--------------|-------------|---------------------|------------------|
| episode | audio | Yes (if no transcript) | quote, stat, hot_take, story, clip |
| success_story | structured | No | testimonial, stat, quote |
| chapter_teaser | text | No | teaser, excerpt, hook |
| character_spotlight | structured | No | teaser, story |

## The Business

**Let's Truck** serves America's 3.5 million professional truck drivers with:
- Health coaching (letstruck.com)
- Supplement store (store.letstruck.com)
- Radio shows on AudioRoad Network
- Live events and training
- TruckTales fiction

**Key Insight**: Professional drivers have a 12-15 year shorter life expectancy than average Americans. Kevin is the leading voice addressing this crisis through functional nutrition.

## Kevin's Voice & Brand

### Tone
- Direct, confrontational, no-BS (inspired by Larry Winget)
- Uses humor and sarcasm
- Challenges conventional medical establishment
- Pro-driver, anti-corporate-trucking
- Deeply knowledgeable but accessible

### Key Phrases & Terminology
- "Proper human diet" (Paleo-based eating)
- "Owner-operator" (self-employed truck driver)
- "Diesel in your blood" (trucking lifer)
- "The Tribe" (Let's Truck community)
- "Real fuel" (whole foods, not processed)

### Topics Kevin Covers
- Gut health (70% of truckers have Candida)
- Cardiovascular health (nitric oxide, blood pressure)
- Blood sugar chaos (insulin resistance epidemic)
- Sleep deprivation (drivers average 4.78 hours)
- Hormone dysfunction (cortisol, testosterone)
- Detoxification (diesel exhaust exposure)
- Supplement protocols

### What Kevin DOESN'T Say
- Wishy-washy qualifiers ("maybe", "possibly", "it might help")
- Corporate speak
- Excessive medical disclaimers
- Generic health advice
- Anything positive about big pharma

## Key Products (Kevin's Daily Stack)

1. **Lyte Balance** - Electrolytes ($27)
2. **Mind Fuel** - C8 MCT Oil ($25)
3. **Cardio Miracle** - Nitric oxide support ($109.97)
4. **Bio-DK Mulsion** - Vitamin D+K ($30.50)
5. **Bee-Ome Gold** - Functional honey with probiotics ($49.95)
6. **Terraflora Deep Zen** - Psychobiotic ($59.95)

## Content Types We Generate

### From Podcast Episodes (AudioRoad)
| Type | Description | Platform |
|------|-------------|----------|
| Quotables | 1-3 sentence powerful statements | Twitter, IG, FB |
| Stat Shocks | Surprising statistics | All |
| Hot Takes | Controversial opinions | Twitter, LinkedIn |
| Threads | Multi-part deep dives | Twitter, LinkedIn |
| Audiograms | 30-60 second audio clips with waveform | All |
| Clip Timestamps | Identified moments for video clips | YT Shorts, TikTok |

### From Health Coaching App
| Type | Description | Platform |
|------|-------------|----------|
| Success Stories | Client transformations (anonymized) | IG, FB |
| Protocol Snippets | Specific supplement protocols | All |
| Research Insights | Educational science content | LinkedIn, Twitter |
| Lab Improvements | Before/after lab marker improvements | IG, FB |

### From TruckTales
| Type | Description | Platform |
|------|-------------|----------|
| Chapter Teasers | Cliffhanger excerpts | Twitter, FB |
| Character Spotlights | Driver character profiles | IG, FB |
| Story Launches | New story announcements | All |
| Audiograms | Voice actor clips | TikTok, IG |

### From Health Guides
| Type | Description | Platform |
|------|-------------|----------|
| Tip Cards | Single actionable tips | IG, FB |
| Carousels | Multi-slide educational content | IG, LinkedIn |
| Infographics | Visual data representation | All |

### Product-Focused
| Type | Description | Platform |
|------|-------------|----------|
| Product Spotlights | Single product deep dive | All |
| Stack Recommendations | Multi-product bundles | All |
| Before/After Frameworks | Results-focused content | IG, FB |

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SOURCE APPS                        │
├─────────────────────────────────────────────────────────────────┤
│  AudioRoad → POST /api/ingest (audioUrl, transcript)           │
│  Health Coaching → POST /api/ingest (success_story, protocol)  │
│  TruckTales → POST /api/ingest (chapter_teaser, character)     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      INGESTION LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  - API key validation (per source app)                         │
│  - Content type routing                                         │
│  - Voice profile assignment                                     │
│  - Processing queue                                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI EXTRACTION ENGINE                       │
├─────────────────────────────────────────────────────────────────┤
│  Claude analyzes content and extracts:                         │
│  - Quotable moments (with timestamps for audio)                │
│  - Statistics and facts                                        │
│  - Product mentions and recommendations                        │
│  - Hot takes and controversial statements                      │
│  - Story/anecdote boundaries                                   │
│  - Testimonial highlights                                      │
│  - Fiction teasers and hooks                                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONTENT GENERATION                           │
├─────────────────────────────────────────────────────────────────┤
│  For each extraction, generate platform-specific versions:      │
│  - Uses voice profile for the source app                       │
│  - Twitter: 280 char, hook-first, optional thread              │
│  - Instagram: Visual-first, carousel-friendly, hashtags        │
│  - Facebook: Longer form, community-focused, link-friendly     │
│  - LinkedIn: Professional angle, industry insights             │
│  - TikTok/YT Shorts: Hook in first 3 seconds, clip guidance   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      REVIEW QUEUE                               │
├─────────────────────────────────────────────────────────────────┤
│  Filter by: [Source App ▼] [Platform ▼] [Content Type ▼]      │
│  Team member reviews generated content:                        │
│  - Approve → Goes to scheduled                                 │
│  - Edit → Modify and approve                                   │
│  - Regenerate → AI tries again with feedback                   │
│  - Kill → Discard                                              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SCHEDULING & PUBLISHING                    │
├─────────────────────────────────────────────────────────────────┤
│  - Optimal timing per platform                                 │
│  - Content calendar view                                       │
│  - Auto-publish via platform APIs                              │
│  - UTM tracking for attribution                                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        ANALYTICS                                │
├─────────────────────────────────────────────────────────────────┤
│  - Engagement by source app                                    │
│  - Performance by content type                                 │
│  - Click-through tracking                                      │
│  - Conversion attribution (which posts → which sales)          │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema Overview

### Core Tables

**source_apps**
- Registered external applications
- API keys for authentication
- Voice profile assignments

**sources**
- Raw uploaded content (audio files, text, URLs)
- Link to source app
- Content type (episode, success_story, chapter_teaser, etc.)
- Processing status

**voice_profiles**
- AI generation style configurations
- System prompts for each voice
- Examples for consistency

**transcripts**
- Full text transcription
- Speaker diarization (if available)
- Word-level timestamps

**extractions**
- Individual content pieces extracted from sources
- Type (quote, stat, clip, hot_take, story, testimonial, teaser)
- Timestamps (start/end for audio)
- Raw text
- Product associations

**generated_content**
- Platform-specific versions of extractions
- Platform (twitter, instagram, facebook, linkedin, tiktok, youtube)
- Content text
- Media attachments
- Status (draft, pending_review, approved, scheduled, published)

**products**
- Cached Shopify products
- Used for product mention linking

## API Endpoints

### Ingestion (External Apps)
- `POST /api/ingest` - Receive content from source apps
- `GET /api/ingest?sourceId=xxx` - Check processing status

### Source Apps Management
- `GET /api/apps` - List registered apps
- `POST /api/apps` - Register new app (returns API key)

### Content Processing
- `POST /api/transcribe` - Transcribe audio
- `POST /api/extract` - Extract content pieces
- `POST /api/generate` - Generate platform content

### Review Queue
- `GET /api/queue` - Get pending items (filterable)
- `PATCH /api/queue/:id` - Edit content
- `POST /api/queue/:id/approve` - Approve for scheduling
- `POST /api/queue/:id/reject` - Kill content
- `POST /api/queue/:id/regenerate` - AI retry

### Gamma Visual Generation
- `POST /api/gamma/generate` - Create social media visual
- `GET /api/gamma/generate?id=xxx` - Check generation status
- `GET /api/gamma/themes` - List available themes

## API Keys & Services

| Service | Purpose | Environment Variable |
|---------|---------|---------------------|
| Render PostgreSQL | Database | DATABASE_URL |
| Anthropic | AI content generation | ANTHROPIC_API_KEY |
| Deepgram | Audio transcription | DEEPGRAM_API_KEY |
| **Gamma** | Visual content generation | GAMMA_API_KEY |
| Shopify | Product catalog | SHOPIFY_* |
| Twitter/X | Publishing | TWITTER_* |
| Meta | FB/IG publishing | META_* |
| LinkedIn | Publishing | LINKEDIN_* |
| TikTok | Publishing | TIKTOK_* |

## Development Workflow

1. **Local Development**
   ```bash
   cd /Users/kr/Development/content-refinery
   npm run dev
   ```

2. **Database Changes**
   ```bash
   npx prisma db push    # Push schema changes
   npx prisma generate   # Regenerate client
   npx prisma db seed    # Seed source apps
   ```

3. **Testing Ingestion**
   ```bash
   curl -X POST http://localhost:3000/api/ingest \
     -H "Authorization: Bearer cr_your_api_key" \
     -H "Content-Type: application/json" \
     -d '{"source":"audioroad","contentType":"episode","title":"Test"}'
   ```

4. **Deployment**
   - Push to main branch
   - Render auto-deploys

## Integrating a New Source App

1. Register the app:
   ```bash
   curl -X POST https://content-refinery.onrender.com/api/apps \
     -H "Content-Type: application/json" \
     -d '{"name":"new-app","displayName":"New App","voiceProfile":"kevin-health"}'
   ```

2. Save the returned API key to the app's `.env`

3. Copy `src/lib/client/content-refinery-client.ts` to the app

4. Add integration code (button or webhook)

## Team Member Workflow

1. **Daily**: Check review queue, approve/edit/kill content
2. **Weekly**: Review analytics, identify winners
3. **Monthly**: Suggest new content types or prompts

## Gamma Visual Generation

Content Refinery integrates with Gamma.app API to automatically generate on-brand social media visuals.

### Theme Configuration
- **Theme ID**: `jg2glj9ae8ah4vv` (Let's Truck custom theme)
- **Style**: Dark backgrounds (#0D0D0D), orange accents (#FF4500), bold typography

### Brand Voice Rules (Auto-Injected)
All Gamma generations automatically include these rules:

**CRITICAL TERMINOLOGY:**
| ❌ NEVER Say | ✅ ALWAYS Use |
|--------------|---------------|
| Trucker | Driver, Professional Driver |
| Truckers | Drivers, O/Os, Owner-Operators, The Tribe |
| Truck driver | Professional driver |
| Big rig, 18-wheeler | Truck, Rig, Equipment |

**Voice**: Direct, no-BS, confident, anti-establishment
**Phrases**: "proper human diet", "owner-operator of your health", "diesel in your blood"

### Usage Example

```bash
curl -X POST http://localhost:3000/api/gamma/generate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "70% of professional drivers test positive for Candida overgrowth vs 13% of the general population.",
    "contentType": "stat",
    "waitForResult": true
  }'
```

### Content Types
- `quote` - Bold quote card with orange accent bar
- `stat` - Large number prominent in orange
- `testimonial` - Authentic transformation story
- `teaser` - Story teaser with suspense
- `tip` - Actionable tip card
- `product` - Product spotlight tied to driver lifestyle

---

## Processing Pipeline

The processing pipeline (`/api/process`) handles the full flow from raw content to platform-ready posts:

### Pipeline Steps

1. **Transcription** (Deepgram)
   - Converts audio to text
   - Word-level timestamps
   - Speaker diarization

2. **AI Extraction** (Claude)
   - Identifies quotes, stats, hot takes, stories, clips
   - Scores by engagement potential
   - Links product mentions

3. **Content Generation** (Claude)
   - Creates platform-specific versions
   - Applies voice profile
   - Adds hashtags and CTAs

### Auto-Processing

Processing auto-triggers when content is ingested via `/api/ingest`. To disable:

```json
{ "autoProcess": false }
```

### Manual Processing

```bash
curl -X POST http://localhost:3000/api/process \
  -H "Content-Type: application/json" \
  -d '{
    "sourceId": "your-source-id",
    "steps": ["transcribe", "extract", "generate"]
  }'
```

---

## Publishing

Content Refinery can publish approved content directly to social platforms.

### Supported Platforms

| Platform | Status | Auth Method |
|----------|--------|-------------|
| Twitter/X | ✅ Ready | OAuth 1.0a |
| Instagram | 🚧 Planned | Meta Business API |
| Facebook | 🚧 Planned | Meta Business API |
| LinkedIn | 🚧 Planned | OAuth 2.0 |
| TikTok | 🚧 Planned | OAuth 2.0 |

### Twitter Publishing

Required environment variables:
```env
TWITTER_API_KEY=consumer_key
TWITTER_API_SECRET=consumer_secret
TWITTER_ACCESS_TOKEN=access_token
TWITTER_ACCESS_SECRET=access_token_secret
```

Publish via API:
```bash
curl -X POST http://localhost:3000/api/publish \
  -H "Content-Type: application/json" \
  -d '{ "contentId": "your-content-id", "immediate": true }'
```

Or use the "Publish Now" button in the Review Queue.

### Publishing Flow

1. Content goes through Review Queue
2. Team member clicks "Approve" or "Approve & Publish"
3. If approved only, can publish later from Approved tab
4. Publishing posts to platform and saves URL back to database

---

## AudioRoad Integration

AudioRoad can send episodes directly to Content Refinery.

### Client Library

Copy `src/lib/client/audioroad-client.ts` to your AudioRoad app.

```typescript
import { sendEpisodeToContentRefinery } from './audioroad-client';

const result = await sendEpisodeToContentRefinery({
  title: 'TBB Episode 2847',
  audioUrl: 'https://storage.com/episode.mp3',
  showName: 'Trucking Business & Beyond',
  episodeNumber: 2847,
});

console.log('Processing started:', result.sourceId);
```

### Environment Setup

In AudioRoad's `.env`:
```env
CONTENT_REFINERY_URL=https://content-refinery.onrender.com
CONTENT_REFINERY_API_KEY=cr_audioroad_xxxxx
```

---

## Content Creation Wizard

The wizard (`/create`) provides a 7-step AI-guided flow to create social media content:

### Steps
1. **Source** - Choose starting point (idea, guide, episode, product, testimonial, TruckTales)
2. **Interview** - AI asks clarifying questions to refine the message
3. **Content** - AI generates 3 content variations, user selects one
4. **Platforms** - Select target platforms (Instagram, Facebook, LinkedIn, Twitter, TikTok)
5. **Visuals** - Gamma generates on-brand graphics for each platform
6. **Review** - Final check with brand compliance validation
7. **Publish** - Schedule, post now, add to queue, or save as draft

### Key Features
- **AI Co-Pilot**: Persistent AI assistant panel available at every step
- **Brand Compliance**: Auto-checks for banned terms ("trucker", etc.)
- **Quick Create**: One-click mode where AI handles everything
- **Multi-Platform**: Generate content for multiple platforms simultaneously

### Technical Stack
- **State**: Zustand store (`src/app/create/store.ts`)
- **UI**: Step components in `src/app/create/components/steps/`
- **AI**: `/api/ai/chat` for assistant, `/api/create/generate` for content
- **Visuals**: Gamma API integration via `/api/gamma/generate`

### File Structure
```
src/app/create/
├── page.tsx           # Main wizard container
├── layout.tsx         # Wizard layout
├── store.ts           # Zustand state management
└── components/
    ├── WizardProgress.tsx
    ├── WizardNavigation.tsx
    ├── ai/
    │   └── AIAssistantPanel.tsx
    └── steps/
        ├── Step1Source.tsx
        ├── Step2Interview.tsx
        ├── Step3Content.tsx
        ├── Step4Platforms.tsx
        ├── Step5Visuals.tsx
        ├── Step6Review.tsx
        └── Step7Publish.tsx
```

---

## Campaign Wizard System

The Campaign Wizard (`/campaigns/create`) provides an 8-step flow to create complete marketing campaigns from PDF lead magnets.

### Lead Magnet Library
- **Model**: LeadMagnet (title, slug, fileUrl, extractedData, etc.)
- **API**:
  - `GET /api/lead-magnets` - List all lead magnets
  - `POST /api/lead-magnets` - Upload new lead magnet (multipart form)
  - `GET /api/lead-magnets/[id]` - Get single lead magnet
  - `PATCH /api/lead-magnets/[id]` - Update lead magnet
  - `DELETE /api/lead-magnets/[id]` - Delete lead magnet and R2 file
- **Extraction**: `POST /api/lead-magnets/extract` - AI reads PDF and extracts key messages, stats, hooks

### Landing Page Generation
- **Model**: LandingPage (template, gammaUrl, etc.)
- **Templates**: lead_magnet, challenge, waitlist, product_launch (defined in `src/lib/landing-pages/templates.ts`)
- **API**: `POST /api/landing-pages/generate` - Calls Gamma API to create landing page

### Wizard Flow
1. **Lead Magnet** - Select existing PDF or upload new one
2. **Template** - Choose landing page template (AI recommends based on content)
3. **Content** - Review and edit AI-extracted key messages and hooks
4. **Schedule** - Set campaign start date and duration
5. **Platforms** - Select social platforms and posting frequency
6. **Emails** - Generate AI nurture email sequence (optional)
7. **Review** - Final review of all settings
8. **Generate** - Creates landing page via Gamma, then generates all campaign posts

### Wizard Components
```
src/app/campaigns/create/
├── page.tsx                         # Main wizard with 8 steps
└── components/
    ├── Step1LeadMagnet.tsx         # Library browse + upload
    ├── Step2Template.tsx           # Template selection with AI recommendation
    ├── Step3Review.tsx             # Content review and editing
    └── StepEmailSequence.tsx       # Email nurture sequence generation
```

### Scripts
- `npm run migrate:lead-magnets` - Import existing R2 PDFs into database

---

## Email Marketing System

Complete email marketing integration with Constant Contact for lead nurturing.

### Product Catalog
- **File**: `src/lib/products/catalog.ts`
- **Products**: 40+ products from store.letstruck.com mapped to lead magnets
- **Categories**: supplement, food, equipment, testing, trucking, program
- **API**: `GET /api/products` - List products with filtering
  - `?leadMagnetSlug=xxx` - Get products recommended for a lead magnet
  - `?kevinsDaily=true` - Get Kevin's daily stack only
  - `?category=supplement` - Filter by category
  - `?search=cardio` - Search products

### AI Email Sequence Generator
- **File**: `src/lib/email/sequence-generator.ts`
- **Function**: `generateEmailSequence(input)` - Creates nurture sequences using Claude
- **Sequence Lengths**:
  - 3 emails: Day 2 value, Day 4 value, Day 7 soft pitch
  - 5 emails: Day 2, 4, 7, 10, 14 (default)
  - 7 emails: Day 2, 4, 6, 9, 12, 15, 21
- **Email Purposes**:
  - `value` - Pure education, no selling
  - `engagement` - Build relationship, encourage replies
  - `soft_pitch` - Mention product naturally within value content
  - `hard_pitch` - Direct promotion with strong CTA

### Email Templates
- **File**: `src/lib/email/templates/lead-magnet-delivery.ts`
- **Templates**:
  - `generateLeadMagnetDeliveryEmail()` - Welcome email with download link
  - `generateDownloadReminderEmail()` - 24-hour reminder if not downloaded
- **Branding**: Dark theme (#0D0D0D), orange accent (#FF4500), Let's Truck header

### Email Sequences API
- `GET /api/email-sequences` - List all sequences
- `POST /api/email-sequences` - Create new sequence (with AI generation)
- `GET /api/email-sequences/[id]` - Get sequence with all emails
- `PATCH /api/email-sequences/[id]` - Update sequence or regenerate email
- `DELETE /api/email-sequences/[id]` - Delete sequence and emails
- `PATCH /api/email-sequences/[id]/emails/[emailId]` - Update individual email

### Email Lists API (Constant Contact)
- `GET /api/email/lists` - Get all CC lists
- `POST /api/email/lists` - Create new CC list

### Database Models

```prisma
model EmailSequence {
  id              String    @id @default(uuid())
  name            String
  campaignId      String?   @unique
  leadMagnetId    String?
  listId          String?   // Constant Contact list ID
  sequenceLength  Int       @default(5)
  productId       String?
  productName     String?
  productUrl      String?
  status          String    @default("draft")  // draft, generating, active, paused, completed, failed
  emails          Email[]
  campaign        Campaign?
  leadMagnet      LeadMagnet?
}

model Email {
  id              String    @id @default(uuid())
  sequenceId      String
  order           Int       // 1-7
  sendDelayDays   Int       // Days after sequence start
  subject         String
  preheader       String?
  bodyHtml        String    @db.Text
  bodyText        String?   @db.Text
  purpose         String    // value, engagement, soft_pitch, hard_pitch
  sendCount       Int       @default(0)
  openCount       Int       @default(0)
  clickCount      Int       @default(0)
  status          String    @default("draft")
  sequence        EmailSequence @relation(...)
}
```

### Lead Tracking
- **Model**: Lead (email, firstName, lastName, downloadToken, status, etc.)
- **Download Tracking**: Token-based URLs for analytics
- **Engagement Metrics**: emailOpens, emailClicks, lastEngagedAt

### Usage Example

```typescript
// Generate email sequence for a lead magnet
const response = await fetch("/api/email-sequences", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    leadMagnetId: "lead-magnet-uuid",
    sequenceLength: 5,
    productName: "Cardio Miracle",
    productUrl: "https://store.letstruck.com/products/cardio-miracle"
  })
});

const { sequence, recommendedProducts } = await response.json();
// sequence.emails contains 5 AI-generated emails
```

---

## Future Enhancements (Backlog)

- [x] ~~Gamma API integration~~ ✅ DONE
- [x] ~~Content Creation Wizard~~ ✅ DONE
- [x] ~~Processing Pipeline~~ ✅ DONE
- [x] ~~Twitter Publishing~~ ✅ DONE
- [x] ~~AudioRoad Integration~~ ✅ DONE
- [x] ~~Email integration (AI nurture sequences, product catalog)~~ ✅ DONE
- [ ] Instagram/Facebook publishing (Meta Business API)
- [ ] LinkedIn publishing
- [ ] Video clip extraction with AI scene detection
- [ ] Audiogram generation with waveform visualization
- [ ] A/B testing of content variations
- [ ] Influencer/ambassador content coordination
- [ ] Community-generated content curation
- [ ] Real-time trend response system
- [ ] AI-assisted reply/comment management
- [ ] Calendar view for content scheduling
- [ ] Analytics dashboard
- [ ] Batch approval/rejection in queue
