# Content Refinery - Development Workflow

## Quick Start (For New Team Members)

### 1. Prerequisites
- Node.js 18+ installed
- A code editor (Cursor recommended, VS Code works too)
- Access to the API keys (ask Kevin or check password manager)

### 2. Get Running Locally

```bash
# Navigate to the project
cd /Users/kr/Development/content-refinery

# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev

# Open in browser
open http://localhost:3000
```

### 3. Required API Keys Setup

Edit `.env.local` and add these keys:

| Service | Where to Get It | Required For |
|---------|-----------------|--------------|
| **Supabase** | supabase.com (create free project) | Database, Auth, Storage |
| **Anthropic** | console.anthropic.com | AI content generation |
| **Deepgram** | console.deepgram.com | Audio transcription |
| **Shopify** | Already configured ✅ | Product catalog |
| **Twitter** | developer.twitter.com | Publishing to X |
| **Meta** | developers.facebook.com | FB/IG publishing |
| **LinkedIn** | linkedin.com/developers | LinkedIn publishing |
| **TikTok** | developers.tiktok.com | TikTok publishing |
| **YouTube** | console.cloud.google.com | YouTube Shorts |

---

## Using Cursor AI with This Project

### Opening the Project
```bash
# Open in Cursor
cursor /Users/kr/Development/content-refinery
```

### Important Files for AI Context
When working with Cursor, make sure it has access to:
- `CLAUDE.md` - Full project context, Kevin's voice, architecture
- `.cursorrules` - Code style, patterns, tech stack
- `supabase/schema.sql` - Database structure

### Effective Prompts for Cursor

**Building new features:**
```
Read CLAUDE.md and .cursorrules first, then build [feature description].
Follow the existing patterns in the codebase.
```

**Debugging:**
```
I'm getting this error: [error message]
Check the relevant files and fix it following the project patterns.
```

**Adding new content types:**
```
Add support for [new content type] following the extraction/generation pattern
in src/lib/ai/claude.ts. Update the types and database schema as needed.
```

### Code Review Checklist
- [ ] Matches Kevin's voice guidelines
- [ ] Uses TypeScript strict mode
- [ ] Server Components by default
- [ ] Proper error handling
- [ ] Zod validation on API routes
- [ ] Mobile-responsive UI

---

## Architecture Overview

```
User uploads podcast
       │
       ▼
┌─────────────────┐
│  /api/sources   │ ← Creates source record, uploads to Supabase Storage
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ /api/transcribe │ ← Sends to Deepgram, saves transcript
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  /api/extract   │ ← Claude analyzes transcript, finds content pieces
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ /api/generate   │ ← Claude creates platform-specific versions
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Review Queue   │ ← Team member approves/edits/rejects
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Publishing    │ ← Auto-posts to social platforms
└─────────────────┘
```

---

## Common Development Tasks

### Adding a New Social Platform

1. **Add environment variables** in `.env.local` and `.env.example`

2. **Create publishing function** in `src/lib/social/`:
```typescript
// src/lib/social/newplatform.ts
export async function publishToNewPlatform(content: GeneratedContent) {
  // Implementation
}
```

3. **Update platform types** in `src/types/index.ts`

4. **Add platform icon** to the queue and other UI components

5. **Create platform-specific prompt** in `src/lib/ai/claude.ts`

### Adding a New Extraction Type

1. **Update type definitions** in `src/types/index.ts`:
```typescript
export type ContentType = 
  | "quote" 
  | "stat" 
  | "hot_take" 
  | "story" 
  | "clip" 
  | "product_mention"
  | "new_type"; // Add here
```

2. **Update extraction prompt** in `src/lib/ai/claude.ts`

3. **Update database** if needed:
```sql
ALTER TYPE content_type ADD VALUE 'new_type';
```

4. **Update UI** to show the new type with appropriate styling

### Running Database Migrations

```bash
# Connect to Supabase and run SQL
# Option 1: Use Supabase Dashboard SQL Editor
# Option 2: Use Supabase CLI
supabase db push
```

---

## Testing

### Manual Testing Flow
1. Start dev server: `npm run dev`
2. Upload a test audio file (use a short clip first)
3. Watch the pipeline process
4. Check the queue for generated content
5. Approve/edit content
6. Verify it's ready for publishing

### Automated Tests (TODO)
```bash
npm run test        # Unit tests
npm run test:e2e    # End-to-end tests
```

---

## Deployment (Render)

### First-Time Setup
1. Create new Web Service on Render
2. Connect to GitHub repo
3. Set environment variables (copy from .env.local)
4. Build command: `npm run build`
5. Start command: `npm start`

### Deploying Updates
- Push to `main` branch → Auto-deploys

### Environment Variables on Render
- Go to Render dashboard → Environment
- Add all variables from `.env.local`
- Restart service after changes

---

## Troubleshooting

### "Failed to transcribe"
- Check Deepgram API key is valid
- Ensure audio file is valid format
- Check file size (max 500MB)

### "Extraction returned empty"
- Check Anthropic API key
- Review transcript quality
- Check Claude's response in console logs

### "Queue not loading"
- Check Supabase connection
- Verify database schema is applied
- Check browser console for errors

### "Publishing failed"
- Verify platform API keys
- Check rate limits
- Review platform-specific error messages

---

## Contact & Resources

- **Project Owner**: Kevin Rutherford
- **Tech Stack Docs**: 
  - [Next.js](https://nextjs.org/docs)
  - [Supabase](https://supabase.com/docs)
  - [Anthropic](https://docs.anthropic.com)
  - [Deepgram](https://developers.deepgram.com)

---

## What's Next (Priority Order)

### Phase 1: Get Core Working
- [ ] Set up Supabase project
- [ ] Add Anthropic API key
- [ ] Add Deepgram API key
- [ ] Test full upload → extract → generate pipeline
- [ ] Process first real podcast episode

### Phase 2: Publishing
- [ ] Connect Twitter API
- [ ] Build scheduling system
- [ ] Add calendar view
- [ ] Auto-publish approved content

### Phase 3: Analytics
- [ ] Track published posts
- [ ] Pull engagement metrics
- [ ] Build analytics dashboard
- [ ] Identify top performers

### Phase 4: Scale
- [ ] Add remaining platforms
- [ ] Build audiogram generator
- [ ] Add video clip extraction
- [ ] A/B testing system
