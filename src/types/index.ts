// Content Types
export type ContentType = 
  | "quote" 
  | "stat" 
  | "hot_take" 
  | "story" 
  | "clip" 
  | "product_mention";

export type Platform = 
  | "twitter" 
  | "instagram" 
  | "facebook" 
  | "linkedin" 
  | "tiktok" 
  | "youtube";

export type ContentStatus = 
  | "draft" 
  | "pending_review" 
  | "approved" 
  | "scheduled" 
  | "published" 
  | "failed";

export type SourceType = 
  | "audio" 
  | "video" 
  | "text" 
  | "url";

export type ProcessingStatus = 
  | "pending" 
  | "processing" 
  | "completed" 
  | "failed";

// Source (uploaded content)
export interface Source {
  id: string;
  title: string;
  sourceType: SourceType;
  fileUrl?: string;
  durationSeconds?: number;
  status: ProcessingStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Transcript
export interface Transcript {
  id: string;
  sourceId: string;
  fullText: string;
  wordTimestamps?: WordTimestamp[];
  speakers?: SpeakerSegment[];
  createdAt: Date;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface SpeakerSegment {
  speaker: number;
  start: number;
  end: number;
}

// Extraction (content piece extracted from source)
export interface Extraction {
  id: string;
  sourceId: string;
  transcriptId: string;
  type: ContentType;
  text: string;
  startTime?: number;
  endTime?: number;
  confidence: number;
  productIds?: string[];
  createdAt: Date;
}

// Generated Content (platform-specific post)
export interface GeneratedContent {
  id: string;
  extractionId: string;
  platform: Platform;
  text: string;
  hashtags?: string[];
  mediaUrl?: string;
  mediaGuidance?: string;
  status: ContentStatus;
  scheduledFor?: Date;
  publishedAt?: Date;
  platformPostId?: string;
  engagement?: EngagementData;
  createdAt: Date;
  updatedAt: Date;
}

export interface EngagementData {
  likes?: number;
  shares?: number;
  comments?: number;
  impressions?: number;
  clicks?: number;
}

// Product (from Shopify)
export interface Product {
  id: string;
  shopifyId: string;
  title: string;
  description?: string;
  price: number;
  url: string;
  imageUrl?: string;
  tags?: string[];
  syncedAt: Date;
}

// UI Types
export interface QueueItem {
  content: GeneratedContent;
  extraction: Extraction;
  source: Source;
  products?: Product[];
}

export interface CalendarDay {
  date: Date;
  posts: GeneratedContent[];
  coverage: {
    twitter: number;
    instagram: number;
    facebook: number;
    linkedin: number;
    tiktok: number;
    youtube: number;
  };
}

export interface AnalyticsSummary {
  totalPosts: number;
  totalImpressions: number;
  totalEngagements: number;
  topPerformers: GeneratedContent[];
  platformBreakdown: Record<Platform, {
    posts: number;
    impressions: number;
    engagements: number;
  }>;
  contentTypePerformance: Record<ContentType, {
    posts: number;
    avgEngagement: number;
  }>;
}
