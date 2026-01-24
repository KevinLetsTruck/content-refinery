# Integrated Funnel Builder - Claude Code Implementation Prompt

## Overview

Build an integrated campaign funnel builder in Content Refinery that creates a complete marketing funnel in one workflow:
- Landing page with email capture
- Lead magnet (PDF upload or URL)
- Email nurture sequence (AI-generated)
- Social posts (all driving to landing page)
- Constant Contact integration

## Project Context

- **Project Path:** `/Users/kr/Development/content-refinery`
- **Framework:** Next.js 14 with App Router
- **Database:** Prisma + PostgreSQL
- **Storage:** Cloudflare R2 (already configured)
- **Email:** Constant Contact (OAuth already working)

## Existing Code to Reference

```
src/lib/landing-pages/          # Landing page types, templates, storage
src/lib/constant-contact/       # CC client with OAuth
src/lib/campaigns/              # Campaign manager, strategy generator
src/app/lp/[slug]/              # Landing page templates (LeadMagnet, Challenge, ProductLaunch)
src/app/campaigns/create/       # Existing campaign wizard (reference for UI patterns)
```

## Files to Create

### 1. Types: `src/lib/funnels/types.ts`

```typescript
/**
 * Funnel Builder Types
 */

export type FunnelType = "lead_magnet" | "challenge" | "product_launch";
export type FunnelStatus = "draft" | "generating" | "review" | "active" | "paused" | "completed";

export interface Funnel {
  id: string;
  name: string;
  type: FunnelType;
  status: FunnelStatus;
  
  // Goal
  goal: "email_signups" | "sales" | "awareness";
  
  // Lead Magnet
  leadMagnet?: {
    title: string;
    description: string;
    fileUrl: string;        // R2 URL or external URL
    fileName?: string;
    fileType?: string;
    generatedWithGamma?: boolean;
  };
  
  // Landing Page
  landingPage: {
    slug: string;
    headline: string;
    subheadline?: string;
    benefits: string[];
    ctaText: string;
    template: "lead_magnet" | "challenge" | "product_launch";
  };
  
  // Email Sequence
  emailSequence: {
    listId: string;         // Constant Contact list ID
    listName: string;
    emails: FunnelEmail[];
  };
  
  // Social Campaign
  socialCampaign: {
    platforms: string[];
    postsPerDay: Record<string, number>;
    durationDays: number;
    startDate: string;
    posts: FunnelPost[];
  };
  
  // Tracking
  createdAt: string;
  updatedAt: string;
  launchedAt?: string;
  
  // Analytics
  stats?: {
    landingPageViews: number;
    emailSignups: number;
    emailOpens: number;
    emailClicks: number;
    socialImpressions: number;
    socialClicks: number;
  };
}

export interface FunnelEmail {
  id: string;
  order: number;
  subject: string;
  previewText: string;
  body: string;           // HTML content
  sendDelay: number;      // Hours after signup (0 = immediate)
  purpose: string;        // e.g., "Welcome + deliver lead magnet", "Value + story", etc.
  status: "draft" | "scheduled" | "sent";
}

export interface FunnelPost {
  id: string;
  platform: "twitter" | "facebook" | "instagram" | "linkedin";
  content: string;
  hashtags: string[];
  dayNumber: number;
  scheduledFor?: string;
  landingPageUrl: string;
  status: "draft" | "scheduled" | "published";
}

export interface CreateFunnelInput {
  name: string;
  type: FunnelType;
  goal: "email_signups" | "sales" | "awareness";
  
  // Topic/content basis
  topic: string;
  sourceContent?: string;   // Optional: paste content to base funnel on
  
  // Lead magnet (one of these)
  leadMagnetFile?: File;    // Upload
  leadMagnetUrl?: string;   // External URL
  generateLeadMagnet?: {    // Generate with Gamma
    title: string;
    outline: string[];
  };
  
  // Landing page customization
  landingPage: {
    headline?: string;      // AI generates if not provided
    benefits?: string[];    // AI generates if not provided
    ctaText?: string;
  };
  
  // Email sequence
  emailCount?: number;      // Default: 5
  
  // Social campaign
  platforms: string[];
  postsPerDay: Record<string, number>;
  durationDays: number;
  startDate: string;
}
```

### 2. Funnel Storage: `src/lib/funnels/storage.ts`

Create in-memory storage (like landing pages) with CRUD operations:
- `createFunnel(data)` 
- `getFunnel(id)`
- `updateFunnel(id, updates)`
- `listFunnels()`
- `deleteFunnel(id)`

### 3. Lead Magnet Handler: `src/lib/funnels/lead-magnet.ts`

```typescript
/**
 * Handle lead magnet upload to R2
 * Reference existing R2 code patterns in the codebase
 */

export async function uploadLeadMagnet(
  file: File,
  funnelId: string
): Promise<{ url: string; fileName: string }> {
  // Upload to R2 bucket
  // Return public URL
}

export async function generateLeadMagnetWithGamma(
  title: string,
  outline: string[],
  topic: string
): Promise<{ url: string; title: string }> {
  // Use existing Gamma API integration
  // Reference: Check if there's existing Gamma code in the project
}
```

### 4. Email Sequence Generator: `src/lib/funnels/email-generator.ts`

```typescript
import Anthropic from "@anthropic-ai/sdk";

/**
 * Generate email nurture sequence with Claude
 */
export async function generateEmailSequence(params: {
  funnelName: string;
  funnelType: FunnelType;
  topic: string;
  leadMagnetTitle: string;
  landingPageUrl: string;
  emailCount: number;
  keyMessages?: string[];
}): Promise<FunnelEmail[]> {
  // Use Claude to generate email sequence
  // Follow NDK brand voice guidelines
  // Include proper send delays (0, 24, 48, 72, 96 hours, etc.)
}
```

### 5. Social Post Generator: `src/lib/funnels/social-generator.ts`

```typescript
/**
 * Generate social posts that drive to landing page
 * All posts should include the landing page URL
 */
export async function generateSocialPosts(params: {
  funnelName: string;
  topic: string;
  landingPageUrl: string;
  platforms: string[];
  postsPerDay: Record<string, number>;
  durationDays: number;
  keyMessages?: string[];
  leadMagnetTitle?: string;
}): Promise<FunnelPost[]> {
  // Use Claude to generate posts
  // Follow Let's Truck brand voice
  // Every post should have a CTA to the landing page
}
```

### 6. Funnel Builder Orchestrator: `src/lib/funnels/funnel-builder.ts`

```typescript
/**
 * Main orchestrator that creates the complete funnel
 */
export async function createFunnel(input: CreateFunnelInput): Promise<Funnel> {
  // 1. Create funnel record (status: generating)
  // 2. Handle lead magnet (upload, URL, or Gamma generation)
  // 3. Create landing page (using existing landing page system)
  // 4. Create/get Constant Contact list
  // 5. Generate email sequence
  // 6. Generate social posts
  // 7. Update funnel status to "review"
  // Return complete funnel
}
```

### 7. API Routes

#### `src/app/api/funnels/route.ts`
- GET: List all funnels
- POST: Create new funnel (starts generation)

#### `src/app/api/funnels/[id]/route.ts`
- GET: Get funnel details
- PUT: Update funnel
- DELETE: Delete funnel
- POST with action=launch: Activate funnel

#### `src/app/api/funnels/upload/route.ts`
- POST: Upload lead magnet file to R2

### 8. UI: `src/app/funnels/page.tsx`

Dashboard listing all funnels with:
- Status badges
- Quick stats (signups, opens)
- Actions (edit, launch, pause, delete)

### 9. UI: `src/app/funnels/create/page.tsx`

Multi-step wizard with these steps:

```
Step 1: Funnel Type
├── Lead Magnet Funnel (capture emails with free content)
├── Challenge Funnel (multi-day engagement sequence)  
└── Product Launch Funnel (awareness → purchase)

Step 2: Lead Magnet
├── Upload PDF file
├── Enter URL to existing content
└── Generate with AI (Gamma integration)
   └── Title + outline inputs

Step 3: Landing Page
├── Auto-generated headline (editable)
├── Auto-generated benefits (editable)
├── CTA text
├── Preview button
└── Template selection (auto-selected based on funnel type)

Step 4: Email Sequence
├── Select/create Constant Contact list
├── Number of emails (3, 5, 7)
├── Preview generated emails
└── Edit individual emails

Step 5: Social Campaign
├── Platform selection (Twitter, Facebook, Instagram, LinkedIn)
├── Posts per day per platform
├── Duration (days)
├── Start date
├── Preview generated posts

Step 6: Review & Launch
├── Funnel summary
├── Landing page preview link
├── Email sequence summary
├── Social calendar preview
├── Launch button
```

## UI Design Guidelines

Reference the existing campaign wizard at `src/app/campaigns/create/page.tsx` for:
- Dark theme styling (#0D0D0D background, #1A1A1A cards, #2A2A2A borders)
- Orange accent color (#FF4500)
- Step progress indicator
- Form input styling
- Loading states

## Integration Points

### Landing Pages
- Use `saveLandingPage()` from `src/lib/landing-pages/storage.ts`
- Slug format: `{funnel-name-slug}` (e.g., "blood-sugar-guide")
- URL will be: `https://content-refinery-07dc.onrender.com/lp/{slug}`

### Constant Contact
- Use `getConstantContactClient()` from `src/lib/constant-contact/client.ts`
- Create list if needed: `client.createList(name)`
- Landing page form already submits to CC via `constantContactListId` field

### R2 Storage
- Check for existing R2 upload utilities in the codebase
- Public URL format: `https://pub-d59c37ec939745f3afaf711a84690049.r2.dev/{path}`

## Brand Voice for AI Generation

When generating content, include these guidelines in prompts:

```
BRAND VOICE:
- Authentic, experienced trucker perspective
- Educational but conversational
- Direct and practical - drivers are busy
- Use "driver" or "owner-operator" not "trucker"
- No CB radio handles or truck nicknames
- Reference NDK (Nutrient Dense Keto) protocol
- Focus on actionable advice
- Challenge mainstream nutrition advice
- Emphasize: animal-based, 70-80% fats, low carb
```

## Acceptance Criteria

1. ✅ Can create a new funnel from the wizard
2. ✅ Can upload a PDF lead magnet (stored in R2)
3. ✅ Landing page is auto-created and accessible at `/lp/{slug}`
4. ✅ Email sequence is generated and viewable
5. ✅ Social posts are generated with landing page URLs
6. ✅ Constant Contact list is created/selected
7. ✅ Can preview all components before launch
8. ✅ Funnel dashboard shows all funnels with status

## Execution Order

1. Create types file first
2. Create storage utilities
3. Create lead magnet upload handler
4. Create email generator
5. Create social post generator
6. Create orchestrator
7. Create API routes
8. Create dashboard UI
9. Create wizard UI
10. Test end-to-end flow

## Notes

- Start with in-memory storage (like landing pages), can migrate to DB later
- Email sending will be manual initially (export for Constant Contact)
- Social posting will be manual initially (copy to scheduler)
- Focus on content GENERATION first, automation later
