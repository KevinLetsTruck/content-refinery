import prisma from "@/lib/db/prisma";
import crypto from "crypto";

const SHORT_LINK_BASE = process.env.SHORT_LINK_BASE || "https://ltk.health";

/**
 * Generate a unique short code
 */
function generateShortCode(length: number = 6): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Build UTM-tagged URL
 */
function buildUtmUrl(
  baseUrl: string,
  params: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  }
): string {
  const url = new URL(baseUrl);

  if (params.source) url.searchParams.set("utm_source", params.source);
  if (params.medium) url.searchParams.set("utm_medium", params.medium);
  if (params.campaign) url.searchParams.set("utm_campaign", params.campaign);
  if (params.content) url.searchParams.set("utm_content", params.content);
  if (params.term) url.searchParams.set("utm_term", params.term);

  return url.toString();
}

interface CreateLinkOptions {
  destinationUrl: string;
  contentId?: string;
  campaignId?: string;
  productId?: string;
  platform?: string;
  campaignName?: string;
  customShortCode?: string;
}

interface TrackedLinkResult {
  shortUrl: string;
  fullUrl: string;
  link: {
    id: string;
    shortCode: string;
    destinationUrl: string;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    utmContent: string | null;
  };
}

/**
 * Create a tracked link with UTM parameters
 */
export async function createTrackedLink(
  options: CreateLinkOptions
): Promise<TrackedLinkResult> {
  const {
    destinationUrl,
    contentId,
    campaignId,
    productId,
    platform = "social",
    campaignName,
    customShortCode,
  } = options;

  // Generate short code
  let shortCode = customShortCode || generateShortCode();

  // Ensure uniqueness
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.trackedLink.findUnique({
      where: { shortCode },
    });
    if (!existing) break;
    shortCode = generateShortCode();
    attempts++;
  }

  // Build UTM parameters
  const utmSource = platform;
  const utmMedium = "social";
  const utmCampaign = campaignName || campaignId || "general";
  const utmContent = contentId || shortCode;

  // Create full URL with UTM params
  const fullUrl = buildUtmUrl(destinationUrl, {
    source: utmSource,
    medium: utmMedium,
    campaign: utmCampaign,
    content: utmContent,
  });

  // Create link record
  const link = await prisma.trackedLink.create({
    data: {
      shortCode,
      destinationUrl: fullUrl,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      contentId,
      campaignId,
      productId,
    },
  });

  return {
    shortUrl: `${SHORT_LINK_BASE}/${shortCode}`,
    fullUrl,
    link,
  };
}

/**
 * Record a click event
 */
export async function recordClick(
  shortCode: string,
  clickData: {
    ipHash?: string;
    userAgent?: string;
    referer?: string;
  }
): Promise<{ success: boolean; destinationUrl: string } | null> {
  const link = await prisma.trackedLink.findUnique({
    where: { shortCode },
  });

  if (!link) return null;

  // Check if expired
  if (link.expiresAt && link.expiresAt < new Date()) {
    return null;
  }

  // Parse user agent for device/browser
  const device = parseDevice(clickData.userAgent);
  const browser = parseBrowser(clickData.userAgent);

  // Check if unique click (same IP hash within 24 hours)
  const isUnique = await isUniqueClick(link.id, clickData.ipHash);

  // Record click
  await prisma.linkClick.create({
    data: {
      linkId: link.id,
      ipHash: clickData.ipHash,
      userAgent: clickData.userAgent,
      referer: clickData.referer,
      device,
      browser,
    },
  });

  // Update link stats
  await prisma.trackedLink.update({
    where: { id: link.id },
    data: {
      clickCount: { increment: 1 },
      uniqueClicks: isUnique ? { increment: 1 } : undefined,
    },
  });

  // Update content stats if linked
  if (link.contentId) {
    await prisma.generatedContent.update({
      where: { id: link.contentId },
      data: { totalClicks: { increment: 1 } },
    });
  }

  return {
    success: true,
    destinationUrl: link.destinationUrl,
  };
}

async function isUniqueClick(
  linkId: string,
  ipHash?: string
): Promise<boolean> {
  if (!ipHash) return true;

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const existingClick = await prisma.linkClick.findFirst({
    where: {
      linkId,
      ipHash,
      clickedAt: { gte: oneDayAgo },
    },
  });

  return !existingClick;
}

/**
 * Record a conversion from Shopify webhook
 */
export async function recordConversion(orderData: {
  orderId: string;
  orderValue: number;
  productIds: string[];
  customerEmail?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
}): Promise<void> {
  const {
    orderId,
    orderValue,
    productIds,
    customerEmail,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
  } = orderData;

  // Find tracked link by UTM content (which contains contentId or shortCode)
  let trackedLinkId: string | undefined;
  let contentId: string | undefined;

  if (utmContent) {
    // Try to find by content ID first
    const content = await prisma.generatedContent.findUnique({
      where: { id: utmContent },
    });

    if (content) {
      contentId = content.id;
    } else {
      // Try to find by short code
      const link = await prisma.trackedLink.findUnique({
        where: { shortCode: utmContent },
      });
      if (link) {
        trackedLinkId = link.id;
        contentId = link.contentId || undefined;
      }
    }
  }

  // Create conversion event
  await prisma.conversionEvent.create({
    data: {
      orderId,
      orderValue,
      productIds,
      customerEmail: customerEmail ? hashEmail(customerEmail) : undefined,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      trackedLinkId,
      contentId,
    },
  });

  // Update tracked link stats
  if (trackedLinkId) {
    await prisma.trackedLink.update({
      where: { id: trackedLinkId },
      data: {
        conversions: { increment: 1 },
        revenue: { increment: orderValue },
      },
    });
  }

  // Update content stats
  if (contentId) {
    await prisma.generatedContent.update({
      where: { id: contentId },
      data: {
        totalConversions: { increment: 1 },
        totalRevenue: { increment: orderValue },
      },
    });
  }
}

interface LinkAnalytics {
  id: string;
  shortCode: string;
  destinationUrl: string;
  clickCount: number;
  uniqueClicks: number;
  conversions: number;
  revenue: number;
  content: { id: string; title: string | null } | null;
  clicks: Array<{
    id: string;
    clickedAt: Date;
    device: string | null;
    browser: string | null;
  }>;
  analytics: {
    clicksByDevice: Record<string, number>;
    clicksByDay: Array<{ date: string; count: number }>;
    conversionRate: string;
  };
}

/**
 * Get link analytics
 */
export async function getLinkAnalytics(
  linkId: string
): Promise<LinkAnalytics | null> {
  const link = await prisma.trackedLink.findUnique({
    where: { id: linkId },
    include: {
      clicks: {
        orderBy: { clickedAt: "desc" },
        take: 100,
      },
      content: {
        select: { id: true, title: true },
      },
    },
  });

  if (!link) return null;

  // Calculate stats
  const clicksByDevice = await prisma.linkClick.groupBy({
    by: ["device"],
    where: { linkId },
    _count: true,
  });

  const clicksByDay = (await prisma.$queryRaw`
    SELECT DATE(clicked_at) as date, COUNT(*)::int as count
    FROM link_clicks
    WHERE link_id = ${linkId}
    GROUP BY DATE(clicked_at)
    ORDER BY date DESC
    LIMIT 30
  `) as Array<{ date: string; count: number }>;

  return {
    ...link,
    analytics: {
      clicksByDevice: Object.fromEntries(
        clicksByDevice.map((d) => [d.device || "unknown", d._count])
      ),
      clicksByDay,
      conversionRate:
        link.clickCount > 0
          ? ((link.conversions / link.clickCount) * 100).toFixed(2)
          : "0",
    },
  };
}

interface AttributionData {
  id: string;
  title: string | null;
  text: string;
  platform: string;
  publishedAt: Date | null;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  conversionRate: string;
  revenuePerClick: string;
}

/**
 * Get content attribution report
 */
export async function getContentAttributionReport(
  startDate: Date,
  endDate: Date
): Promise<AttributionData[]> {
  const content = await prisma.generatedContent.findMany({
    where: {
      OR: [{ totalClicks: { gt: 0 } }, { totalConversions: { gt: 0 } }],
      publishedAt: { gte: startDate, lte: endDate },
    },
    orderBy: { totalRevenue: "desc" },
    select: {
      id: true,
      title: true,
      text: true,
      platform: true,
      publishedAt: true,
      totalClicks: true,
      totalConversions: true,
      totalRevenue: true,
    },
  });

  return content.map((c) => ({
    ...c,
    conversionRate:
      c.totalClicks > 0
        ? ((c.totalConversions / c.totalClicks) * 100).toFixed(2)
        : "0",
    revenuePerClick:
      c.totalClicks > 0 ? (c.totalRevenue / c.totalClicks).toFixed(2) : "0",
  }));
}

// Helper functions
function parseDevice(userAgent?: string): string {
  if (!userAgent) return "unknown";
  if (/mobile/i.test(userAgent)) return "mobile";
  if (/tablet/i.test(userAgent)) return "tablet";
  return "desktop";
}

function parseBrowser(userAgent?: string): string {
  if (!userAgent) return "unknown";
  if (/chrome/i.test(userAgent)) return "chrome";
  if (/firefox/i.test(userAgent)) return "firefox";
  if (/safari/i.test(userAgent)) return "safari";
  if (/edge/i.test(userAgent)) return "edge";
  return "other";
}

function hashEmail(email: string): string {
  return crypto.createHash("sha256").update(email.toLowerCase()).digest("hex");
}

