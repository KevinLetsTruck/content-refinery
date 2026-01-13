// Campaign types
export type CampaignType = "product_launch" | "educational_series" | "custom";

export type CampaignGoal = "email_signups" | "sales" | "awareness" | "engagement";

export type CampaignStatus = 
  | "draft" 
  | "generating" 
  | "review" 
  | "approved" 
  | "active" 
  | "completed" 
  | "paused";

export type Platform = "twitter" | "facebook" | "instagram" | "youtube";

export type PostStatus = "draft" | "scheduled" | "publishing" | "published" | "failed";

export type VisualType = "gamma" | "dalle" | "stock" | "custom" | "none";

export type VisualStatus = "pending" | "generating" | "ready" | "error";

export type VideoStatus = "pending" | "scripting" | "rendering" | "ready" | "published" | "failed";

// Campaign creation input
export interface CreateCampaignInput {
  name: string;
  description?: string;
  campaignType: CampaignType;
  goal: CampaignGoal;
  productName?: string;
  productUrl?: string;
  topic?: string;
  keyMessages: string[];
  startDate: string; // ISO date
  durationDays: number;
  platforms: Platform[];
  postsPerDay: {
    twitter: number;
    facebook: number;
    instagram: number;
  };
  youtubeShorts: number;
  youtubeStandard: number;
  generateImages?: boolean; // Auto-generate images using DALL-E
  // Email marketing integration
  emailSequenceId?: string; // Link to email sequence for nurture emails
  leadMagnetId?: string; // Link to lead magnet
  // Landing page URL - REQUIRED for posts to include actual links
  landingPageUrl?: string; // Full URL like https://content-refinery.onrender.com/lp/shut-up-digest
}

// AI-generated strategy
export interface CampaignStrategy {
  overview: string;
  phases: CampaignPhaseStrategy[];
  posts: CampaignPostStrategy[];
  videos: CampaignVideoStrategy[];
}

export interface CampaignPhaseStrategy {
  name: string;
  startDay: number;
  endDay: number;
  purpose: string;
  themes: string[];
  hooks: string[];
  ctas: string[];
}

export interface CampaignPostStrategy {
  dayNumber: number;
  platform: Platform;
  contentType: string;
  phase: string;
  content: string;
  hashtags: string[];
  visualType: VisualType;
  visualPrompt: string;
}

export interface CampaignVideoStrategy {
  dayNumber: number;
  videoType: "short" | "standard";
  title: string;
  purpose: string;
  script: {
    hook: string;
    body: string;
    cta: string;
  };
}

// Campaign templates
export const CAMPAIGN_TEMPLATES: Record<CampaignType, {
  phases: Array<{
    name: string;
    daysPercent: number;
    purpose: string;
  }>;
}> = {
  product_launch: {
    phases: [
      { name: "Tease", daysPercent: 15, purpose: "Build curiosity and anticipation" },
      { name: "Announce", daysPercent: 15, purpose: "Reveal the product and key benefits" },
      { name: "Educate", daysPercent: 25, purpose: "Deep dive into benefits and how it works" },
      { name: "Social Proof", daysPercent: 20, purpose: "Share testimonials and results" },
      { name: "Urgency", daysPercent: 15, purpose: "Create scarcity and drive action" },
      { name: "Last Chance", daysPercent: 10, purpose: "Final push before deadline" },
    ],
  },
  educational_series: {
    phases: [
      { name: "Hook", daysPercent: 15, purpose: "Grab attention with problem statement" },
      { name: "Foundation", daysPercent: 15, purpose: "Build understanding of the topic" },
      { name: "Deep Dive", daysPercent: 45, purpose: "Deliver core educational content" },
      { name: "Integration", daysPercent: 15, purpose: "Tie everything together" },
      { name: "CTA", daysPercent: 10, purpose: "Convert to next step" },
    ],
  },
  custom: {
    phases: [
      { name: "Phase 1", daysPercent: 33, purpose: "Custom phase 1" },
      { name: "Phase 2", daysPercent: 34, purpose: "Custom phase 2" },
      { name: "Phase 3", daysPercent: 33, purpose: "Custom phase 3" },
    ],
  },
};

// Default optimal posting times (before learning)
export const DEFAULT_OPTIMAL_TIMES: Record<Platform, number[]> = {
  twitter: [7, 12, 17, 20],
  facebook: [9, 13, 19],
  instagram: [8, 12, 18, 21],
  youtube: [14, 17, 20],
};




