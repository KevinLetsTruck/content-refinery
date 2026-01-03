/**
 * Content Refinery Client
 * 
 * Copy this file to your app to easily send content to Content Refinery.
 * 
 * Usage:
 *   import { ContentRefineryClient } from '@/lib/content-refinery';
 *   
 *   const client = new ContentRefineryClient({
 *     apiKey: process.env.CONTENT_REFINERY_API_KEY!,
 *     source: 'audioroad', // or 'health-coaching', 'trucktales'
 *   });
 *   
 *   await client.sendEpisode({
 *     title: 'TBB Episode 2847',
 *     audioUrl: 'https://...',
 *     transcript: '...',
 *   });
 */

interface ContentRefineryConfig {
  apiKey: string;
  source: 'audioroad' | 'health-coaching' | 'trucktales';
  baseUrl?: string;
}

interface IngestResponse {
  success: boolean;
  sourceId: string;
  status: string;
  message: string;
  processingConfig?: {
    needsTranscription: boolean;
    needsExtraction: boolean;
    voiceProfile: string;
  };
}

interface StatusResponse {
  sourceId: string;
  title: string;
  sourceApp: string;
  contentType: string;
  status: string;
  transcriptCount: number;
  extractionCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// AUDIOROAD CONTENT TYPES
// ============================================

interface EpisodePayload {
  title: string;
  audioUrl: string;
  transcript?: string;
  metadata?: {
    showId?: string;
    showName?: string;
    callerName?: string;
    duration?: number;
    sentiment?: string;
    aiSummary?: string;
  };
}

interface CallerSegmentPayload {
  title: string;
  audioUrl: string;
  transcript?: string;
  metadata?: {
    callerName?: string;
    callerPhone?: string;
    topic?: string;
  };
}

// ============================================
// HEALTH COACHING CONTENT TYPES
// ============================================

interface SuccessStoryPayload {
  title: string;
  data: {
    clientInitials?: string;
    initialBurden?: number;
    currentProgress?: {
      energyLevel?: number;
      sleepQuality?: number;
      digestion?: number;
    };
    weeksInProgram?: number;
    keyImprovements?: string[];
    protocolHighlights?: string[];
    supplements?: { name: string; purpose?: string }[];
  };
  metadata?: {
    isTruckDriver?: boolean;
    driverType?: string;
    gender?: string;
    ageRange?: string;
  };
}

interface ResearchInsightPayload {
  title: string;
  text: string;
  metadata?: {
    source?: string;
    categories?: string[];
    tags?: string[];
  };
}

interface ProtocolPayload {
  title: string;
  data: {
    phaseName?: string;
    focus?: string;
    supplements?: { name: string; dosage?: string; purpose?: string }[];
    lifestyleRecs?: string[];
    duration?: string;
  };
  metadata?: {
    condition?: string;
    severity?: string;
  };
}

// ============================================
// TRUCKTALES CONTENT TYPES
// ============================================

interface ChapterTeaserPayload {
  title: string;
  text: string; // Excerpt or teaser text
  metadata?: {
    projectId?: string;
    bookTitle?: string;
    chapterNumber?: number;
    chapterTitle?: string;
    povCharacter?: string;
    genre?: string;
    wordCount?: number;
  };
}

interface CharacterSpotlightPayload {
  title: string;
  data: {
    fullName: string;
    callSign?: string;
    backstory?: string;
    truck?: {
      make?: string;
      model?: string;
      year?: number;
      nickname?: string;
    };
    personalityTraits?: string[];
  };
  metadata?: {
    projectId?: string;
    bookTitle?: string;
    imageUrl?: string;
  };
}

interface StoryLaunchPayload {
  title: string;
  data: {
    logline: string;
    hook?: string;
    genre: string;
    protagonistName?: string;
    coverUrl?: string;
    releaseDate?: string;
  };
  metadata?: {
    projectId?: string;
    targetAudience?: string;
  };
}

// ============================================
// CLIENT CLASS
// ============================================

export class ContentRefineryClient {
  private apiKey: string;
  private source: string;
  private baseUrl: string;

  constructor(config: ContentRefineryConfig) {
    this.apiKey = config.apiKey;
    this.source = config.source;
    this.baseUrl = config.baseUrl || 'https://content-refinery.onrender.com';
  }

  private async send(contentType: string, payload: any): Promise<IngestResponse> {
    const response = await fetch(`${this.baseUrl}/api/ingest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: this.source,
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

  async checkStatus(sourceId: string): Promise<StatusResponse> {
    const response = await fetch(
      `${this.baseUrl}/api/ingest?sourceId=${sourceId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ============================================
  // AUDIOROAD METHODS
  // ============================================

  async sendEpisode(payload: EpisodePayload): Promise<IngestResponse> {
    return this.send('episode', {
      title: payload.title,
      audioUrl: payload.audioUrl,
      transcript: payload.transcript,
      metadata: payload.metadata,
    });
  }

  async sendCallerSegment(payload: CallerSegmentPayload): Promise<IngestResponse> {
    return this.send('caller_segment', {
      title: payload.title,
      audioUrl: payload.audioUrl,
      transcript: payload.transcript,
      metadata: payload.metadata,
    });
  }

  // ============================================
  // HEALTH COACHING METHODS
  // ============================================

  async sendSuccessStory(payload: SuccessStoryPayload): Promise<IngestResponse> {
    return this.send('success_story', {
      title: payload.title,
      data: payload.data,
      metadata: payload.metadata,
    });
  }

  async sendResearchInsight(payload: ResearchInsightPayload): Promise<IngestResponse> {
    return this.send('research_insight', {
      title: payload.title,
      text: payload.text,
      metadata: payload.metadata,
    });
  }

  async sendProtocol(payload: ProtocolPayload): Promise<IngestResponse> {
    return this.send('protocol', {
      title: payload.title,
      data: payload.data,
      metadata: payload.metadata,
    });
  }

  // ============================================
  // TRUCKTALES METHODS
  // ============================================

  async sendChapterTeaser(payload: ChapterTeaserPayload): Promise<IngestResponse> {
    return this.send('chapter_teaser', {
      title: payload.title,
      text: payload.text,
      metadata: payload.metadata,
    });
  }

  async sendCharacterSpotlight(payload: CharacterSpotlightPayload): Promise<IngestResponse> {
    return this.send('character_spotlight', {
      title: payload.title,
      data: payload.data,
      metadata: payload.metadata,
    });
  }

  async sendStoryLaunch(payload: StoryLaunchPayload): Promise<IngestResponse> {
    return this.send('story_launch', {
      title: payload.title,
      data: payload.data,
      metadata: payload.metadata,
    });
  }
}

export default ContentRefineryClient;
