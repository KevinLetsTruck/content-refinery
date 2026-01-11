import { RawMetrics } from "../types";

/**
 * Fetch metrics for a tweet using Twitter API v2
 *
 * NOTE: organic_metrics and non_public_metrics require Pro tier ($5k/mo)
 * We use public_metrics only (available on all tiers) and estimate impressions
 * from engagement data when not available.
 */
export async function getTwitterMetrics(tweetId: string): Promise<RawMetrics> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;

  if (!bearerToken) {
    throw new Error("TWITTER_BEARER_TOKEN not configured");
  }

  // Only request public_metrics (available on Free/Basic tiers)
  // organic_metrics requires Pro tier and will cause 403 errors
  const url = new URL(`https://api.twitter.com/2/tweets/${tweetId}`);
  url.searchParams.set("tweet.fields", "public_metrics");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[Twitter] API error for ${tweetId}:`, response.status, error);

    // Handle specific error codes
    if (response.status === 404) {
      throw new Error("Tweet not found or deleted");
    }
    if (response.status === 429) {
      throw new Error("Rate limit exceeded");
    }

    throw new Error(`Twitter API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.data) {
    throw new Error("No data returned from Twitter API");
  }

  const publicMetrics = data.data.public_metrics || {};

  // Calculate total engagements from public metrics
  const likes = publicMetrics.like_count || 0;
  const retweets = publicMetrics.retweet_count || 0;
  const quotes = publicMetrics.quote_count || 0;
  const replies = publicMetrics.reply_count || 0;
  const bookmarks = publicMetrics.bookmark_count || 0;

  const totalEngagements = likes + retweets + quotes + replies + bookmarks;

  // Estimate impressions based on engagement
  // Industry average engagement rate is 0.5-2% on Twitter
  // We use 1.5% as a conservative estimate to calculate impressions
  // This gives us a reasonable proxy when we don't have access to organic_metrics
  const estimatedImpressions = totalEngagements > 0
    ? Math.round(totalEngagements / 0.015) // ~1.5% engagement rate estimate
    : 0;

  return {
    // Impressions: estimated from engagement (organic_metrics requires Pro tier)
    impressions: estimatedImpressions,
    reach: estimatedImpressions,
    likes,
    comments: replies,
    // Shares = retweets + quote tweets
    shares: retweets + quotes,
    // Bookmarks (saves)
    saves: bookmarks,
    // URL clicks not available without Pro tier
    clicks: 0,
    // Profile visits not available without Pro tier
    profileVisits: 0,
    follows: 0,
  };
}

/**
 * Fetch metrics for multiple tweets (batched)
 * Twitter allows up to 100 IDs per request
 */
export async function getTwitterMetricsBatch(tweetIds: string[]): Promise<Map<string, RawMetrics>> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;

  if (!bearerToken) {
    throw new Error("TWITTER_BEARER_TOKEN not configured");
  }

  const results = new Map<string, RawMetrics>();

  // Process in batches of 100
  const batchSize = 100;
  for (let i = 0; i < tweetIds.length; i += batchSize) {
    const batch = tweetIds.slice(i, i + batchSize);

    const url = new URL("https://api.twitter.com/2/tweets");
    url.searchParams.set("ids", batch.join(","));
    url.searchParams.set("tweet.fields", "public_metrics"); // Only public_metrics for Free/Basic tiers

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    });

    if (!response.ok) {
      console.error(`[Twitter] Batch fetch error:`, response.status);
      continue;
    }

    const data = await response.json();

    for (const tweet of data.data || []) {
      const publicMetrics = tweet.public_metrics || {};

      const likes = publicMetrics.like_count || 0;
      const retweets = publicMetrics.retweet_count || 0;
      const quotes = publicMetrics.quote_count || 0;
      const replies = publicMetrics.reply_count || 0;
      const bookmarks = publicMetrics.bookmark_count || 0;

      const totalEngagements = likes + retweets + quotes + replies + bookmarks;
      const estimatedImpressions = totalEngagements > 0
        ? Math.round(totalEngagements / 0.015)
        : 0;

      results.set(tweet.id, {
        impressions: estimatedImpressions,
        reach: estimatedImpressions,
        likes,
        comments: replies,
        shares: retweets + quotes,
        saves: bookmarks,
        clicks: 0,
        profileVisits: 0,
        follows: 0,
      });
    }

    // Rate limit: wait between batches
    if (i + batchSize < tweetIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}




