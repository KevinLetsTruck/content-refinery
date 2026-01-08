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
