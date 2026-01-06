import prisma from "@/lib/db/prisma";

interface EvergreenCandidate {
  id: string;
  text: string;
  platform: string;
  evergreenScore: number;
  lastResharedAt: Date | null;
  reshareCount: number;
}

/**
 * Mark content as evergreen
 */
export async function markAsEvergreen(
  contentId: string,
  isEvergreen: boolean = true
): Promise<void> {
  const content = await prisma.generatedContent.findUnique({
    where: { id: contentId },
    include: {
      performance: true,
    },
  });

  if (!content) {
    throw new Error("Content not found");
  }

  // Calculate evergreen score based on performance
  let evergreenScore = 50; // Default score
  if (content.performance) {
    const perf = content.performance;
    const engagementRate =
      perf.impressions > 0
        ? ((perf.likes + perf.comments + perf.shares) / perf.impressions) * 100
        : 0;
    evergreenScore = Math.min(100, engagementRate * 10 + (perf.likes || 0) * 0.1);
  }

  await prisma.generatedContent.update({
    where: { id: contentId },
    data: {
      isEvergreen,
      evergreenScore: isEvergreen ? evergreenScore : null,
      nextReshareDate: isEvergreen
        ? calculateNextReshareDate(content.platform)
        : null,
    },
  });
}

/**
 * Get evergreen content ready for resharing
 */
export async function getEvergreenToReshare(
  platform?: string,
  limit: number = 5
): Promise<EvergreenCandidate[]> {
  const now = new Date();

  const where: {
    isEvergreen: boolean;
    evergreenPausedAt: null;
    status: string;
    OR: Array<{ nextReshareDate: null } | { nextReshareDate: { lte: Date } }>;
    platform?: string;
  } = {
    isEvergreen: true,
    evergreenPausedAt: null,
    status: "published",
    OR: [{ nextReshareDate: null }, { nextReshareDate: { lte: now } }],
  };

  if (platform) {
    where.platform = platform;
  }

  const content = await prisma.generatedContent.findMany({
    where,
    orderBy: [
      { evergreenScore: "desc" },
      { lastResharedAt: "asc" }, // Prioritize least recently shared
    ],
    take: limit,
  });

  return content.map((c) => ({
    id: c.id,
    text: c.text || "",
    platform: c.platform,
    evergreenScore: c.evergreenScore || 50,
    lastResharedAt: c.lastResharedAt,
    reshareCount: c.reshareCount,
  }));
}

/**
 * Schedule evergreen reshares for the day
 */
export async function scheduleEvergreenReshares(): Promise<{
  scheduled: number;
  platforms: Record<string, number>;
}> {
  const settings = await prisma.evergreenSettings.findMany({
    where: { enabled: true },
  });

  const results = {
    scheduled: 0,
    platforms: {} as Record<string, number>,
  };

  for (const platformSettings of settings) {
    const { platform, maxResharesPerDay, preferredTimes, minDaysBetween } =
      platformSettings;

    // Check how many already scheduled today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const alreadyScheduled = await prisma.generatedContent.count({
      where: {
        platform,
        scheduledFor: { gte: today, lt: tomorrow },
        isEvergreen: true,
      },
    });

    const slotsAvailable = maxResharesPerDay - alreadyScheduled;
    if (slotsAvailable <= 0) continue;

    // Get candidates
    const candidates = await getEvergreenToReshare(platform, slotsAvailable);

    // Filter by min days between reshares
    const eligibleCandidates = candidates.filter((c) => {
      if (!c.lastResharedAt) return true;
      const daysSinceReshare = Math.floor(
        (Date.now() - c.lastResharedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceReshare >= minDaysBetween;
    });

    // Schedule each candidate
    for (
      let i = 0;
      i < Math.min(eligibleCandidates.length, slotsAvailable);
      i++
    ) {
      const candidate = eligibleCandidates[i];
      const scheduledTime = getNextAvailableTime(preferredTimes, i);

      // Create reshare entry
      await prisma.evergreenReshare.create({
        data: {
          contentId: candidate.id,
          platform,
        },
      });

      // Update content with new schedule
      await prisma.generatedContent.update({
        where: { id: candidate.id },
        data: {
          scheduledFor: scheduledTime,
          status: "scheduled",
          lastResharedAt: new Date(),
          reshareCount: { increment: 1 },
          nextReshareDate: calculateNextReshareDate(platform, minDaysBetween),
        },
      });

      results.scheduled++;
      results.platforms[platform] = (results.platforms[platform] || 0) + 1;
    }
  }

  return results;
}

/**
 * Update evergreen scores based on recent performance
 */
export async function updateEvergreenScores(): Promise<number> {
  const evergreenContent = await prisma.generatedContent.findMany({
    where: { isEvergreen: true },
    include: {
      reshares: {
        orderBy: { resharedAt: "desc" },
        take: 5,
      },
      performance: true,
    },
  });

  let updated = 0;

  for (const content of evergreenContent) {
    // Calculate score based on:
    // 1. Original performance
    // 2. Reshare performance
    // 3. Decay over time (older content slightly lower priority)

    let score = 50;

    // Original performance contribution
    if (content.performance) {
      const perf = content.performance;
      const engagementRate =
        perf.impressions > 0
          ? ((perf.likes + perf.comments + perf.shares) / perf.impressions) *
            100
          : 0;
      score += engagementRate * 5;
    }

    // Reshare performance contribution
    if (content.reshares.length > 0) {
      const avgReshareEngagement =
        content.reshares.reduce((sum, r) => sum + (r.engagements || 0), 0) /
        content.reshares.length;
      score += avgReshareEngagement * 0.5;
    }

    // Time decay (reduce score for very old content slightly)
    const ageInDays = Math.floor(
      (Date.now() - content.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (ageInDays > 180) {
      score *= 0.95;
    }
    if (ageInDays > 365) {
      score *= 0.9;
    }

    // Cap score at 100
    score = Math.min(100, Math.max(0, score));

    await prisma.generatedContent.update({
      where: { id: content.id },
      data: { evergreenScore: score },
    });

    updated++;
  }

  return updated;
}

/**
 * Pause evergreen resharing for content
 */
export async function pauseEvergreen(contentId: string): Promise<void> {
  await prisma.generatedContent.update({
    where: { id: contentId },
    data: { evergreenPausedAt: new Date() },
  });
}

/**
 * Resume evergreen resharing
 */
export async function resumeEvergreen(contentId: string): Promise<void> {
  await prisma.generatedContent.update({
    where: { id: contentId },
    data: {
      evergreenPausedAt: null,
      nextReshareDate: calculateNextReshareDate("twitter"), // Default
    },
  });
}

// Helper functions
function calculateNextReshareDate(
  platform: string,
  minDays: number = 14
): Date {
  // Suppress unused variable warning
  void platform;
  const next = new Date();
  next.setDate(next.getDate() + minDays + Math.floor(Math.random() * 7)); // Add some randomness
  return next;
}

function getNextAvailableTime(preferredTimes: string[], index: number): Date {
  const today = new Date();
  const times =
    preferredTimes.length > 0 ? preferredTimes : ["09:00", "14:00", "19:00"];
  const timeIndex = index % times.length;
  const [hours, minutes] = times[timeIndex].split(":").map(Number);

  today.setHours(hours, minutes, 0, 0);

  // If time has passed, schedule for tomorrow
  if (today < new Date()) {
    today.setDate(today.getDate() + 1);
  }

  return today;
}




