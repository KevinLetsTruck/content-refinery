/**
 * Community Intelligence Dashboard Types
 *
 * TypeScript interfaces for Mighty Networks community data,
 * revenue calculations, and AI advisor insights.
 */

export interface CommunityStats {
  members: {
    total: number;
    new30d: number;
    new7d: number;
    growthRate: number; // percentage
  };
  revenue: {
    mrr: number; // Monthly Recurring Revenue in dollars
    arr: number; // Annual Recurring Revenue in dollars
    totalRevenue: number; // All-time revenue in dollars
    avgRevenuePerMember: number;
  };
  subscriptions: {
    active: number;
    canceled: number;
    churnRate: number; // percentage
    planBreakdown: PlanBreakdown[];
  };
  engagement: {
    topReferrers: Referrer[];
    tagDistribution: TagCount[];
  };
  snapshot: {
    fetchedAt: string; // ISO timestamp
  };
}

export interface PlanBreakdown {
  name: string;
  count: number;
  amount: number; // dollars
  interval: string; // "month" | "year"
  revenue: number; // monthly revenue contribution in dollars
}

export interface Referrer {
  id: string;
  name: string;
  referralCount: number;
}

export interface TagCount {
  id: string;
  name: string;
  count: number;
}

export interface CommunityInsight {
  id: string;
  type: "growth" | "retention" | "revenue" | "engagement" | "opportunity";
  title: string;
  description: string;
  recommendation: string;
  impact: "high" | "medium" | "low";
  data?: Record<string, unknown>;
}

// Raw MN API response types

export interface MNMember {
  id: number;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  created_at: string;
  referral_count?: number;
  ambassador_level?: string;
  location?: string;
  status?: string;
}

export interface MNSubscription {
  id: number;
  member_id?: number;
  plan_id?: number;
  plan_name?: string;
  amount?: number; // cents
  interval?: string; // "month" | "year"
  status?: string;
  canceled_at?: string | null;
  created_at?: string;
  current_period_end?: string;
}

export interface MNPurchase {
  id: number;
  member_id?: number;
  amount?: number; // cents
  description?: string;
  created_at?: string;
}

export interface MNPlan {
  id: number;
  name: string;
  amount?: number; // cents
  interval?: string;
  status?: string;
  member_count?: number;
}

export interface MNTag {
  id: number;
  name: string;
  member_count?: number;
}

export interface MNPaginatedResponse<T> {
  items?: T[];
  data?: T[];
  links?: {
    next?: string;
    prev?: string;
  };
  meta?: {
    total?: number;
    page?: number;
    per_page?: number;
  };
}
