import prisma from "@/lib/db/prisma";
import { DEFAULT_OPTIMAL_TIMES, Platform } from "./types";

interface ScheduleSlot {
  datetime: Date;
  platform: string;
  score: number;
}

/**
 * Get optimal posting times for a platform based on historical performance data
 */
export async function getOptimalTimesForPlatform(
  platform: string,
  startDate: Date,
  endDate: Date
): Promise<ScheduleSlot[]> {
  // Get learned optimal times from database
  const optimalTimes = await prisma.optimalPostingTime.findMany({
    where: { platform },
    orderBy: { avgEngagement: "desc" },
  });

  // Get already scheduled posts to avoid conflicts
  const existingScheduled = await prisma.campaignPost.findMany({
    where: {
      platform,
      scheduledFor: {
        gte: startDate,
        lte: endDate,
      },
      status: { in: ["scheduled", "published"] },
    },
    select: { scheduledFor: true },
  });

  // Also check GeneratedContent scheduled posts
  const existingGenerated = await prisma.generatedContent.findMany({
    where: {
      platform,
      scheduledFor: {
        gte: startDate,
        lte: endDate,
      },
      status: { in: ["scheduled", "published"] },
    },
    select: { scheduledFor: true },
  });

  const scheduledTimes = new Set([
    ...existingScheduled.map((p) => p.scheduledFor.toISOString()),
    ...existingGenerated.map((p) => p.scheduledFor?.toISOString()).filter(Boolean),
  ]);

  // Generate all possible slots
  const slots: ScheduleSlot[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();

    // Check hours 6 AM to 10 PM only
    for (let hour = 6; hour <= 22; hour++) {
      const slotTime = new Date(current);
      slotTime.setHours(hour, 0, 0, 0);

      // Skip past times
      if (slotTime < new Date()) {
        continue;
      }

      // Skip if already scheduled
      if (scheduledTimes.has(slotTime.toISOString())) {
        continue;
      }

      // Find optimal time data for this slot
      const optimalData = optimalTimes.find(
        (t) => t.dayOfWeek === dayOfWeek && t.hour === hour
      );

      // Check if this is a default optimal time
      const defaultTimes = DEFAULT_OPTIMAL_TIMES[platform as Platform] || [9, 17];
      const isDefaultOptimal = defaultTimes.includes(hour);

      // Calculate score
      let score = 0.5; // Base score
      if (optimalData) {
        score = Number(optimalData.avgEngagement);
      } else if (isDefaultOptimal) {
        score = 0.75; // Boost for default optimal times
      }

      slots.push({
        datetime: new Date(slotTime),
        platform,
        score,
      });
    }

    current.setDate(current.getDate() + 1);
  }

  // Sort by score (best times first)
  return slots.sort((a, b) => b.score - a.score);
}

/**
 * Schedule all posts for a campaign using smart scheduling
 */
export async function scheduleCampaign(campaignId: string): Promise<{
  scheduled: number;
  conflicts: number;
}> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      posts: {
        where: { status: "draft" },
        orderBy: [{ dayNumber: "asc" }, { platform: "asc" }],
      },
      videos: {
        where: { status: "pending" },
        orderBy: { dayNumber: "asc" },
      },
    },
  });

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const results = { scheduled: 0, conflicts: 0 };

  // Group posts by day and platform
  const postsByDayPlatform = new Map<string, typeof campaign.posts>();

  for (const post of campaign.posts) {
    const key = `${post.dayNumber}-${post.platform}`;
    if (!postsByDayPlatform.has(key)) {
      postsByDayPlatform.set(key, []);
    }
    postsByDayPlatform.get(key)!.push(post);
  }

  // Get optimal times for each platform over the campaign duration
  const platformSlots = new Map<string, ScheduleSlot[]>();
  for (const platform of campaign.platforms) {
    const slots = await getOptimalTimesForPlatform(
      platform,
      campaign.startDate,
      campaign.endDate
    );
    platformSlots.set(platform, slots);
  }

  // Track used slots to avoid double-booking
  const usedSlots = new Set<string>();

  // Schedule each post
  for (const [key, posts] of postsByDayPlatform) {
    const [dayNumStr, platform] = key.split("-");
    const dayNumber = parseInt(dayNumStr);

    // Calculate the actual date for this day
    const postDate = new Date(campaign.startDate);
    postDate.setDate(postDate.getDate() + dayNumber - 1);

    // Get available slots for this platform on this day
    const slots = platformSlots.get(platform) || [];
    const daySlotsAvailable = slots.filter((slot) => {
      const slotDate = new Date(slot.datetime);
      return (
        slotDate.toDateString() === postDate.toDateString() &&
        !usedSlots.has(slot.datetime.toISOString())
      );
    });

    // Sort by score
    daySlotsAvailable.sort((a, b) => b.score - a.score);

    // Assign slots to posts
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      let scheduledTime: Date;

      if (i < daySlotsAvailable.length) {
        // Use optimal slot
        scheduledTime = daySlotsAvailable[i].datetime;
        usedSlots.add(scheduledTime.toISOString());
      } else {
        // Fall back to default times
        const defaultHours = DEFAULT_OPTIMAL_TIMES[platform as Platform] || [9, 17];
        const fallbackHour = defaultHours[i % defaultHours.length];
        scheduledTime = new Date(postDate);
        scheduledTime.setHours(fallbackHour, 0, 0, 0);

        // Check for conflict
        if (usedSlots.has(scheduledTime.toISOString())) {
          // Try to find any available hour
          for (let h = 6; h <= 22; h++) {
            const tryTime = new Date(postDate);
            tryTime.setHours(h, 0, 0, 0);
            if (!usedSlots.has(tryTime.toISOString())) {
              scheduledTime = tryTime;
              break;
            }
          }
          results.conflicts++;
        }
        usedSlots.add(scheduledTime.toISOString());
      }

      await prisma.campaignPost.update({
        where: { id: post.id },
        data: {
          scheduledFor: scheduledTime,
          status: "scheduled",
          optimalTime: i < daySlotsAvailable.length,
        },
      });

      results.scheduled++;
    }
  }

  // Schedule videos
  for (const video of campaign.videos) {
    const videoDate = new Date(campaign.startDate);
    videoDate.setDate(videoDate.getDate() + video.dayNumber - 1);

    // Use afternoon for YouTube
    const youtubeHours = DEFAULT_OPTIMAL_TIMES.youtube;
    videoDate.setHours(youtubeHours[0], 0, 0, 0);

    await prisma.campaignVideo.update({
      where: { id: video.id },
      data: {
        scheduledFor: videoDate,
        status: "scripting",
      },
    });

    results.scheduled++;
  }

  // Update campaign status
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "approved" },
  });

  return results;
}

/**
 * Reschedule a single post
 */
export async function reschedulePost(
  postId: string,
  newDateTime: Date
): Promise<void> {
  await prisma.campaignPost.update({
    where: { id: postId },
    data: {
      scheduledFor: newDateTime,
      optimalTime: false, // Manual override
    },
  });
}

/**
 * Update optimal posting times based on performance data
 * This should be called by the learning engine cron job
 */
export async function updateOptimalPostingTimes(): Promise<{
  updated: number;
}> {
  // Get performance data grouped by platform, day, hour
  const performanceData = await prisma.$queryRaw<
    Array<{
      platform: string;
      day_of_week: number;
      hour: number;
      avg_engagement: number;
      avg_impressions: number;
      sample_size: number;
    }>
  >`
    SELECT 
      platform,
      EXTRACT(DOW FROM published_at) as day_of_week,
      EXTRACT(HOUR FROM published_at) as hour,
      AVG(
        CASE 
          WHEN impressions > 0 
          THEN (engagements::float / impressions) * 100
          ELSE 0
        END
      ) as avg_engagement,
      AVG(impressions) as avg_impressions,
      COUNT(*) as sample_size
    FROM campaign_posts
    WHERE 
      status = 'published'
      AND published_at IS NOT NULL
      AND impressions > 0
    GROUP BY platform, day_of_week, hour
    HAVING COUNT(*) >= 3
    ORDER BY platform, avg_engagement DESC
  `;

  let updated = 0;

  for (const row of performanceData) {
    await prisma.optimalPostingTime.upsert({
      where: {
        platform_dayOfWeek_hour: {
          platform: row.platform,
          dayOfWeek: Number(row.day_of_week),
          hour: Number(row.hour),
        },
      },
      create: {
        platform: row.platform,
        dayOfWeek: Number(row.day_of_week),
        hour: Number(row.hour),
        avgEngagement: row.avg_engagement,
        avgImpressions: Math.round(row.avg_impressions),
        sampleSize: Number(row.sample_size),
        confidence: Math.min(Number(row.sample_size) / 20, 1), // Max confidence at 20 samples
      },
      update: {
        avgEngagement: row.avg_engagement,
        avgImpressions: Math.round(row.avg_impressions),
        sampleSize: Number(row.sample_size),
        confidence: Math.min(Number(row.sample_size) / 20, 1),
      },
    });
    updated++;
  }

  return { updated };
}

/**
 * Get scheduling suggestions for a specific day
 */
export async function getSchedulingSuggestions(
  platform: string,
  date: Date
): Promise<Array<{ hour: number; score: number; reason: string }>> {
  const dayOfWeek = date.getDay();

  // Get learned data
  const optimalTimes = await prisma.optimalPostingTime.findMany({
    where: {
      platform,
      dayOfWeek,
    },
    orderBy: { avgEngagement: "desc" },
  });

  const suggestions: Array<{ hour: number; score: number; reason: string }> = [];

  // Add learned times
  for (const time of optimalTimes.slice(0, 5)) {
    suggestions.push({
      hour: time.hour,
      score: Number(time.avgEngagement),
      reason: `${Number(time.avgEngagement).toFixed(2)}% avg engagement (${time.sampleSize} posts)`,
    });
  }

  // If not enough data, add defaults
  if (suggestions.length < 3) {
    const defaultHours = DEFAULT_OPTIMAL_TIMES[platform as Platform] || [9, 17];
    for (const hour of defaultHours) {
      if (!suggestions.find((s) => s.hour === hour)) {
        suggestions.push({
          hour,
          score: 0.5,
          reason: "Recommended default time",
        });
      }
    }
  }

  return suggestions.sort((a, b) => b.score - a.score);
}



