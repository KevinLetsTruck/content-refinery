/**
 * TikTok API Client for Content Refinery
 *
 * Handles uploading videos to TikTok using the Content Posting API
 *
 * Required environment variables:
 * - TIKTOK_CLIENT_KEY (App client key from TikTok Developer Portal)
 * - TIKTOK_CLIENT_SECRET (App client secret)
 * - TIKTOK_ACCESS_TOKEN (OAuth access token with video.publish scope)
 * - TIKTOK_REFRESH_TOKEN (optional, for token refresh)
 *
 * TikTok Video Requirements:
 * - Duration: 3 seconds to 10 minutes (60 seconds max for stories)
 * - File size: Up to 4GB
 * - Formats: MP4, WebM, MOV
 * - Aspect ratios: 9:16 (vertical), 16:9 (horizontal), 1:1 (square)
 */

const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

interface TikTokConfig {
  clientKey: string;
  clientSecret: string;
  accessToken: string;
  refreshToken?: string;
}

interface VideoUploadOptions {
  title: string;
  caption: string;
  videoBuffer: Buffer;
  videoFilePath?: string;
  privacyLevel?: TikTokPrivacyLevel;
  disableDuet?: boolean;
  disableStitch?: boolean;
  disableComment?: boolean;
  videoCoverTimestamp?: number; // In seconds
  brandContentToggle?: boolean;
  brandOrganicToggle?: boolean;
}

type TikTokPrivacyLevel =
  | "PUBLIC_TO_EVERYONE"
  | "MUTUAL_FOLLOW_FRIENDS"
  | "FOLLOWER_OF_CREATOR"
  | "SELF_ONLY";

interface VideoUploadResult {
  id: string;
  url: string;
  platform: "tiktok";
}

interface UserInfo {
  openId: string;
  unionId?: string;
  displayName: string;
  avatarUrl: string;
}

interface CreatorInfo {
  creatorId: string;
  creatorUsername: string;
  privacyLevelOptions: TikTokPrivacyLevel[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoPostDuration: number;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function getConfig(): TikTokConfig {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  const refreshToken = process.env.TIKTOK_REFRESH_TOKEN;

  if (!clientKey || !clientSecret || !accessToken) {
    throw new Error(
      "Missing TikTok credentials. Required: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_ACCESS_TOKEN"
    );
  }

  return { clientKey, clientSecret, accessToken, refreshToken };
}

/**
 * Get a valid access token, refreshing if necessary
 */
async function getAccessToken(): Promise<string> {
  const config = getConfig();

  // Check if we have a valid cached token
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 60000) {
    return cachedAccessToken.token;
  }

  // If we have a refresh token, try to refresh
  if (config.refreshToken) {
    try {
      const response = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_key: config.clientKey,
          client_secret: config.clientSecret,
          grant_type: "refresh_token",
          refresh_token: config.refreshToken,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.access_token) {
          cachedAccessToken = {
            token: data.data.access_token,
            expiresAt: Date.now() + (data.data.expires_in || 86400) * 1000,
          };
          return cachedAccessToken.token;
        }
      }
    } catch (e) {
      console.error("[TikTok] Token refresh failed:", e);
    }
  }

  // Fall back to configured token
  return config.accessToken;
}

/**
 * Get creator info including available privacy options
 */
export async function getCreatorInfo(): Promise<CreatorInfo> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${TIKTOK_API_BASE}/post/publish/creator_info/query/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error("[TikTok] Failed to get creator info:", error);
    throw new Error(`TikTok API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();

  if (data.error?.code !== "ok") {
    throw new Error(`TikTok API error: ${data.error?.message || "Unknown error"}`);
  }

  return {
    creatorId: data.data.creator_id,
    creatorUsername: data.data.creator_username,
    privacyLevelOptions: data.data.privacy_level_options || ["SELF_ONLY"],
    commentDisabled: data.data.comment_disabled || false,
    duetDisabled: data.data.duet_disabled || false,
    stitchDisabled: data.data.stitch_disabled || false,
    maxVideoPostDuration: data.data.max_video_post_duration_sec || 600,
  };
}

/**
 * Upload a video to TikTok
 *
 * Uses the direct post method for videos under 64MB
 * For larger videos, uses chunked upload
 */
export async function uploadVideo(
  options: VideoUploadOptions
): Promise<VideoUploadResult> {
  const accessToken = await getAccessToken();

  // Get video data
  let videoData: Buffer;

  if (options.videoBuffer) {
    videoData = options.videoBuffer;
  } else if (options.videoFilePath) {
    const fs = await import("fs/promises");
    videoData = await fs.readFile(options.videoFilePath);
  } else {
    throw new Error("Either videoBuffer or videoFilePath is required");
  }

  const videoSize = videoData.length;
  const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
  const MAX_DIRECT_SIZE = 64 * 1024 * 1024; // 64MB for direct upload

  // Build post info
  const postInfo: Record<string, unknown> = {
    title: options.caption.substring(0, 2200), // TikTok caption limit
    privacy_level: options.privacyLevel || "SELF_ONLY",
    disable_duet: options.disableDuet ?? false,
    disable_stitch: options.disableStitch ?? false,
    disable_comment: options.disableComment ?? false,
    brand_content_toggle: options.brandContentToggle ?? false,
    brand_organic_toggle: options.brandOrganicToggle ?? false,
  };

  if (options.videoCoverTimestamp !== undefined) {
    postInfo.video_cover_timestamp_ms = options.videoCoverTimestamp * 1000;
  }

  let publishId: string;

  if (videoSize <= MAX_DIRECT_SIZE) {
    // Direct upload for smaller videos
    publishId = await directUpload(accessToken, videoData, postInfo);
  } else {
    // Chunked upload for larger videos
    publishId = await chunkedUpload(accessToken, videoData, postInfo, CHUNK_SIZE);
  }

  // Poll for publish status
  const result = await pollPublishStatus(accessToken, publishId);

  return {
    id: result.videoId,
    url: `https://www.tiktok.com/@/video/${result.videoId}`,
    platform: "tiktok",
  };
}

/**
 * Direct upload for videos under 64MB
 */
async function directUpload(
  accessToken: string,
  videoData: Buffer,
  postInfo: Record<string, unknown>
): Promise<string> {
  // Step 1: Initialize upload
  const initResponse = await fetch(
    `${TIKTOK_API_BASE}/post/publish/video/init/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: postInfo,
        source_info: {
          source: "FILE_UPLOAD",
          video_size: videoData.length,
          chunk_size: videoData.length,
          total_chunk_count: 1,
        },
      }),
    }
  );

  if (!initResponse.ok) {
    const error = await initResponse.json();
    console.error("[TikTok] Upload init failed:", error);
    throw new Error(`TikTok upload init failed: ${JSON.stringify(error)}`);
  }

  const initData = await initResponse.json();

  if (initData.error?.code !== "ok") {
    throw new Error(`TikTok init error: ${initData.error?.message}`);
  }

  const uploadUrl = initData.data.upload_url;
  const publishId = initData.data.publish_id;

  // Step 2: Upload the video
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": videoData.length.toString(),
      "Content-Range": `bytes 0-${videoData.length - 1}/${videoData.length}`,
    },
    body: new Uint8Array(videoData),
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    console.error("[TikTok] Video upload failed:", error);
    throw new Error(`TikTok video upload failed: ${error}`);
  }

  return publishId;
}

/**
 * Chunked upload for videos over 64MB
 */
async function chunkedUpload(
  accessToken: string,
  videoData: Buffer,
  postInfo: Record<string, unknown>,
  chunkSize: number
): Promise<string> {
  const totalChunks = Math.ceil(videoData.length / chunkSize);

  // Step 1: Initialize upload
  const initResponse = await fetch(
    `${TIKTOK_API_BASE}/post/publish/video/init/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: postInfo,
        source_info: {
          source: "FILE_UPLOAD",
          video_size: videoData.length,
          chunk_size: chunkSize,
          total_chunk_count: totalChunks,
        },
      }),
    }
  );

  if (!initResponse.ok) {
    const error = await initResponse.json();
    throw new Error(`TikTok upload init failed: ${JSON.stringify(error)}`);
  }

  const initData = await initResponse.json();

  if (initData.error?.code !== "ok") {
    throw new Error(`TikTok init error: ${initData.error?.message}`);
  }

  const uploadUrl = initData.data.upload_url;
  const publishId = initData.data.publish_id;

  // Step 2: Upload chunks
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, videoData.length);
    const chunk = videoData.slice(start, end);

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": chunk.length.toString(),
        "Content-Range": `bytes ${start}-${end - 1}/${videoData.length}`,
      },
      body: new Uint8Array(chunk),
    });

    if (!uploadResponse.ok) {
      throw new Error(`Chunk ${i + 1}/${totalChunks} upload failed`);
    }

    console.log(`[TikTok] Uploaded chunk ${i + 1}/${totalChunks}`);
  }

  return publishId;
}

/**
 * Poll for publish status until complete or failed
 */
async function pollPublishStatus(
  accessToken: string,
  publishId: string,
  maxAttempts: number = 30,
  intervalMs: number = 5000
): Promise<{ videoId: string; status: string }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(
      `${TIKTOK_API_BASE}/post/publish/status/fetch/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ publish_id: publishId }),
      }
    );

    if (!response.ok) {
      console.error("[TikTok] Status check failed");
      throw new Error("Failed to check publish status");
    }

    const data = await response.json();

    if (data.error?.code !== "ok") {
      throw new Error(`TikTok status error: ${data.error?.message}`);
    }

    const status = data.data.status;

    switch (status) {
      case "PUBLISH_COMPLETE":
        console.log("[TikTok] Video published successfully");
        return {
          videoId: data.data.publicaly_available_post_id?.[0] || publishId,
          status: "published",
        };

      case "FAILED":
        const reason = data.data.fail_reason || "Unknown reason";
        console.error("[TikTok] Publish failed:", reason);
        throw new Error(`TikTok publish failed: ${reason}`);

      case "PROCESSING_UPLOAD":
      case "PROCESSING_DOWNLOAD":
      case "SENDING_TO_USER_INBOX":
        console.log(`[TikTok] Status: ${status}, attempt ${attempt + 1}/${maxAttempts}`);
        break;

      default:
        console.log(`[TikTok] Unknown status: ${status}`);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Publish status check timed out");
}

/**
 * Upload a video from URL (TikTok pulls the video)
 *
 * Alternative method where TikTok fetches the video from a public URL
 */
export async function uploadVideoFromUrl(options: {
  title: string;
  caption: string;
  videoUrl: string;
  privacyLevel?: TikTokPrivacyLevel;
}): Promise<VideoUploadResult> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${TIKTOK_API_BASE}/post/publish/video/init/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: {
          title: options.caption.substring(0, 2200),
          privacy_level: options.privacyLevel || "SELF_ONLY",
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: options.videoUrl,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`TikTok URL upload failed: ${JSON.stringify(error)}`);
  }

  const data = await response.json();

  if (data.error?.code !== "ok") {
    throw new Error(`TikTok error: ${data.error?.message}`);
  }

  const publishId = data.data.publish_id;
  const result = await pollPublishStatus(accessToken, publishId);

  return {
    id: result.videoId,
    url: `https://www.tiktok.com/@/video/${result.videoId}`,
    platform: "tiktok",
  };
}

/**
 * Get user info
 */
export async function getUserInfo(): Promise<UserInfo> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${TIKTOK_API_BASE}/user/info/?fields=open_id,union_id,display_name,avatar_url`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to get user info: ${JSON.stringify(error)}`);
  }

  const data = await response.json();

  if (data.error?.code !== "ok") {
    throw new Error(`TikTok error: ${data.error?.message}`);
  }

  return {
    openId: data.data.user.open_id,
    unionId: data.data.user.union_id,
    displayName: data.data.user.display_name,
    avatarUrl: data.data.user.avatar_url,
  };
}

/**
 * Check if TikTok credentials are configured
 */
export function isConfigured(): boolean {
  try {
    getConfig();
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate the access token is still valid
 */
export async function validateToken(): Promise<boolean> {
  try {
    await getUserInfo();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get quota information (for rate limiting)
 */
export async function getQuotaInfo(): Promise<{
  dailyQuota: number;
  dailyUsed: number;
  remaining: number;
}> {
  // TikTok has rate limits:
  // - Unaudited apps: 10 videos per 3 hours
  // - Audited apps: Higher limits based on agreement
  // This is a placeholder - TikTok doesn't expose quota via API
  return {
    dailyQuota: 10,
    dailyUsed: 0,
    remaining: 10,
  };
}
