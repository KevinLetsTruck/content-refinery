/**
 * Constants and Enums for Content Refinery
 *
 * Centralizes magic strings used throughout the codebase
 * to prevent typos and enable better type checking.
 */

// ============================================
// VOICE PROFILES
// ============================================

/**
 * Voice profiles for AI content generation
 */
export const VoiceProfile = {
  KEVIN_HEALTH: "kevin-health",
  TRUCKTALES_STORYTELLER: "trucktales-storyteller",
  TESTIMONIAL: "testimonial",
} as const;

export type VoiceProfile = (typeof VoiceProfile)[keyof typeof VoiceProfile];

/**
 * Voice profile display names
 */
export const VOICE_PROFILE_LABELS: Record<VoiceProfile, string> = {
  [VoiceProfile.KEVIN_HEALTH]: "Kevin Rutherford - Health Authority",
  [VoiceProfile.TRUCKTALES_STORYTELLER]: "TruckTales - Fiction Storyteller",
  [VoiceProfile.TESTIMONIAL]: "Success Story Voice",
};

// ============================================
// PLATFORMS
// ============================================

/**
 * Social media platforms
 */
export const Platform = {
  TWITTER: "twitter",
  INSTAGRAM: "instagram",
  FACEBOOK: "facebook",
  LINKEDIN: "linkedin",
  TIKTOK: "tiktok",
  YOUTUBE: "youtube",
} as const;

export type Platform = (typeof Platform)[keyof typeof Platform];

/**
 * Platform display names
 */
export const PLATFORM_LABELS: Record<Platform, string> = {
  [Platform.TWITTER]: "Twitter/X",
  [Platform.INSTAGRAM]: "Instagram",
  [Platform.FACEBOOK]: "Facebook",
  [Platform.LINKEDIN]: "LinkedIn",
  [Platform.TIKTOK]: "TikTok",
  [Platform.YOUTUBE]: "YouTube",
};

/**
 * Platform character limits
 */
export const PLATFORM_CHAR_LIMITS: Record<Platform, number> = {
  [Platform.TWITTER]: 280,
  [Platform.INSTAGRAM]: 2200,
  [Platform.FACEBOOK]: 63206,
  [Platform.LINKEDIN]: 3000,
  [Platform.TIKTOK]: 2200,
  [Platform.YOUTUBE]: 5000,
};

/**
 * All platform values as array (useful for iteration)
 */
export const ALL_PLATFORMS = Object.values(Platform);

// ============================================
// CONTENT TYPES
// ============================================

/**
 * Types of content extracted from sources
 */
export const ContentType = {
  QUOTE: "quote",
  STAT: "stat",
  HOT_TAKE: "hot_take",
  STORY: "story",
  CLIP: "clip",
  PRODUCT_MENTION: "product_mention",
  TESTIMONIAL: "testimonial",
  TIP: "tip",
  EDUCATIONAL: "educational",
  TEASER: "teaser",
  EXCERPT: "excerpt",
  HOOK: "hook",
  ANNOUNCEMENT: "announcement",
} as const;

export type ContentType = (typeof ContentType)[keyof typeof ContentType];

// ============================================
// CONTENT STATUS
// ============================================

/**
 * Status of generated content
 */
export const ContentStatus = {
  DRAFT: "draft",
  PENDING_REVIEW: "pending_review",
  APPROVED: "approved",
  REJECTED: "rejected",
  SCHEDULED: "scheduled",
  PUBLISHED: "published",
  FAILED: "failed",
} as const;

export type ContentStatus = (typeof ContentStatus)[keyof typeof ContentStatus];

// ============================================
// SOURCE TYPES
// ============================================

/**
 * Types of content sources
 */
export const SourceType = {
  AUDIO: "audio",
  TEXT: "text",
  STRUCTURED: "structured",
} as const;

export type SourceType = (typeof SourceType)[keyof typeof SourceType];

// ============================================
// SOURCE APPS
// ============================================

/**
 * External apps that can send content
 */
export const SourceApp = {
  AUDIOROAD: "audioroad",
  HEALTH_COACHING: "health-coaching",
  TRUCKTALES: "trucktales",
} as const;

export type SourceApp = (typeof SourceApp)[keyof typeof SourceApp];

/**
 * Source app display names
 */
export const SOURCE_APP_LABELS: Record<SourceApp, string> = {
  [SourceApp.AUDIOROAD]: "AudioRoad Broadcast Console",
  [SourceApp.HEALTH_COACHING]: "Health Coaching App",
  [SourceApp.TRUCKTALES]: "TruckTales App",
};

// ============================================
// PROCESSING STATUS
// ============================================

/**
 * Processing status for sources
 */
export const ProcessingStatus = {
  PENDING: "pending",
  TRANSCRIBING: "transcribing",
  TRANSCRIBED: "transcribed",
  EXTRACTING: "extracting",
  EXTRACTED: "extracted",
  GENERATING: "generating",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type ProcessingStatus = (typeof ProcessingStatus)[keyof typeof ProcessingStatus];

// ============================================
// BUSINESS OBJECTIVES
// ============================================

/**
 * Business objectives for content
 */
export const BusinessObjective = {
  LEAD_GEN: "lead_gen",
  PRODUCT_SALES: "product_sales",
  ENGAGEMENT: "engagement",
  EDUCATION: "education",
  BRAND_AWARENESS: "brand_awareness",
} as const;

export type BusinessObjective = (typeof BusinessObjective)[keyof typeof BusinessObjective];

// ============================================
// CONTENT PILLARS
// ============================================

/**
 * Content pillars for Let's Truck
 */
export const ContentPillar = {
  GUT_HEALTH: "gut_health",
  CARDIOVASCULAR: "cardiovascular",
  BLOOD_SUGAR: "blood_sugar",
  SLEEP: "sleep",
  HORMONES: "hormones",
  DETOX: "detox",
  MINDSET: "mindset",
  LIFESTYLE: "lifestyle",
} as const;

export type ContentPillar = (typeof ContentPillar)[keyof typeof ContentPillar];

// ============================================
// API ERROR CODES
// ============================================

/**
 * Standard error codes for API responses
 */
export const ErrorCode = {
  INVALID_REQUEST: "INVALID_REQUEST",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a string is a valid platform
 */
export function isValidPlatform(value: string): value is Platform {
  return ALL_PLATFORMS.includes(value as Platform);
}

/**
 * Check if a string is a valid voice profile
 */
export function isValidVoiceProfile(value: string): value is VoiceProfile {
  return Object.values(VoiceProfile).includes(value as VoiceProfile);
}

/**
 * Check if a string is a valid content status
 */
export function isValidContentStatus(value: string): value is ContentStatus {
  return Object.values(ContentStatus).includes(value as ContentStatus);
}
