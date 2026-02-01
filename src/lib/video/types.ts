/**
 * Video Production Pipeline Types
 */

export type VideoType = "short" | "standard" | "promo" | "podcast_clip";
export type VideoStatus = "draft" | "scripting" | "generating_audio" | "generating_video" | "assembling" | "complete" | "failed";
export type SceneStatus = "pending" | "audio_ready" | "video_ready" | "complete";

export interface VideoProject {
  id: string;
  title: string;
  description?: string;
  type: VideoType;
  status: VideoStatus;
  
  // Input
  topic: string;
  sourceContent?: string; // Optional: blog post, podcast transcript, etc.
  tone: "educational" | "promotional" | "entertaining" | "inspirational";
  targetDuration: number; // seconds
  
  // Script
  script?: VideoScript;
  
  // Output
  outputUrl?: string;
  thumbnailUrl?: string;
  
  // Metadata for publishing
  youtubeTitle?: string;
  youtubeDescription?: string;
  youtubeTags?: string[];

  // YouTube publishing status
  youtubeVideoId?: string;
  youtubeShortUrl?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  
  // Error tracking
  error?: string;
}

export interface VideoScript {
  hook: string; // Opening hook (first 3 seconds)
  scenes: Scene[];
  callToAction: string;
  totalDuration: number; // estimated seconds
}

export interface Scene {
  id: string;
  order: number;
  status: SceneStatus;
  
  // Content
  narration: string; // What Kevin says
  visualDescription: string; // Prompt for video generation
  textOverlay?: string; // Optional on-screen text
  
  // Timing
  duration: number; // seconds
  startTime: number; // calculated start time in final video
  
  // Generated assets
  audioUrl?: string;
  audioDuration?: number; // actual audio duration
  videoUrl?: string;
  
  // Visual style hints
  visualStyle?: "cinematic" | "documentary" | "energetic" | "calm";
  cameraMovement?: "static" | "slow_pan" | "zoom_in" | "zoom_out" | "tracking";
}

// Content category for video scripts
export type ContentCategory = "health" | "business" | "industry" | "lifestyle" | "fiction" | "general";

export interface VideoGenerationRequest {
  topic: string;
  type: VideoType;
  tone?: "educational" | "promotional" | "entertaining" | "inspirational";
  targetDuration?: number;
  sourceContent?: string;
  contentCategory?: ContentCategory; // Determines voice and visual focus
  style?: {
    visualStyle?: "cinematic" | "documentary" | "energetic" | "calm";
    includeTextOverlays?: boolean;
    musicMood?: "upbeat" | "inspiring" | "calm" | "dramatic";
  };
}

export interface ScriptGenerationResult {
  script: VideoScript;
  estimatedDuration: number;
  sceneCount: number;
}

export interface AudioGenerationResult {
  sceneId: string;
  audioUrl: string;
  duration: number;
}

export interface VideoGenerationResult {
  sceneId: string;
  videoUrl: string;
  duration: number;
}

export interface AssemblyResult {
  outputUrl: string;
  thumbnailUrl?: string;
  duration: number;
  fileSize: number;
}

// Video type configurations
export const VIDEO_TYPE_CONFIG: Record<VideoType, {
  name: string;
  minDuration: number;
  maxDuration: number;
  defaultDuration: number;
  sceneCount: { min: number; max: number };
  aspectRatio: "16:9" | "9:16" | "1:1";
  description: string;
}> = {
  short: {
    name: "YouTube Short / Reel",
    minDuration: 15,
    maxDuration: 60,
    defaultDuration: 45,
    sceneCount: { min: 3, max: 8 },
    aspectRatio: "9:16",
    description: "Quick tips, hooks, viral clips for Shorts/Reels/TikTok"
  },
  standard: {
    name: "Standard YouTube Video",
    minDuration: 300,
    maxDuration: 900,
    defaultDuration: 480,
    sceneCount: { min: 10, max: 30 },
    aspectRatio: "16:9",
    description: "Educational content, tutorials, deep dives"
  },
  promo: {
    name: "Promotional Video",
    minDuration: 15,
    maxDuration: 60,
    defaultDuration: 30,
    sceneCount: { min: 4, max: 10 },
    aspectRatio: "16:9",
    description: "Campaign promotions, product launches, ads"
  },
  podcast_clip: {
    name: "Podcast Clip",
    minDuration: 60,
    maxDuration: 180,
    defaultDuration: 90,
    sceneCount: { min: 3, max: 8 },
    aspectRatio: "16:9",
    description: "Repurposed highlights from podcast episodes"
  }
};

// Kevin's voice configuration
export const KEVIN_VOICE_CONFIG = {
  voiceId: "qsisjxNf01HqgIVFgdwo",
  name: "Kevin Rutherford",
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0.3,
};
