# Multi-App Integration Guide

This guide shows how to integrate each source app with Content Refinery.

## Prerequisites

1. Content Refinery deployed and running
2. Database seeded with source apps: `npx prisma db seed`
3. API keys saved from seed output

---

## 1. AudioRoad Console Integration

**Path:** `/Users/kr/Development/AudioRoad Console`

### Step 1: Add Environment Variable

```bash
# In AudioRoad Console .env
CONTENT_REFINERY_URL=https://content-refinery.onrender.com
CONTENT_REFINERY_API_KEY=cr_xxxxxxxxxxxxxxxx
```

### Step 2: Create Integration Module

Create `lib/content-refinery.js`:

```javascript
/**
 * Content Refinery Integration for AudioRoad
 */

const CONTENT_REFINERY_URL = process.env.CONTENT_REFINERY_URL || 'https://content-refinery.onrender.com';
const API_KEY = process.env.CONTENT_REFINERY_API_KEY;

async function sendToContentRefinery(contentType, payload) {
  const response = await fetch(`${CONTENT_REFINERY_URL}/api/ingest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'audioroad',
      contentType,
      ...payload,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Send completed episode to Content Refinery
 */
async function sendEpisode(call, show) {
  return sendToContentRefinery('episode', {
    title: `${show.name} - ${new Date(call.started_at).toLocaleDateString()}`,
    audioUrl: call.recording_url,
    transcript: call.transcript,
    metadata: {
      showId: show.id,
      showName: show.name,
      duration: call.duration_seconds,
      sentiment: call.sentiment,
      aiSummary: call.ai_summary,
    },
  });
}

/**
 * Send caller segment for marketing
 */
async function sendCallerSegment(call, callerProfile) {
  return sendToContentRefinery('caller_segment', {
    title: `Caller Story: ${callerProfile?.name || 'Anonymous Driver'}`,
    audioUrl: call.recording_url,
    transcript: call.transcript,
    metadata: {
      callerName: callerProfile?.name,
      topic: call.ai_summary,
    },
  });
}

module.exports = {
  sendEpisode,
  sendCallerSegment,
};
```

### Step 3: Add to Call Completion Flow

In `models/Call.js` or wherever calls are completed:

```javascript
const { sendEpisode } = require('../lib/content-refinery');
const Show = require('./Show');

async function endCall(twilioCallSid, durationSeconds) {
  // ... existing code ...
  
  // After call is completed and has recording
  if (call.recording_url && call.transcript) {
    const show = await Show.getShowById(call.show_id);
    
    try {
      const result = await sendEpisode(call, show);
      console.log(`Sent to Content Refinery: ${result.sourceId}`);
    } catch (error) {
      console.error('Failed to send to Content Refinery:', error);
      // Don't block the call completion
    }
  }
  
  return call;
}
```

### Step 4: Add Manual "Send to Marketing" Button (Optional)

In the Host/Screener dashboard, add a button that calls:

```javascript
// API endpoint: POST /api/calls/:callId/send-to-marketing
app.post('/api/calls/:callId/send-to-marketing', async (req, res) => {
  const { callId } = req.params;
  
  const call = await Call.getCallById(callId);
  const show = await Show.getShowById(call.show_id);
  
  const result = await sendEpisode(call, show);
  
  res.json({ success: true, sourceId: result.sourceId });
});
```

---

## 2. Health Coaching App Integration

**Path:** `/Users/kr/Development/fntp-ai-assessment-tool`

### Step 1: Add Environment Variable

```bash
# In .env
CONTENT_REFINERY_URL=https://content-refinery.onrender.com
CONTENT_REFINERY_API_KEY=cr_xxxxxxxxxxxxxxxx
```

### Step 2: Create Integration Module

Create `server/lib/content-refinery.ts`:

```typescript
/**
 * Content Refinery Integration for Health Coaching App
 */

const CONTENT_REFINERY_URL = process.env.CONTENT_REFINERY_URL || 'https://content-refinery.onrender.com';
const API_KEY = process.env.CONTENT_REFINERY_API_KEY;

interface IngestResponse {
  success: boolean;
  sourceId: string;
  status: string;
  message: string;
}

async function sendToContentRefinery(contentType: string, payload: any): Promise<IngestResponse> {
  const response = await fetch(`${CONTENT_REFINERY_URL}/api/ingest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'health-coaching',
      contentType,
      ...payload,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Send client success story to Content Refinery
 */
export async function sendSuccessStory(client: any, progress: any[], protocol: any) {
  const initialAssessment = client.assessments?.[0];
  const latestProgress = progress[progress.length - 1];
  
  return sendToContentRefinery('success_story', {
    title: `Client Transformation: ${client.name.split(' ')[0]}`, // First name only
    data: {
      clientInitials: client.name.split(' ').map((n: string) => n[0]).join(''),
      initialBurden: initialAssessment?.totalBurden,
      currentProgress: {
        energyLevel: latestProgress?.energyLevel,
        sleepQuality: latestProgress?.sleepQuality,
        digestion: latestProgress?.digestion,
      },
      weeksInProgram: progress.length,
      keyImprovements: calculateImprovements(progress),
      protocolHighlights: protocol?.phases?.map((p: any) => p.phase),
      supplements: protocol?.phases?.flatMap((p: any) => 
        p.supplements?.map((s: any) => ({ name: s.name, purpose: s.purpose }))
      ),
    },
    metadata: {
      isTruckDriver: client.isTruckDriver,
      driverType: client.driverType,
      gender: client.gender,
    },
  });
}

/**
 * Send research document for marketing content
 */
export async function sendResearchInsight(doc: any) {
  return sendToContentRefinery('research_insight', {
    title: doc.title,
    text: doc.summary || doc.content.substring(0, 2000),
    metadata: {
      source: doc.source,
      categories: doc.categories,
      tags: doc.tags,
    },
  });
}

/**
 * Send protocol template for educational content
 */
export async function sendProtocol(phase: any) {
  return sendToContentRefinery('protocol', {
    title: phase.phase,
    data: {
      phaseName: phase.phase,
      focus: phase.lifestyleRecs,
      supplements: phase.supplements?.map((s: any) => ({
        name: s.name,
        dosage: s.dosage,
        purpose: s.purpose,
      })),
      duration: phase.targetDuration,
    },
  });
}

function calculateImprovements(progress: any[]): string[] {
  // Compare first and last progress entries
  const first = progress[0];
  const last = progress[progress.length - 1];
  
  const improvements: string[] = [];
  
  if (last.energyLevel > first.energyLevel) {
    const pct = Math.round(((last.energyLevel - first.energyLevel) / first.energyLevel) * 100);
    improvements.push(`Energy up ${pct}%`);
  }
  
  if (last.sleepQuality > first.sleepQuality) {
    improvements.push('Sleep quality improved');
  }
  
  if (last.digestion > first.digestion) {
    improvements.push('Digestion normalized');
  }
  
  return improvements;
}
```

### Step 3: Add API Endpoint

Create `server/routes/marketing.ts`:

```typescript
import express from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccessStory, sendResearchInsight } from '../lib/content-refinery';

const router = express.Router();

// POST /api/marketing/success-story/:clientId
router.post('/success-story/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        protocol: { include: { phases: { include: { supplements: true } } } },
        weeklyProgress: { orderBy: { submittedAt: 'asc' } },
        assessments: { orderBy: { completedAt: 'asc' } },
      },
    });
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const result = await sendSuccessStory(client, client.weeklyProgress, client.protocol);
    
    res.json({ success: true, sourceId: result.sourceId });
  } catch (error) {
    console.error('Failed to send success story:', error);
    res.status(500).json({ error: 'Failed to send to Content Refinery' });
  }
});

// POST /api/marketing/research/:docId
router.post('/research/:docId', async (req, res) => {
  try {
    const { docId } = req.params;
    
    const doc = await prisma.researchDocument.findUnique({
      where: { id: docId },
    });
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const result = await sendResearchInsight(doc);
    
    res.json({ success: true, sourceId: result.sourceId });
  } catch (error) {
    console.error('Failed to send research insight:', error);
    res.status(500).json({ error: 'Failed to send to Content Refinery' });
  }
});

export default router;
```

### Step 4: Add Button to Client Detail Page

In the client detail UI, add a "Create Marketing Content" button that calls the API.

---

## 3. TruckTales Integration

**Path:** `/Users/kr/Development/trucking-tales`

### Step 1: Add Environment Variable

```bash
# In .env
CONTENT_REFINERY_URL=https://content-refinery.onrender.com
CONTENT_REFINERY_API_KEY=cr_xxxxxxxxxxxxxxxx
```

### Step 2: Create Integration Module

Create `src/lib/content-refinery.ts`:

```typescript
/**
 * Content Refinery Integration for TruckTales
 */

const CONTENT_REFINERY_URL = process.env.CONTENT_REFINERY_URL || 'https://content-refinery.onrender.com';
const API_KEY = process.env.CONTENT_REFINERY_API_KEY;

interface IngestResponse {
  success: boolean;
  sourceId: string;
  status: string;
  message: string;
}

async function sendToContentRefinery(contentType: string, payload: any): Promise<IngestResponse> {
  const response = await fetch(`${CONTENT_REFINERY_URL}/api/ingest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'trucktales',
      contentType,
      ...payload,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Send chapter teaser to Content Refinery
 */
export async function sendChapterTeaser(chapter: any, project: any) {
  // Get first 500 characters as excerpt
  const excerpt = chapter.content?.substring(0, 500) || '';
  
  return sendToContentRefinery('chapter_teaser', {
    title: `${project.title} - Chapter ${chapter.chapterNumber}`,
    text: excerpt,
    metadata: {
      projectId: project.id,
      bookTitle: project.title,
      chapterNumber: chapter.chapterNumber,
      chapterTitle: chapter.title,
      povCharacter: chapter.povCharacter?.fullName,
      genre: project.genre,
      wordCount: chapter.wordCount,
    },
  });
}

/**
 * Send character spotlight to Content Refinery
 */
export async function sendCharacterSpotlight(character: any, project?: any) {
  return sendToContentRefinery('character_spotlight', {
    title: `Meet ${character.fullName}`,
    data: {
      fullName: character.fullName,
      callSign: character.callSign,
      backstory: character.backstory,
      truck: character.truck ? {
        make: character.truck.make,
        model: character.truck.model,
        year: character.truck.year,
        nickname: character.truck.nickname,
      } : undefined,
      personalityTraits: character.personalityTraits,
    },
    metadata: {
      projectId: project?.id,
      bookTitle: project?.title,
      imageUrl: character.imageUrl,
    },
  });
}

/**
 * Send story launch announcement to Content Refinery
 */
export async function sendStoryLaunch(project: any) {
  const protagonist = project.characters?.find((c: any) => c.role === 'protagonist');
  
  return sendToContentRefinery('story_launch', {
    title: `Now Available: ${project.title}`,
    data: {
      logline: project.logline,
      hook: project.synopsis?.substring(0, 200),
      genre: project.genre,
      protagonistName: protagonist?.character?.fullName,
      // coverUrl: project.coverUrl,
    },
    metadata: {
      projectId: project.id,
      targetAudience: 'truckers',
    },
  });
}
```

### Step 3: Add API Route

Create `src/app/api/marketing/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendChapterTeaser, sendCharacterSpotlight, sendStoryLaunch } from '@/lib/content-refinery';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id, projectId } = body;
    
    let result;
    
    switch (type) {
      case 'chapter': {
        const chapter = await prisma.chapter.findUnique({
          where: { id },
          include: { 
            project: true,
            povCharacter: true,
          },
        });
        if (!chapter) throw new Error('Chapter not found');
        result = await sendChapterTeaser(chapter, chapter.project);
        break;
      }
      
      case 'character': {
        const character = await prisma.character.findUnique({
          where: { id },
          include: { truck: true },
        });
        if (!character) throw new Error('Character not found');
        
        let project;
        if (projectId) {
          project = await prisma.project.findUnique({ where: { id: projectId } });
        }
        result = await sendCharacterSpotlight(character, project);
        break;
      }
      
      case 'launch': {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          include: {
            characters: {
              include: { character: true },
              where: { role: 'protagonist' },
            },
          },
        });
        if (!project) throw new Error('Project not found');
        result = await sendStoryLaunch(project);
        break;
      }
      
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    
    return NextResponse.json({ success: true, sourceId: result.sourceId });
    
  } catch (error) {
    console.error('Marketing API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

### Step 4: Add UI Buttons

Add "📤 Send to Marketing" buttons on:
- Chapter page (when status is 'final')
- Character detail page
- Project page (when status is 'complete')

---

## Testing the Integration

### 1. Test from Content Refinery

```bash
# List registered apps
curl https://content-refinery.onrender.com/api/apps

# Check if apps were seeded
# Should show: audioroad, health-coaching, trucktales
```

### 2. Test Ingestion

```bash
# Test AudioRoad ingestion
curl -X POST https://content-refinery.onrender.com/api/ingest \
  -H "Authorization: Bearer cr_YOUR_AUDIOROAD_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "audioroad",
    "contentType": "episode", 
    "title": "Test Episode",
    "transcript": "This is a test transcript about trucker health."
  }'
```

### 3. Check Status

```bash
# Get the sourceId from the response, then:
curl "https://content-refinery.onrender.com/api/ingest?sourceId=YOUR_SOURCE_ID"
```

---

## Summary

| App | Integration File | Trigger |
|-----|------------------|---------|
| AudioRoad | `lib/content-refinery.js` | Call completion + manual button |
| Health Coaching | `server/lib/content-refinery.ts` | Manual button on client/research |
| TruckTales | `src/lib/content-refinery.ts` | Manual button on chapter/character/project |

All apps use the same pattern:
1. Add API key to `.env`
2. Create integration module
3. Add API endpoint
4. Add UI button(s)
