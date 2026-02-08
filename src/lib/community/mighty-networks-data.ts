/**
 * Mighty Networks Community Data Fetcher
 *
 * Pulls member stats, subscription/revenue data, and engagement metrics
 * from the Mighty Networks Admin API for the Community Intelligence Dashboard.
 *
 * KEY: MN API uses nested objects:
 *   - Subscriptions: item.plan.amount (cents), item.subscription.canceled_at
 *   - Purchases: item.plan.amount (cents), item.purchase.purchased_at
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
  NetGrowth,
  MNMember,
  MNSubscriptionItem,
  MNPurchaseItem,
  MNPlan,
  MNTag,
  PlanBreakdown,
  Referrer,
  TagCount,
} from "./types";

// ============================================
// API Helpers
// ============================================

/**
 * Generic MN API GET request helper
 */
async function mnGet<T>(path: string): Promise<T> {
  const apiToken = getApiToken();
  const networkId = getNetworkId();
  const url = `${MN_API_BASE}/admin/v1/networks/${networkId}${path}`;

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
 * Generic paginator for MN API endpoints.
 *
 * Fetches all pages sequentially until:
 *   - Empty response (0 items)
 *   - Partial page (items < perPage → last page)
 *   - maxPages safety cap reached
 *
 * Returns collected items + any errors encountered.
 */
async function paginateAll<T>(
  path: string,
  options: { perPage?: number; maxPages?: number; label?: string } = {}
): Promise<{ items: T[]; errors: string[] }> {
  const { perPage = 100, maxPages = 100, label = path } = options;
  const allItems: T[] = [];
  const errors: string[] = [];
  let page = 1;

  while (page <= maxPages) {
    try {
      const separator = path.includes("?") ? "&" : "?";
      const data = await mnGet<unknown>(
        `${path}${separator}page=${page}&per_page=${perPage}`
      );
      const items = extractItems<T>(data);

      if (items.length === 0) {
        break;
      }

      allItems.push(...items);

      if (items.length < perPage) {
        // Last page (partial)
        break;
      }

      page++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[Community] ${label}: error on page ${page}:`, msg);
      errors.push(`Page ${page}: ${msg}`);
      break;
    }
  }

  console.log(
    `[Community] ${label}: fetched ${allItems.length} items across ${page} pages${
      errors.length > 0 ? ` (${errors.length} errors)` : ""
    }`
  );

  return { items: allItems, errors };
}

// ============================================
// Data Fetchers
// ============================================

/**
 * Fetch ALL members (no artificial cap)
 */
export async function getMembers(): Promise<MNMember[]> {
  const result = await paginateAll<MNMember>("/members", {
    label: "members",
    maxPages: 100,
  });
  return result.items;
}

/**
 * Fetch ALL subscriptions (with nested plan + subscription objects)
 */
export async function getSubscriptions(): Promise<MNSubscriptionItem[]> {
  const result = await paginateAll<MNSubscriptionItem>("/subscriptions", {
    label: "subscriptions",
    maxPages: 100,
  });
  return result.items;
}

/**
 * Fetch ALL purchases (one-time payments)
 */
export async function getPurchases(): Promise<MNPurchaseItem[]> {
  const result = await paginateAll<MNPurchaseItem>("/purchases", {
    label: "purchases",
    maxPages: 50,
  });
  return result.items;
}

/**
 * Fetch all available plans (typically small set, no pagination needed but safe)
 */
export async function getPlans(): Promise<MNPlan[]> {
  const result = await paginateAll<MNPlan>("/plans", {
    label: "plans",
    maxPages: 5,
  });
  return result.items;
}

/**
 * Fetch all tags/segments (uses 'title' not 'name')
 */
export async function getTags(): Promise<MNTag[]> {
  const result = await paginateAll<MNTag>("/tags", {
    label: "tags",
    maxPages: 5,
  });
  return result.items;
}

// ============================================
// Plan Name Normalization
// ============================================

/**
 * Normalize MN plan names by merging variants into clean display names.
 *
 * MN has many plan variants with suffixes like "Free", "Gift", "Legacy",
 * "Special", "w/ Free Trial". This merges them into single display names.
 *
 * Examples:
 *   COACHING, COACHING Gift, COACHING Legacy, COACHING Special → "Coaching"
 *   FIRST MILE, FIRST MILE w/ Free Trial → "First Mile"
 *   GEAR UP, GEAR UP Free → "Gear Up"
 *   INNER CIRCLE, INNER CIRCLE Free → "Inner Circle"
 *   CMC Virtual, CMC Virtual FREE → "CMC Virtual"
 *   TRIBES Legacy, TRIBES FREE → "Tribes"
 */
function normalizePlanName(rawName: string): string {
  const upper = rawName.toUpperCase().trim();

  if (upper.startsWith("COACHING")) return "Coaching";
  if (upper.startsWith("FIRST MILE")) return "First Mile";
  if (upper.startsWith("GEAR UP")) return "Gear Up";
  if (upper.startsWith("INNER CIRCLE")) return "Inner Circle";
  if (upper.startsWith("CMC VIRTUAL")) return "CMC Virtual";
  if (upper.startsWith("TRIBES")) return "Tribes";
  if (upper.startsWith("OPEN ROAD")) return "Open Road";
  if (upper.startsWith("AMBASSADOR")) return "Ambassador";
  if (upper.startsWith("CONTENT AMBASSADOR")) return "Content Ambassador";
  if (upper.startsWith("PARTNER ACCESS")) return "Partner Access";
  if (upper.startsWith("COURSES")) return "Courses";
  if (upper.startsWith("COFFEE")) return "Coffee w/ Kevin";

  // Default: return as-is
  return rawName;
}

// ============================================
// Stats Calculator
// ============================================

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
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  // --- Member Stats ---
  const totalMembers = members.length;
  const new1d = members.filter(
    (m) => new Date(m.created_at) >= startOfToday
  ).length;
  const new7d = members.filter(
    (m) => new Date(m.created_at) >= sevenDaysAgo
  ).length;
  const new30d = members.filter(
    (m) => new Date(m.created_at) >= thirtyDaysAgo
  ).length;
  const newYTD = members.filter(
    (m) => new Date(m.created_at) >= yearStart
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
  const canceledToday = canceledSubs.filter(
    (s) =>
      s.subscription?.canceled_at &&
      new Date(s.subscription.canceled_at) >= startOfToday
  ).length;
  const canceled7d = canceledSubs.filter(
    (s) =>
      s.subscription?.canceled_at &&
      new Date(s.subscription.canceled_at) >= sevenDaysAgo
  ).length;
  const canceledLast30d = canceledSubs.filter(
    (s) =>
      s.subscription?.canceled_at &&
      new Date(s.subscription.canceled_at) >= thirtyDaysAgo
  ).length;
  const canceledYTD = canceledSubs.filter(
    (s) =>
      s.subscription?.canceled_at &&
      new Date(s.subscription.canceled_at) >= yearStart
  ).length;

  const churnRate =
    activeSubs.length + canceledLast30d > 0
      ? (canceledLast30d / (activeSubs.length + canceledLast30d)) * 100
      : 0;

  // --- Net Growth (new members - cancellations per period) ---
  const netGrowth: NetGrowth = {
    daily: new1d - canceledToday,
    weekly: new7d - canceled7d,
    monthly: new30d - canceledLast30d,
    ytd: newYTD - canceledYTD,
  };

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

  // --- Plan Breakdown (derived from subscription data) ---
  // Group active subscriptions by NORMALIZED plan name to merge variants
  // e.g., "COACHING", "COACHING Gift", "COACHING Legacy" → "Coaching"
  const planMap = new Map<
    string,
    { name: string; count: number; totalMonthlyRevenue: number; highestAmount: number; interval: string }
  >();

  activeSubs.forEach((sub) => {
    const rawName = sub.plan?.name || "Unknown Plan";
    const normalizedName = normalizePlanName(rawName);
    const amount = (sub.plan?.amount || 0) / 100;
    const interval = sub.plan?.interval || "month";

    // Calculate this sub's monthly contribution
    const monthlyContribution =
      interval === "year" || interval === "annual"
        ? amount / 12
        : amount;

    const existing = planMap.get(normalizedName);
    if (existing) {
      existing.count += 1;
      existing.totalMonthlyRevenue += monthlyContribution;
      // Track highest non-zero amount for display
      if (amount > existing.highestAmount) {
        existing.highestAmount = amount;
        existing.interval = interval;
      }
    } else {
      planMap.set(normalizedName, {
        name: normalizedName,
        count: 1,
        totalMonthlyRevenue: monthlyContribution,
        highestAmount: amount,
        interval,
      });
    }
  });

  const planBreakdown: PlanBreakdown[] = Array.from(planMap.values())
    .map((plan) => ({
      name: plan.name,
      count: plan.count,
      amount: plan.highestAmount,
      interval: plan.interval,
      revenue: Math.round(plan.totalMonthlyRevenue * 100) / 100,
    }))
    .filter((plan) => plan.revenue > 0) // Hide $0 revenue plans
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
  const tagDistribution: TagCount[] = tags.slice(0, 15).map((t) => ({
    id: String(t.id),
    name: t.title, // MN uses 'title' not 'name'
    count: 0,
  }));

  // Log key metrics
  console.log(
    "[Community] Calculated:",
    `MRR=$${mrr.toFixed(2)},`,
    `ARR=$${arr.toFixed(2)},`,
    `Active=${activeSubs.length},`,
    `Canceled=${canceledSubs.length},`,
    `Churn=${churnRate.toFixed(1)}%,`,
    `Plans=${planBreakdown.length},`,
    `Referrers=${topReferrers.length},`,
    `Net(month)=${netGrowth.monthly}`
  );

  return {
    members: {
      total: totalMembers,
      new30d,
      new7d,
      growthRate: Math.round(growthRate * 10) / 10,
      netGrowth,
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
      fetchCounts: {
        members: members.length,
        subscriptions: subscriptions.length,
        purchases: purchases.length,
        plans: plans.length,
        tags: tags.length,
      },
    },
  };
}

// ============================================
// Main Entry Point
// ============================================

/**
 * Fetch all community data from MN API and calculate stats
 *
 * Fetches members, subscriptions, purchases, plans, and tags in parallel,
 * then calculates MRR, ARR, churn rate, and other metrics.
 */
export async function getCommunityStats(): Promise<CommunityStats> {
  console.log("[Community] Fetching community stats...");

  const [members, subscriptions, purchases, plans, tags] = await Promise.all([
    getMembers(),
    getSubscriptions(),
    getPurchases(),
    getPlans(),
    getTags(),
  ]);

  console.log(
    "[Community] Fetched totals:",
    `${members.length} members,`,
    `${subscriptions.length} subscriptions,`,
    `${purchases.length} purchases,`,
    `${plans.length} plans,`,
    `${tags.length} tags`
  );

  return calculateStats(members, subscriptions, purchases, plans, tags);
}
