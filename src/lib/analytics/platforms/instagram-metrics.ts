import { RawMetrics } from "../types";

/**
 * Fetch metrics for an Instagram post using Graph API
 */
export async function getInstagramMetrics(mediaId: string): Promise<RawMetrics> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error("META_ACCESS_TOKEN not configured");
  }
  
  // First, get basic media data
  const mediaUrl = new URL(`https://graph.facebook.com/v18.0/${mediaId}`);
  mediaUrl.searchParams.set("fields", "like_count,comments_count,media_type");
  mediaUrl.searchParams.set("access_token", accessToken);
  
  const mediaResponse = await fetch(mediaUrl.toString());
  
  if (!mediaResponse.ok) {
    const error = await mediaResponse.text();
    console.error(`[Instagram] Media API error for ${mediaId}:`, mediaResponse.status, error);
    throw new Error(`Instagram API error: ${mediaResponse.status}`);
  }
  
  const mediaData = await mediaResponse.json();
  
  // Fetch insights
  const insightsUrl = new URL(`https://graph.facebook.com/v18.0/${mediaId}/insights`);
  
  // Different metrics available based on media type
  const isVideo = mediaData.media_type === "VIDEO" || mediaData.media_type === "REELS";
  const metrics = isVideo
    ? ["impressions", "reach", "saved", "shares", "plays", "total_interactions"]
    : ["impressions", "reach", "saved", "shares", "total_interactions"];
  
  insightsUrl.searchParams.set("metric", metrics.join(","));
  insightsUrl.searchParams.set("access_token", accessToken);
  
  const insightsResponse = await fetch(insightsUrl.toString());
  
  let impressions = 0;
  let reach = 0;
  let saves = 0;
  let shares = 0;
  
  if (insightsResponse.ok) {
    const insightsData = await insightsResponse.json();
    
    const getValue = (name: string): number => {
      const insight = insightsData.data?.find((i: { name: string }) => i.name === name);
      return Number(insight?.values?.[0]?.value) || 0;
    };
    
    impressions = getValue("impressions");
    reach = getValue("reach");
    saves = getValue("saved");
    shares = getValue("shares");
  } else {
    // Insights might not be available for all accounts
    console.warn(`[Instagram] Insights not available for ${mediaId}`);
  }
  
  return {
    impressions,
    reach,
    likes: mediaData.like_count || 0,
    comments: mediaData.comments_count || 0,
    shares,
    saves,
    clicks: 0, // Only available for stories with links
    profileVisits: 0,
    follows: 0,
  };
}

/**
 * Fetch metrics for multiple Instagram posts
 */
export async function getInstagramMetricsBatch(mediaIds: string[]): Promise<Map<string, RawMetrics>> {
  const results = new Map<string, RawMetrics>();
  
  for (const mediaId of mediaIds) {
    try {
      const metrics = await getInstagramMetrics(mediaId);
      results.set(mediaId, metrics);
    } catch (error) {
      console.error(`[Instagram] Failed to fetch ${mediaId}:`, error);
    }
    
    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}



