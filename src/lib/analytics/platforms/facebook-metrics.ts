import { RawMetrics } from "../types";

/**
 * Fetch metrics for a Facebook post using Graph API
 */
export async function getFacebookMetrics(postId: string): Promise<RawMetrics> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error("META_ACCESS_TOKEN not configured");
  }
  
  // Fetch post insights
  const insightsUrl = new URL(`https://graph.facebook.com/v18.0/${postId}/insights`);
  insightsUrl.searchParams.set("metric", [
    "post_impressions",
    "post_impressions_unique",
    "post_engaged_users",
    "post_clicks",
    "post_reactions_by_type_total",
  ].join(","));
  insightsUrl.searchParams.set("access_token", accessToken);
  
  const insightsResponse = await fetch(insightsUrl.toString());
  
  if (!insightsResponse.ok) {
    const error = await insightsResponse.text();
    console.error(`[Facebook] Insights API error for ${postId}:`, insightsResponse.status, error);
    throw new Error(`Facebook API error: ${insightsResponse.status}`);
  }
  
  const insightsData = await insightsResponse.json();
  
  // Parse insights
  const getValue = (name: string): number => {
    const insight = insightsData.data?.find((i: { name: string }) => i.name === name);
    const value = insight?.values?.[0]?.value;
    // Handle object values (like reactions_by_type)
    if (typeof value === "object") {
      return Object.values(value).reduce((sum: number, v) => sum + (Number(v) || 0), 0);
    }
    return Number(value) || 0;
  };
  
  // Fetch basic post data for shares/comments
  const postUrl = new URL(`https://graph.facebook.com/v18.0/${postId}`);
  postUrl.searchParams.set("fields", "shares,comments.summary(true)");
  postUrl.searchParams.set("access_token", accessToken);
  
  const postResponse = await fetch(postUrl.toString());
  let shares = 0;
  let comments = 0;
  
  if (postResponse.ok) {
    const postData = await postResponse.json();
    shares = postData.shares?.count || 0;
    comments = postData.comments?.summary?.total_count || 0;
  }
  
  // Get reactions breakdown
  const reactions = insightsData.data?.find((i: { name: string }) => i.name === "post_reactions_by_type_total");
  const reactionValues = reactions?.values?.[0]?.value || {};
  const totalReactions = Object.values(reactionValues).reduce((sum: number, v) => sum + (Number(v) || 0), 0);
  
  return {
    impressions: getValue("post_impressions"),
    reach: getValue("post_impressions_unique"),
    likes: totalReactions,
    comments,
    shares,
    saves: 0, // Facebook doesn't have saves
    clicks: getValue("post_clicks"),
    profileVisits: 0, // Not available per-post
    follows: 0,
  };
}

/**
 * Fetch metrics for multiple Facebook posts
 */
export async function getFacebookMetricsBatch(postIds: string[]): Promise<Map<string, RawMetrics>> {
  const results = new Map<string, RawMetrics>();
  
  // Facebook doesn't support batch insights well, so we fetch one by one
  // with rate limiting
  for (const postId of postIds) {
    try {
      const metrics = await getFacebookMetrics(postId);
      results.set(postId, metrics);
    } catch (error) {
      console.error(`[Facebook] Failed to fetch ${postId}:`, error);
    }
    
    // Rate limit: 200 calls/hour = ~3 per second max
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}



