/**
 * Meta API Client for Content Refinery
 *
 * Handles publishing to Facebook Pages and Instagram Business accounts
 * Uses the Meta Graph API v18.0
 *
 * Environment variables:
 * For Facebook:
 *   - META_ACCESS_TOKEN (Page Access Token with pages_manage_posts)
 *   - FACEBOOK_PAGE_ID (Your Facebook Page ID)
 *
 * For Instagram (using Instagram API with Instagram Login):
 *   - INSTAGRAM_ACCESS_TOKEN (Instagram user access token)
 *   - INSTAGRAM_BUSINESS_ACCOUNT_ID (Your IG Business Account ID)
 *
 * Note: Instagram can use either META_ACCESS_TOKEN (if using Facebook Login flow)
 * or INSTAGRAM_ACCESS_TOKEN (if using Instagram Login flow)
 */

const GRAPH_API_VERSION = "v18.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
// Instagram API with Instagram Login uses a different base URL (no version in path)
const INSTAGRAM_GRAPH_API_BASE = `https://graph.instagram.com`;

/**
 * Determine if we're using Instagram Login tokens (vs Facebook Login tokens)
 * Instagram Login tokens require the Instagram Graph API endpoint
 */
function isUsingInstagramLoginToken(): boolean {
  return !!process.env.INSTAGRAM_ACCESS_TOKEN;
}

/**
 * Get the appropriate API base for Instagram operations
 * Uses graph.instagram.com for Instagram Login tokens
 * Uses graph.facebook.com for Facebook Login tokens
 */
function getInstagramApiBase(): string {
  return isUsingInstagramLoginToken() ? INSTAGRAM_GRAPH_API_BASE : GRAPH_API_BASE;
}

interface MetaConfig {
  accessToken: string;
  facebookPageId?: string;
  instagramAccountId?: string;
}

interface InstagramConfig {
  accessToken: string;
  instagramAccountId: string;
}

interface PostResult {
  id: string;
  url: string;
  platform: "facebook" | "instagram";
}

interface FacebookPostOptions {
  message: string;
  link?: string;
  imageUrl?: string;
  /**
   * Schedule for future publishing using Facebook's native scheduler.
   * Posts scheduled this way appear as native posts without "Published by [App]" attribution.
   * Must be between 10 minutes and 6 months in the future.
   */
  scheduledTime?: Date;
}

interface ScheduledPostResult extends PostResult {
  scheduledTime?: Date;
  isScheduled: boolean;
}

interface InstagramPostOptions {
  caption: string;
  imageUrl: string; // Required for Instagram
  mediaType?: "IMAGE" | "VIDEO" | "CAROUSEL";
}

function getConfig(): MetaConfig {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const facebookPageId = process.env.FACEBOOK_PAGE_ID;
  const instagramAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (!accessToken) {
    throw new Error("META_ACCESS_TOKEN environment variable is not set");
  }

  return {
    accessToken,
    facebookPageId,
    instagramAccountId,
  };
}

/**
 * Get Instagram-specific config (supports both Instagram Login and Facebook Login tokens)
 */
function getInstagramConfig(): InstagramConfig {
  // Try Instagram-specific token first, fall back to Meta token
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
  const instagramAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (!accessToken) {
    throw new Error("INSTAGRAM_ACCESS_TOKEN or META_ACCESS_TOKEN environment variable is not set");
  }

  if (!instagramAccountId) {
    throw new Error("INSTAGRAM_BUSINESS_ACCOUNT_ID environment variable is not set");
  }

  return {
    accessToken,
    instagramAccountId,
  };
}

/**
 * Calculate minimum scheduled time (10 minutes from now)
 * Facebook requires scheduled posts to be at least 10 minutes in the future
 */
function getMinimumScheduledTime(): Date {
  return new Date(Date.now() + 11 * 60 * 1000); // 11 minutes to be safe
}

/**
 * Post to Facebook Page
 *
 * By default, uses native scheduling (10 min delay) to avoid "Published by [App]" attribution.
 * This makes posts appear as native Facebook posts with full algorithmic reach.
 *
 * Set scheduledTime to a specific future time, or pass null to post immediately
 * (immediate posts will show "Published by Content Refinery" and may get reduced reach).
 */
export async function postToFacebook(options: FacebookPostOptions & {
  useNativeScheduling?: boolean
}): Promise<ScheduledPostResult> {
  const config = getConfig();

  if (!config.facebookPageId) {
    throw new Error("FACEBOOK_PAGE_ID environment variable is not set");
  }

  // Default to native scheduling to avoid third-party attribution penalty
  const useNativeScheduling = options.useNativeScheduling !== false;

  // Calculate scheduled time
  let scheduledTime: Date | undefined;
  if (options.scheduledTime) {
    scheduledTime = options.scheduledTime;
  } else if (useNativeScheduling) {
    // Default to 10 minutes from now (minimum allowed by Facebook)
    scheduledTime = getMinimumScheduledTime();
  }

  // Validate scheduled time is within Facebook's allowed range (10 min to 6 months)
  if (scheduledTime) {
    const minTime = Date.now() + 10 * 60 * 1000; // 10 minutes
    const maxTime = Date.now() + 180 * 24 * 60 * 60 * 1000; // ~6 months

    if (scheduledTime.getTime() < minTime) {
      scheduledTime = getMinimumScheduledTime();
    } else if (scheduledTime.getTime() > maxTime) {
      throw new Error("Scheduled time must be within 6 months");
    }
  }

  // If image URL provided, post as photo instead
  if (options.imageUrl) {
    return postFacebookPhoto({
      caption: options.message,
      imageUrl: options.imageUrl,
      scheduledTime,
    });
  }

  const url = `${GRAPH_API_BASE}/${config.facebookPageId}/feed`;

  const body: Record<string, string | boolean | number> = {
    message: options.message,
    access_token: config.accessToken,
  };

  if (options.link) {
    body.link = options.link;
  }

  // Use native scheduling to avoid "Published by [App]" attribution
  if (scheduledTime) {
    body.published = false;
    body.scheduled_publish_time = Math.floor(scheduledTime.getTime() / 1000);
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("[Meta] Facebook post error:", error);
    throw new Error(`Facebook API error: ${error.error?.message || JSON.stringify(error)}`);
  }

  const data = await response.json();

  return {
    id: data.id,
    url: `https://facebook.com/${data.id}`,
    platform: "facebook",
    scheduledTime,
    isScheduled: !!scheduledTime,
  };
}

/**
 * Post photo to Facebook Page
 *
 * Uses a two-step process for native scheduling to properly avoid "Published by [App]" attribution:
 * 1. Upload photo as temporary/unpublished
 * 2. Create scheduled post on /feed with attached_media
 *
 * This approach ensures the post appears as a native Facebook post when published.
 */
async function postFacebookPhoto(options: {
  caption: string;
  imageUrl: string;
  scheduledTime?: Date;
}): Promise<ScheduledPostResult> {
  const config = getConfig();

  if (!config.facebookPageId) {
    throw new Error("FACEBOOK_PAGE_ID environment variable is not set");
  }

  // If scheduling, use two-step process to avoid "Published by" attribution
  if (options.scheduledTime) {
    // Step 1: Upload photo as temporary (unpublished)
    const photoUrl = `${GRAPH_API_BASE}/${config.facebookPageId}/photos`;
    const photoBody = {
      url: options.imageUrl,
      published: false,
      temporary: true,
      access_token: config.accessToken,
    };

    const photoResponse = await fetch(photoUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(photoBody),
    });

    if (!photoResponse.ok) {
      const error = await photoResponse.json();
      console.error("[Meta] Facebook photo upload error:", error);
      throw new Error(`Facebook photo upload error: ${error.error?.message || JSON.stringify(error)}`);
    }

    const photoData = await photoResponse.json();
    const photoId = photoData.id;

    console.log(`[Meta] Uploaded temporary photo: ${photoId}`);

    // Step 2: Create scheduled post with attached photo
    const feedUrl = `${GRAPH_API_BASE}/${config.facebookPageId}/feed`;
    const feedBody = {
      message: options.caption,
      attached_media: JSON.stringify([{ media_fbid: photoId }]),
      published: false,
      scheduled_publish_time: Math.floor(options.scheduledTime.getTime() / 1000),
      access_token: config.accessToken,
    };

    const feedResponse = await fetch(feedUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(feedBody),
    });

    if (!feedResponse.ok) {
      const error = await feedResponse.json();
      console.error("[Meta] Facebook scheduled post error:", error);
      throw new Error(`Facebook scheduled post error: ${error.error?.message || JSON.stringify(error)}`);
    }

    const feedData = await feedResponse.json();

    console.log(`[Meta] Created scheduled post ${feedData.id} for ${options.scheduledTime.toISOString()}`);

    return {
      id: feedData.id,
      url: `https://facebook.com/${feedData.id}`,
      platform: "facebook",
      scheduledTime: options.scheduledTime,
      isScheduled: true,
    };
  }

  // Immediate posting (will show "Published by" attribution)
  const url = `${GRAPH_API_BASE}/${config.facebookPageId}/photos`;

  const body: Record<string, string | boolean | number> = {
    caption: options.caption,
    url: options.imageUrl,
    access_token: config.accessToken,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("[Meta] Facebook photo error:", error);
    throw new Error(`Facebook API error: ${error.error?.message || JSON.stringify(error)}`);
  }

  const data = await response.json();

  return {
    id: data.id,
    url: `https://facebook.com/${config.facebookPageId}/photos/${data.id}`,
    platform: "facebook",
    scheduledTime: undefined,
    isScheduled: false,
  };
}

/**
 * Post to Instagram Business Account
 *
 * Instagram posting is a 2-step process:
 * 1. Create a media container
 * 2. Publish the container
 *
 * Supports both Instagram Login tokens (INSTAGRAM_ACCESS_TOKEN) and
 * Facebook Login tokens (META_ACCESS_TOKEN)
 */
export async function postToInstagram(options: InstagramPostOptions): Promise<PostResult> {
  const config = getInstagramConfig();
  const apiBase = getInstagramApiBase();

  console.log(`[Instagram] Using API base: ${apiBase}`);
  console.log(`[Instagram] Account ID: ${config.instagramAccountId}`);

  // Step 1: Create media container
  const containerUrl = `${apiBase}/${config.instagramAccountId}/media`;

  const containerBody: Record<string, string> = {
    caption: options.caption,
    access_token: config.accessToken,
  };

  if (options.mediaType === "VIDEO") {
    containerBody.video_url = options.imageUrl;
    containerBody.media_type = "VIDEO";
  } else {
    containerBody.image_url = options.imageUrl;
  }

  const containerResponse = await fetch(containerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(containerBody),
  });

  if (!containerResponse.ok) {
    const error = await containerResponse.json();
    console.error("[Meta] Instagram container error:", error);
    throw new Error(`Instagram API error: ${error.error?.message || JSON.stringify(error)}`);
  }

  const containerData = await containerResponse.json();
  const containerId = containerData.id;

  // Step 2: Wait for container to be ready (for videos)
  if (options.mediaType === "VIDEO") {
    await waitForMediaReady(containerId, config.accessToken);
  }

  // Step 3: Publish the container
  const publishUrl = `${apiBase}/${config.instagramAccountId}/media_publish`;
  
  const publishResponse = await fetch(publishUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: config.accessToken,
    }),
  });

  if (!publishResponse.ok) {
    const error = await publishResponse.json();
    console.error("[Meta] Instagram publish error:", error);
    throw new Error(`Instagram API error: ${error.error?.message || JSON.stringify(error)}`);
  }

  const publishData = await publishResponse.json();
  
  // Get the permalink
  const mediaId = publishData.id;
  const permalink = await getInstagramPermalink(mediaId, config.accessToken);

  return {
    id: mediaId,
    url: permalink,
    platform: "instagram",
  };
}

/**
 * Wait for Instagram media container to be ready (for videos)
 */
async function waitForMediaReady(containerId: string, accessToken: string): Promise<void> {
  const apiBase = getInstagramApiBase();
  const maxAttempts = 30;
  const delayMs = 5000;

  for (let i = 0; i < maxAttempts; i++) {
    const statusUrl = `${apiBase}/${containerId}?fields=status_code&access_token=${accessToken}`;
    
    const response = await fetch(statusUrl);
    const data = await response.json();
    
    if (data.status_code === "FINISHED") {
      return;
    }
    
    if (data.status_code === "ERROR") {
      throw new Error("Instagram media processing failed");
    }
    
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  
  throw new Error("Instagram media processing timed out");
}

/**
 * Get Instagram post permalink
 */
async function getInstagramPermalink(mediaId: string, accessToken: string): Promise<string> {
  const apiBase = getInstagramApiBase();
  const url = `${apiBase}/${mediaId}?fields=permalink&access_token=${accessToken}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    // Fallback URL if we can't get permalink
    return `https://instagram.com/p/${mediaId}`;
  }
  
  const data = await response.json();
  return data.permalink || `https://instagram.com/p/${mediaId}`;
}

/**
 * Post Instagram carousel (multiple images)
 */
export async function postInstagramCarousel(options: {
  caption: string;
  imageUrls: string[];
}): Promise<PostResult> {
  const config = getInstagramConfig();
  const apiBase = getInstagramApiBase();

  if (options.imageUrls.length < 2 || options.imageUrls.length > 10) {
    throw new Error("Carousel requires 2-10 images");
  }

  // Step 1: Create containers for each image
  const childContainerIds: string[] = [];

  for (const imageUrl of options.imageUrls) {
    const containerUrl = `${apiBase}/${config.instagramAccountId}/media`;
    
    const response = await fetch(containerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        is_carousel_item: true,
        access_token: config.accessToken,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create carousel item: ${error.error?.message}`);
    }
    
    const data = await response.json();
    childContainerIds.push(data.id);
  }

  // Step 2: Create carousel container
  const carouselUrl = `${apiBase}/${config.instagramAccountId}/media`;
  
  const carouselResponse = await fetch(carouselUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      caption: options.caption,
      media_type: "CAROUSEL",
      children: childContainerIds.join(","),
      access_token: config.accessToken,
    }),
  });

  if (!carouselResponse.ok) {
    const error = await carouselResponse.json();
    throw new Error(`Failed to create carousel: ${error.error?.message}`);
  }

  const carouselData = await carouselResponse.json();
  const carouselId = carouselData.id;

  // Step 3: Publish carousel
  const publishUrl = `${apiBase}/${config.instagramAccountId}/media_publish`;
  
  const publishResponse = await fetch(publishUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: carouselId,
      access_token: config.accessToken,
    }),
  });

  if (!publishResponse.ok) {
    const error = await publishResponse.json();
    throw new Error(`Failed to publish carousel: ${error.error?.message}`);
  }

  const publishData = await publishResponse.json();
  const mediaId = publishData.id;
  const permalink = await getInstagramPermalink(mediaId, config.accessToken);

  return {
    id: mediaId,
    url: permalink,
    platform: "instagram",
  };
}

/**
 * Check if Meta credentials are configured
 */
export function isConfigured(): { facebook: boolean; instagram: boolean } {
  // Check Facebook (requires META_ACCESS_TOKEN + FACEBOOK_PAGE_ID)
  const facebookConfigured =
    !!process.env.META_ACCESS_TOKEN && !!process.env.FACEBOOK_PAGE_ID;

  // Check Instagram (requires token + account ID)
  // Supports both INSTAGRAM_ACCESS_TOKEN and META_ACCESS_TOKEN
  const instagramToken =
    process.env.INSTAGRAM_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
  const instagramConfigured =
    !!instagramToken && !!process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  return {
    facebook: facebookConfigured,
    instagram: instagramConfigured,
  };
}

/**
 * Get Facebook Page info
 */
export async function getFacebookPageInfo(): Promise<{
  id: string;
  name: string;
  followers: number;
}> {
  const config = getConfig();
  
  if (!config.facebookPageId) {
    throw new Error("FACEBOOK_PAGE_ID not set");
  }

  const url = `${GRAPH_API_BASE}/${config.facebookPageId}?fields=id,name,followers_count&access_token=${config.accessToken}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Facebook API error: ${error.error?.message}`);
  }
  
  const data = await response.json();
  
  return {
    id: data.id,
    name: data.name,
    followers: data.followers_count,
  };
}

/**
 * Get Instagram account info
 */
export async function getInstagramAccountInfo(): Promise<{
  id: string;
  username: string;
  followers: number;
}> {
  const config = getInstagramConfig();
  const apiBase = getInstagramApiBase();

  const url = `${apiBase}/${config.instagramAccountId}?fields=id,username,followers_count&access_token=${config.accessToken}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Instagram API error: ${error.error?.message}`);
  }
  
  const data = await response.json();
  
  return {
    id: data.id,
    username: data.username,
    followers: data.followers_count,
  };
}

/**
 * Delete a Facebook post
 */
export async function deleteFacebookPost(postId: string): Promise<boolean> {
  const config = getConfig();

  const url = `${GRAPH_API_BASE}/${postId}?access_token=${config.accessToken}`;

  const response = await fetch(url, { method: "DELETE" });

  return response.ok;
}

/**
 * Validate the access token and get debug info
 * Useful for checking if token is still valid and what permissions it has
 */
export async function debugToken(): Promise<{
  isValid: boolean;
  appId?: string;
  type?: string;
  expiresAt?: Date | null;
  scopes?: string[];
  error?: string;
}> {
  const config = getConfig();
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    return {
      isValid: false,
      error: "META_APP_ID or META_APP_SECRET not configured for token debugging",
    };
  }

  try {
    const url = `${GRAPH_API_BASE}/debug_token?input_token=${config.accessToken}&access_token=${appId}|${appSecret}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return {
        isValid: false,
        error: data.error.message,
      };
    }

    const tokenData = data.data;

    return {
      isValid: tokenData.is_valid,
      appId: tokenData.app_id,
      type: tokenData.type, // "PAGE" for page tokens, "USER" for user tokens
      expiresAt: tokenData.expires_at ? new Date(tokenData.expires_at * 1000) : null,
      scopes: tokenData.scopes,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get connection status with detailed information
 */
export async function getConnectionStatus(): Promise<{
  facebook: {
    connected: boolean;
    pageId?: string;
    pageName?: string;
    followers?: number;
    error?: string;
  };
  instagram: {
    connected: boolean;
    accountId?: string;
    username?: string;
    followers?: number;
    error?: string;
  };
  tokenInfo?: {
    isValid: boolean;
    type?: string;
    expiresAt?: Date | null;
    scopes?: string[];
  };
}> {
  const result: {
    facebook: {
      connected: boolean;
      pageId?: string;
      pageName?: string;
      followers?: number;
      error?: string;
    };
    instagram: {
      connected: boolean;
      accountId?: string;
      username?: string;
      followers?: number;
      error?: string;
    };
    tokenInfo?: {
      isValid: boolean;
      type?: string;
      expiresAt?: Date | null;
      scopes?: string[];
    };
  } = {
    facebook: { connected: false },
    instagram: { connected: false },
  };

  // Check token validity
  try {
    const tokenDebug = await debugToken();
    result.tokenInfo = {
      isValid: tokenDebug.isValid,
      type: tokenDebug.type,
      expiresAt: tokenDebug.expiresAt,
      scopes: tokenDebug.scopes,
    };
  } catch {
    // Token debug failed, continue without it
  }

  // Check Facebook
  try {
    const pageInfo = await getFacebookPageInfo();
    result.facebook = {
      connected: true,
      pageId: pageInfo.id,
      pageName: pageInfo.name,
      followers: pageInfo.followers,
    };
  } catch (error) {
    result.facebook = {
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Check Instagram
  try {
    const igInfo = await getInstagramAccountInfo();
    result.instagram = {
      connected: true,
      accountId: igInfo.id,
      username: igInfo.username,
      followers: igInfo.followers,
    };
  } catch (error) {
    result.instagram = {
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  return result;
}
