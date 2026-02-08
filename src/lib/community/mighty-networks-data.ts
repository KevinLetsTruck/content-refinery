/**
 * Mighty Networks Community Data Fetcher
 *
 * Pulls member stats, subscription/revenue data, and engagement metrics
 * from the Mighty Networks Admin API for the Community Intelligence Dashboard.
 *
 * Reuses auth/config from the existing MN publishing client.
 */

import {
  MN_API_BASE,
  getApiToken,
  getNetworkId,
} from "@/lib/social/mighty-networks";

import type {
  CommunityStats,
  MNMember,
  MNSubscription,
  MNPurchase,
  MNPlan,
  MNTag,
  PlanBreakdown,
  Referrer,
  TagCount,
} from "./types";

/**
 * Generic MN API GET request helper
 */
async function mnGet<T>(path: string): Promise<T> {
  const apiToken = getApiToken();
  const networkId = getNetworkId();
  const url = `${MN_API_BASE}/admin/v1/networks/${networkId}${path}`;

  console.log("[Community] Fetching:", url);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Community] API error:", response.status, errorText);
    throw new Error(
      `Mighty Networks API error (${response.status}): ${errorText}`
    );
  }

  return response.json();
}

/**
 * Extract items from a paginated MN API response
 * MN returns { items: [...] } or raw arrays depending on endpoint
 */
function extractItems<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;
  const obj = data as Record<string, unknown>;
  if (obj.items && Array.isArray(obj.items)) return obj.items as T[];
  if (obj.data && Array.isArray(obj.data)) return obj.data as T[];
  return [];
}

/**
 * Fetch all members (paginated — fetches up to 500 for stats)
 */
export async function getMembers(limit = 100): Promise<MNMember[]> {
  const allMembers: MNMember[] = [];
  let page = 1;
  const maxPages = Math.ceil(limit / 100);

  while (page <= maxPages) {
    try {
      const data = await mnGet<unknown>(`/members?page=${page}&per_page=100`);
      const items = extractItems<MNMember>(data);

      if (items.length === 0) break;

      allMembers.push(...items);
      if (items.length < 100) break; // Last page

      page++;
    } catch (error) {
      console.error("[Community] Error fetching members page", page, error);
      break;
    }
  }

  return allMembers;
}

/**
 * Fetch all subscriptions
 */
export async function getSubscriptions(): Promise<MNSubscription[]> {
  try {
    const data = await mnGet<unknown>("/subscriptions?per_page=100");
    return extractItems<MNSubscription>(data);
  } catch (error) {
    console.error("[Community] Error fetching subscriptions:", error);
    return [];
  }
}

/**
 * Fetch all purchases (one-time payments)
 */
export async function getPurchases(): Promise<MNPurchase[]> {
  try {
    const data = await mnGet<unknown>("/purchases?per_page=100");
    return extractItems<MNPurchase>(data);
  } catch (error) {
    console.error("[Community] Error fetching purchases:", error);
    return [];
  }
}

/**
 * Fetch all available plans
 */
export async function getPlans(): Promise<MNPlan[]> {
  try {
    const data = await mnGet<unknown>("/plans");
    return extractItems<MNPlan>(data);
  } catch (error) {
    console.error("[Community] Error fetching plans:", error);
    return [];
  }
}

/**
 * Fetch all tags/segments
 */
export async function getTags(): Promise<MNTag[]> {
  try {
    const data = await mnGet<unknown>("/tags");
    return extractItems<MNTag>(data);
  } catch (error) {
    console.error("[Community] Error fetching tags:", error);
    return [];
  }
}

/**
 * Calculate community statistics from raw MN API data
 */
function calculateStats(
  members: MNMember[],
  subscriptions: MNSubscription[],
  purchases: MNPurchase[],
  plans: MNPlan[],
  tags: MNTag[]
): CommunityStats {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // --- Member Stats ---
  const totalMembers = members.length;
  const new30d = members.filter(
    (m) => new Date(m.created_at) >= thirtyDaysAgo
  ).length;
  const new7d = members.filter(
    (m) => new Date(m.created_at) >= sevenDaysAgo
  ).length;
  const growthRate =
    totalMembers > 0 ? ((new30d / totalMembers) * 100) : 0;

  // --- Subscription Stats ---
  const activeSubs = subscriptions.filter((s) => !s.canceled_at);
  const canceledSubs = subscriptions.filter((s) => !!s.canceled_at);

  // Churn: canceled in last 30 days / (active + canceled in last 30 days)
  const canceledLast30d = canceledSubs.filter(
    (s) => s.canceled_at && new Date(s.canceled_at) >= thirtyDaysAgo
  ).length;
  const churnRate =
    activeSubs.length + canceledLast30d > 0
      ? (canceledLast30d / (activeSubs.length + canceledLast30d)) * 100
      : 0;

  // --- Revenue Calculations ---
  // MN amounts are in cents
  let mrr = 0;
  activeSubs.forEach((sub) => {
    const amountDollars = (sub.amount || 0) / 100;
    if (sub.interval === "year" || sub.interval === "annual") {
      mrr += amountDollars / 12;
    } else {
      mrr += amountDollars;
    }
  });

  const arr = mrr * 12;

  // Total revenue from all purchases
  const totalPurchaseRevenue = purchases.reduce(
    (sum, p) => sum + (p.amount || 0) / 100,
    0
  );
  // Total subscription revenue (rough: active subs * their amount)
  const totalSubRevenue = subscriptions.reduce(
    (sum, s) => sum + (s.amount || 0) / 100,
    0
  );
  const totalRevenue = totalPurchaseRevenue + totalSubRevenue;

  const avgRevenuePerMember =
    totalMembers > 0 ? mrr / totalMembers : 0;

  // --- Plan Breakdown ---
  const planBreakdown: PlanBreakdown[] = plans.map((plan) => {
    const planSubs = activeSubs.filter((s) => s.plan_id === plan.id);
    const count = plan.member_count || planSubs.length;
    const amountDollars = (plan.amount || 0) / 100;
    const interval = plan.interval || "month";
    const monthlyRevenue =
      interval === "year" || interval === "annual"
        ? (amountDollars / 12) * count
        : amountDollars * count;

    return {
      name: plan.name,
      count,
      amount: amountDollars,
      interval,
      revenue: monthlyRevenue,
    };
  });

  // --- Top Referrers ---
  const topReferrers: Referrer[] = members
    .filter((m) => (m.referral_count || 0) > 0)
    .sort((a, b) => (b.referral_count || 0) - (a.referral_count || 0))
    .slice(0, 10)
    .map((m) => ({
      id: String(m.id),
      name: m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim() || "Unknown",
      referralCount: m.referral_count || 0,
    }));

  // --- Tag Distribution ---
  const tagDistribution: TagCount[] = tags
    .filter((t) => (t.member_count || 0) > 0)
    .sort((a, b) => (b.member_count || 0) - (a.member_count || 0))
    .slice(0, 15)
    .map((t) => ({
      id: String(t.id),
      name: t.name,
      count: t.member_count || 0,
    }));

  return {
    members: {
      total: totalMembers,
      new30d,
      new7d,
      growthRate: Math.round(growthRate * 10) / 10,
    },
    revenue: {
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgRevenuePerMember: Math.round(avgRevenuePerMember * 100) / 100,
    },
    subscriptions: {
      active: activeSubs.length,
      canceled: canceledSubs.length,
      churnRate: Math.round(churnRate * 10) / 10,
      planBreakdown,
    },
    engagement: {
      topReferrers,
      tagDistribution,
    },
    snapshot: {
      fetchedAt: now.toISOString(),
    },
  };
}

/**
 * Fetch all community data from MN API and calculate stats
 *
 * Fetches members, subscriptions, purchases, plans, and tags in parallel,
 * then calculates MRR, ARR, churn rate, and other metrics.
 */
export async function getCommunityStats(): Promise<CommunityStats> {
  console.log("[Community] Fetching community stats...");

  const [members, subscriptions, purchases, plans, tags] = await Promise.all([
    getMembers(500),
    getSubscriptions(),
    getPurchases(),
    getPlans(),
    getTags(),
  ]);

  console.log(
    "[Community] Raw data:",
    `${members.length} members,`,
    `${subscriptions.length} subscriptions,`,
    `${purchases.length} purchases,`,
    `${plans.length} plans,`,
    `${tags.length} tags`
  );

  return calculateStats(members, subscriptions, purchases, plans, tags);
}
