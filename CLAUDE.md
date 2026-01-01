# CLAUDE.md - Project Knowledge Base

## What Is This Project?

Content Refinery is an automated social media content engine for Let's Truck Health Coaching, founded by Kevin Rutherford, FNTP. It transforms 15+ hours of weekly podcast content into platform-optimized social media posts.

## The Problem We're Solving

Kevin produces massive amounts of valuable content:
- 15 hours/week of podcast content (Trucking Business & Beyond, Destination Health, Power Hour)
- 3 hours/week of group coaching
- 12 comprehensive health guides
- 250+ products in Shopify store
- Years of accumulated wisdom

**But almost none of it gets distributed effectively on social media.**

Agencies have failed because they don't understand:
1. Kevin's voice (direct, no-BS, anti-establishment)
2. The trucking industry context
3. How to connect content to products
4. The volume of content being produced

## The Business

**Let's Truck** serves America's 3.5 million professional truck drivers with:
- Health coaching (letstruck.com)
- Supplement store (store.letstruck.com)
- Radio shows on AudioRoad Network
- Live events and training

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

### From Podcast Episodes
| Type | Description | Platform |
|------|-------------|----------|
| Quotables | 1-3 sentence powerful statements | Twitter, IG, FB |
| Stat Shocks | Surprising statistics | All |
| Hot Takes | Controversial opinions | Twitter, LinkedIn |
| Threads | Multi-part deep dives | Twitter, LinkedIn |
| Audiograms | 30-60 second audio clips with waveform | All |
| Clip Timestamps | Identified moments for video clips | YT Shorts, TikTok |

### From Health Guides
| Type | Description | Platform |
|------|-------------|----------|
| Tip Cards | Single actionable tips | IG, FB |
| Carousels | Multi-slide educational content | IG, LinkedIn |
| Infographics | Visual data representation | All |
| Protocol Snippets | Specific supplement protocols | All |

### Product-Focused
| Type | Description | Platform |
|------|-------------|----------|
| Product Spotlights | Single product deep dive | All |
| Stack Recommendations | Multi-product bundles | All |
| Before/After Frameworks | Results-focused content | IG, FB |

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CONTENT SOURCES                          │
├─────────────────────────────────────────────────────────────────┤
│  Podcast Audio → Deepgram Transcription → Structured Text      │
│  Health Guides → Already structured in project knowledge        │
│  Shopify Products → API sync every 24 hours                    │
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
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONTENT GENERATION                           │
├─────────────────────────────────────────────────────────────────┤
│  For each extraction, generate platform-specific versions:      │
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
│  - Engagement metrics (likes, shares, comments)                │
│  - Click-through tracking                                      │
│  - Conversion attribution (which posts → which sales)          │
│  - Content type performance                                    │
│  - Winner identification for repurposing                       │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema Overview

### Core Tables

**sources**
- Raw uploaded content (audio files, text, URLs)
- Metadata (title, duration, source_type)
- Processing status

**transcripts**
- Full text transcription
- Speaker diarization (if available)
- Word-level timestamps

**extractions**
- Individual content pieces extracted from sources
- Type (quote, stat, clip, hot_take, story)
- Timestamps (start/end for audio)
- Raw text
- Product associations

**generated_content**
- Platform-specific versions of extractions
- Platform (twitter, instagram, facebook, linkedin, tiktok, youtube)
- Content text
- Media attachments
- Status (draft, pending_review, approved, scheduled, published)

**scheduled_posts**
- Approved content with scheduled publish time
- Platform credentials reference
- Retry count for failures

**published_posts**
- Successfully published content
- Platform post ID
- Analytics data

**products**
- Cached Shopify products
- Used for product mention linking

## API Keys & Services

| Service | Purpose | Environment Variable |
|---------|---------|---------------------|
| Supabase | Database, Auth, Storage | SUPABASE_* |
| Anthropic | AI content generation | ANTHROPIC_API_KEY |
| Deepgram | Audio transcription | DEEPGRAM_API_KEY |
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
   - Edit schema in Supabase Dashboard or via migrations
   - Generate types: `npm run db:types`

3. **Testing AI Prompts**
   - Use the `/api/test/extraction` endpoint
   - Check output matches Kevin's voice

4. **Deployment**
   - Push to main branch
   - Render auto-deploys

## Common Tasks

### Adding a New Content Type
1. Add type to `types/content.ts`
2. Create extraction prompt in `lib/ai/prompts/`
3. Create generation prompt for each platform
4. Add UI for review queue

### Adding a New Platform
1. Add platform credentials to env
2. Create publishing function in `lib/social/`
3. Add platform-specific generation prompt
4. Update review queue filters

### Syncing Shopify Products
- Runs automatically every 24 hours
- Manual trigger: `POST /api/shopify/sync`

## Team Member Workflow

1. **Daily**: Check review queue, approve/edit/kill content
2. **Weekly**: Review analytics, identify winners
3. **Monthly**: Suggest new content types or prompts

## Future Enhancements (Backlog)

- [ ] Video clip extraction with AI scene detection
- [ ] Audiogram generation with waveform visualization
- [ ] A/B testing of content variations
- [ ] Influencer/ambassador content coordination
- [ ] Email integration (content → email snippets)
- [ ] Community-generated content curation
- [ ] Real-time trend response system
- [ ] AI-assisted reply/comment management
