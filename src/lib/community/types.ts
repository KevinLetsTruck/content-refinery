/**
 * Community Intelligence Dashboard Types
 *
 * TypeScript interfaces for Mighty Networks community data,
 * revenue calculations, and AI advisor insights.
 *
 * MN API Response Structure (from live testing):
 * - Subscriptions: { items: [{ member_id, email, plan: { id, name, amount, interval }, subscription: { canceled_at, ... } }] }
 * - Plans: { items: [{ id, name, status, pricing_type }] } — NO amount field
 * - Members: { items: [{ id, email, first_name, last_name, referral_count, ... }] }
 * - Purchases: { items: [{ member_id, plan: { amount, interval: "one_time" }, purchase: { ... } }] }
 * - Tags: { items: [{ id, title, description, color }] } — uses 'title' not 'name'
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
    fetchCounts?: {
      members: number;
      subscriptions: number;
      purchases: number;
      plans: number;
      tags: number;
    };
    warnings?: string[];
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

// ============================================
// Raw MN API response types (from live API testing)
// ============================================

export interface MNMember {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  created_at: string;
  referral_count?: number;
  ambassador_level?: string;
  location?: string;
  permalink?: string;
}

/**
 * MN Subscription item — each item contains member info (flat),
 * a nested `plan` object with pricing, and a nested `subscription` object.
 */
export interface MNSubscriptionItem {
  member_id: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  referral_count?: number;
  created_at?: string;
  // Nested plan with pricing info
  plan: {
    id: number;
    name: string;
    amount: number; // cents
    currency: string; // "usd"
    interval: string; // "month" | "year"
    type: string; // "subscription"
    has_free_trial?: boolean;
  };
  // Nested subscription with status
  subscription: {
    id: number;
    current_period_start?: string;
    current_period_end?: string;
    payment_platform?: string;
    canceled_at: string | null;
    purchased_at?: string;
    trial_start?: string | null;
    trial_end?: string | null;
  };
}

/**
 * MN Purchase item — similar structure to subscription but with
 * member_ prefixed fields and a nested purchase object
 */
export interface MNPurchaseItem {
  member_id: number;
  member_email?: string;
  member_first_name?: string;
  member_last_name?: string;
  // Nested plan info
  plan: {
    id: number;
    name: string;
    amount: number; // cents
    currency: string;
    interval: string; // "one_time"
    type: string; // "one-time-payment"
  };
  // Nested purchase info
  purchase: {
    id: number;
    purchased_at?: string;
    payment_platform?: string;
  };
}

/**
 * MN Plan — from /plans endpoint.
 * Note: This does NOT include pricing info. Pricing comes from subscriptions.
 */
export interface MNPlan {
  id: number;
  name: string;
  description?: string;
  status: string; // "visible" | "hidden"
  pricing_type: string; // "subscription" | "free" | "nonpaid"
  visible_to_members?: boolean;
  permalink?: string;
}

/**
 * MN Tag — uses 'title' not 'name'
 */
export interface MNTag {
  id: number;
  title: string; // NOT 'name'
  description?: string;
  color?: string;
}
