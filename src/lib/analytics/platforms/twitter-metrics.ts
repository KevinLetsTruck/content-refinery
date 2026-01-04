import { RawMetrics } from "../types";

/**
 * Fetch metrics for a tweet using Twitter API v2
 * Requires Elevated access for organic_metrics
 */
export async function getTwitterMetrics(tweetId: string): Promise<RawMetrics> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  
  if (!bearerToken) {
    throw new Error("TWITTER_BEARER_TOKEN not configured");
  }
  
  // Request public and organic metrics
  const url = new URL(`https://api.twitter.com/2/tweets/${tweetId}`);
  url.searchParams.set("tweet.fields", "public_metrics,organic_metrics,non_public_metrics");
  
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
  const organicMetrics = data.data.organic_metrics || {};
  const nonPublicMetrics = data.data.non_public_metrics || {};
  
  return {
    // Impressions: prefer organic, fall back to non_public
    impressions: organicMetrics.impression_count || nonPublicMetrics.impression_count || 0,
    // Twitter doesn't differentiate reach from impressions
    reach: organicMetrics.impression_count || nonPublicMetrics.impression_count || 0,
    likes: publicMetrics.like_count || 0,
    comments: publicMetrics.reply_count || 0,
    // Shares = retweets + quote tweets
    shares: (publicMetrics.retweet_count || 0) + (publicMetrics.quote_count || 0),
    // Bookmarks (saves)
    saves: publicMetrics.bookmark_count || 0,
    // URL clicks from organic metrics
    clicks: organicMetrics.url_link_clicks || 0,
    // Profile visits
    profileVisits: organicMetrics.user_profile_clicks || 0,
    // Follows not available per-tweet
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
    url.searchParams.set("tweet.fields", "public_metrics,organic_metrics");
    
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
      const organicMetrics = tweet.organic_metrics || {};
      
      results.set(tweet.id, {
        impressions: organicMetrics.impression_count || 0,
        reach: organicMetrics.impression_count || 0,
        likes: publicMetrics.like_count || 0,
        comments: publicMetrics.reply_count || 0,
        shares: (publicMetrics.retweet_count || 0) + (publicMetrics.quote_count || 0),
        saves: publicMetrics.bookmark_count || 0,
        clicks: organicMetrics.url_link_clicks || 0,
        profileVisits: organicMetrics.user_profile_clicks || 0,
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

