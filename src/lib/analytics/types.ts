// Content Intelligence System Types

export type PerformanceLevel = "pending" | "poor" | "average" | "good" | "excellent" | "viral";

export type TestVariable = "formula" | "hook" | "cta" | "timing";

export type TestStatus = "draft" | "running" | "completed" | "cancelled";

export interface RawMetrics {
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  profileVisits: number;
  follows: number;
}

export interface CalculatedMetrics {
  engagementRate: number;
  clickRate: number;
  viralityScore: number;
  saveRate: number;
}

export interface TimingSlot {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  hourOfDay: number; // 0-23
  avgEngagement: number;
  sampleSize: number;
}

export interface ABTestVariantConfig {
  formula?: string;
  hook?: string;
  cta?: string;
  timing?: {
    dayOfWeek: number;
    hourOfDay: number;
  };
}

export interface ABTestMetrics {
  avgEngagement: number;
  totalImpressions: number;
  totalLikes: number;
  totalShares: number;
  postCount: number;
}

export interface ContentInsightData {
  metric?: string;
  value?: number;
  comparison?: string;
  trend?: "up" | "down" | "stable";
  recommendation?: string;
}

// Platform-specific engagement benchmarks
export const ENGAGEMENT_BENCHMARKS: Record<string, {
  poor: number;
  average: number;
  good: number;
  excellent: number;
  viral: number;
}> = {
  twitter: {
    poor: 0.005,
    average: 0.01,
    good: 0.03,
    excellent: 0.05,
    viral: 0.10,
  },
  facebook: {
    poor: 0.01,
    average: 0.02,
    good: 0.05,
    excellent: 0.10,
    viral: 0.20,
  },
  instagram: {
    poor: 0.02,
    average: 0.03,
    good: 0.06,
    excellent: 0.10,
    viral: 0.15,
  },
  linkedin: {
    poor: 0.01,
    average: 0.02,
    good: 0.04,
    excellent: 0.08,
    viral: 0.15,
  },
  tiktok: {
    poor: 0.03,
    average: 0.05,
    good: 0.10,
    excellent: 0.15,
    viral: 0.25,
  },
};

/**
 * Classify performance level based on engagement rate
 */
export function classifyPerformance(
  engagementRate: number,
  platform: string
): PerformanceLevel {
  const benchmarks = ENGAGEMENT_BENCHMARKS[platform] || ENGAGEMENT_BENCHMARKS.twitter;
  
  if (engagementRate >= benchmarks.viral) return "viral";
  if (engagementRate >= benchmarks.excellent) return "excellent";
  if (engagementRate >= benchmarks.good) return "good";
  if (engagementRate >= benchmarks.average) return "average";
  if (engagementRate > 0) return "poor";
  return "pending";
}

/**
 * Calculate derived metrics from raw metrics
 */
export function calculateMetrics(raw: RawMetrics): CalculatedMetrics {
  const impressions = Math.max(raw.impressions, 1); // Avoid division by zero
  
  return {
    engagementRate: (raw.likes + raw.comments + raw.shares) / impressions,
    clickRate: raw.clicks / impressions,
    viralityScore: raw.shares / impressions,
    saveRate: raw.saves / impressions,
  };
}

/**
 * Get performance level color for UI
 */
export function getPerformanceColor(level: PerformanceLevel): string {
  switch (level) {
    case "viral": return "#FF4500"; // Orange (brand)
    case "excellent": return "#22C55E"; // Green
    case "good": return "#3B82F6"; // Blue
    case "average": return "#F4A300"; // Amber
    case "poor": return "#EF4444"; // Red
    case "pending": return "#888888"; // Gray
    default: return "#888888";
  }
}

/**
 * Format engagement rate for display
 */
export function formatEngagementRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

/**
 * Get day name from day of week number
 */
export function getDayName(dayOfWeek: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[dayOfWeek] || "Unknown";
}

/**
 * Format hour for display (12-hour format)
 */
export function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

