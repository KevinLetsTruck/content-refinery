/**
 * Mighty Networks Community Data Fetcher
 *
 * Pulls member stats, subscription/revenue data, and engagement metrics
 * from the Mighty Networks Admin API for the Community Intelligence Dashboard.
 *
 * KEY: MN API uses nested objects:
 *   - Subscriptions: item.plan.amount, item.subscription.canceled_at
 *   - Purchases: item.plan.amount, item.purchase.purchased_at
 *   - Tags: item.title (NOT item.name)
 *   - Plans endpoint has NO pricing — pricing comes from subscriptions
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
  MNSubscriptionItem,
  MNPurchaseItem,
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
 * MN returns { items: [...] } for all endpoints
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
 * Fetch all subscriptions (with nested plan + subscription objects)
 */
export async function getSubscriptions(): Promise<MNSubscriptionItem[]> {
  const allSubs: MNSubscriptionItem[] = [];
  let page = 1;

  while (page <= 10) {
    try {
      const data = await mnGet<unknown>(`/subscriptions?page=${page}&per_page=100`);
      const items = extractItems<MNSubscriptionItem>(data);

      if (items.length === 0) break;

      allSubs.push(...items);
      if (items.length < 100) break;

      page++;
    } catch (error) {
      console.error("[Community] Error fetching subscriptions page", page, error);
      break;
    }
  }

  return allSubs;
}

/**
 * Fetch all purchases (one-time payments)
 */
export async function getPurchases(): Promise<MNPurchaseItem[]> {
  try {
    const data = await mnGet<unknown>("/purchases?per_page=100");
    return extractItems<MNPurchaseItem>(data);
  } catch (error) {
    console.error("[Community] Error fetching purchases:", error);
    return [];
  }
}

/**
 * Fetch all available plans (no pricing info — just names and statuses)
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
 * Fetch all tags/segments (uses 'title' not 'name')
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
 *
 * Key field mappings (from live API testing):
 *   - sub.plan.amount (cents) — subscription price
 *   - sub.plan.interval — "month" or "year"
 *   - sub.subscription.canceled_at — null = active, date = canceled
 *   - purchase.plan.amount (cents) — one-time payment amount
 *   - tag.title — tag name (NOT tag.name)
 */
function calculateStats(
  members: MNMember[],
  subscriptions: MNSubscriptionItem[],
  purchases: MNPurchaseItem[],
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
  const growthRate = totalMembers > 0 ? (new30d / totalMembers) * 100 : 0;

  // --- Subscription Stats (using nested objects) ---
  // Active = subscription.canceled_at is null
  const activeSubs = subscriptions.filter(
    (s) => !s.subscription?.canceled_at
  );
  const canceledSubs = subscriptions.filter(
    (s) => !!s.subscription?.canceled_at
  );

  // Churn: canceled in last 30 days / (active + canceled in last 30 days)
  const canceledLast30d = canceledSubs.filter(
    (s) =>
      s.subscription?.canceled_at &&
      new Date(s.subscription.canceled_at) >= thirtyDaysAgo
  ).length;
  const churnRate =
    activeSubs.length + canceledLast30d > 0
      ? (canceledLast30d / (activeSubs.length + canceledLast30d)) * 100
      : 0;

  // --- Revenue Calculations ---
  // Price is in sub.plan.amount (cents)
  let mrr = 0;
  activeSubs.forEach((sub) => {
    const amountDollars = (sub.plan?.amount || 0) / 100;
    const interval = sub.plan?.interval || "month";
    if (interval === "year" || interval === "annual") {
      mrr += amountDollars / 12;
    } else {
      mrr += amountDollars;
    }
  });

  const arr = mrr * 12;

  // Total revenue from one-time purchases
  const totalPurchaseRevenue = purchases.reduce(
    (sum, p) => sum + (p.plan?.amount || 0) / 100,
    0
  );

  // Estimate total sub revenue (all subs * their plan amount)
  const totalSubRevenue = subscriptions.reduce(
    (sum, s) => sum + (s.plan?.amount || 0) / 100,
    0
  );
  const totalRevenue = totalPurchaseRevenue + totalSubRevenue;

  const avgRevenuePerMember = totalMembers > 0 ? mrr / totalMembers : 0;

  // --- Plan Breakdown (derived from subscription data, not plans endpoint) ---
  // Group active subscriptions by plan name to get counts and revenue
  const planMap = new Map<
    string,
    { name: string; count: number; amount: number; interval: string }
  >();

  activeSubs.forEach((sub) => {
    const planName = sub.plan?.name || "Unknown Plan";
    const amount = (sub.plan?.amount || 0) / 100;
    const interval = sub.plan?.interval || "month";

    const existing = planMap.get(planName);
    if (existing) {
      existing.count += 1;
    } else {
      planMap.set(planName, { name: planName, count: 1, amount, interval });
    }
  });

  const planBreakdown: PlanBreakdown[] = Array.from(planMap.values())
    .map((plan) => {
      const monthlyRevenue =
        plan.interval === "year" || plan.interval === "annual"
          ? (plan.amount / 12) * plan.count
          : plan.amount * plan.count;
      return {
        name: plan.name,
        count: plan.count,
        amount: plan.amount,
        interval: plan.interval,
        revenue: Math.round(monthlyRevenue * 100) / 100,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  // --- Top Referrers (from members data) ---
  const topReferrers: Referrer[] = members
    .filter((m) => (m.referral_count || 0) > 0)
    .sort((a, b) => (b.referral_count || 0) - (a.referral_count || 0))
    .slice(0, 10)
    .map((m) => ({
      id: String(m.id),
      name:
        `${m.first_name || ""} ${m.last_name || ""}`.trim() || "Unknown",
      referralCount: m.referral_count || 0,
    }));

  // --- Tag Distribution (uses 'title' not 'name', no member_count) ---
  // Tags don't have member_count from the API, so just list them
  const tagDistribution: TagCount[] = tags.slice(0, 15).map((t) => ({
    id: String(t.id),
    name: t.title, // MN uses 'title' not 'name'
    count: 0, // Tags endpoint doesn't provide member_count
  }));

  // Log key metrics for debugging
  console.log(
    "[Community] Calculated:",
    `MRR=$${mrr.toFixed(2)},`,
    `Active=${activeSubs.length},`,
    `Canceled=${canceledSubs.length},`,
    `Plans=${planBreakdown.length},`,
    `Referrers=${topReferrers.length}`
  );

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
