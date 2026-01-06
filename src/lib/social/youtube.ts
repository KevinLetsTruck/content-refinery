/**
 * YouTube API Client for Content Refinery
 * 
 * Handles uploading videos to YouTube using the Data API v3
 * 
 * Required environment variables:
 * - YOUTUBE_CLIENT_ID
 * - YOUTUBE_CLIENT_SECRET
 * - YOUTUBE_REFRESH_TOKEN
 * - YOUTUBE_CHANNEL_ID (optional, for reference)
 */

interface YouTubeConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  channelId?: string;
}

interface VideoUploadOptions {
  title: string;
  description: string;
  tags?: string[];
  categoryId?: string; // Default: 22 (People & Blogs)
  privacyStatus?: "public" | "unlisted" | "private";
  videoFilePath?: string;
  videoBuffer?: Buffer;
  thumbnailPath?: string;
  thumbnailBuffer?: Buffer;
  playlistId?: string;
  isShort?: boolean; // For YouTube Shorts
}

interface VideoUploadResult {
  id: string;
  url: string;
  title: string;
  platform: "youtube";
}

interface ChannelInfo {
  id: string;
  title: string;
  subscriberCount: number;
  videoCount: number;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function getConfig(): YouTubeConfig {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing YouTube credentials. Required: YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN"
    );
  }

  return { clientId, clientSecret, refreshToken, channelId };
}

/**
 * Get a valid access token, refreshing if necessary
 */
async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 60000) {
    return cachedAccessToken.token;
  }

  const config = getConfig();

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("[YouTube] Token refresh failed:", error);
    throw new Error(`Failed to refresh YouTube token: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };

  return cachedAccessToken.token;
}

/**
 * Upload a video to YouTube
 */
export async function uploadVideo(options: VideoUploadOptions): Promise<VideoUploadResult> {
  const accessToken = await getAccessToken();

  // Video metadata
  const metadata = {
    snippet: {
      title: options.title,
      description: options.description,
      tags: options.tags || [],
      categoryId: options.categoryId || "22", // People & Blogs
    },
    status: {
      privacyStatus: options.privacyStatus || "private",
      selfDeclaredMadeForKids: false,
    },
  };

  // For Shorts, add #Shorts to title if not present
  if (options.isShort && !metadata.snippet.title.includes("#Shorts")) {
    metadata.snippet.title = `${metadata.snippet.title} #Shorts`;
  }

  // Step 1: Initialize resumable upload
  const initResponse = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": "video/*",
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!initResponse.ok) {
    const error = await initResponse.json();
    console.error("[YouTube] Upload init failed:", error);
    throw new Error(`YouTube upload init failed: ${JSON.stringify(error)}`);
  }

  const uploadUrl = initResponse.headers.get("location");
  if (!uploadUrl) {
    throw new Error("No upload URL returned from YouTube");
  }

  // Step 2: Upload the video file
  let videoData: Buffer;
  
  if (options.videoBuffer) {
    videoData = options.videoBuffer;
  } else if (options.videoFilePath) {
    const fs = await import("fs/promises");
    videoData = await fs.readFile(options.videoFilePath);
  } else {
    throw new Error("Either videoBuffer or videoFilePath is required");
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "video/*",
      "Content-Length": videoData.length.toString(),
    },
    body: new Uint8Array(videoData),
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    console.error("[YouTube] Video upload failed:", error);
    throw new Error(`YouTube video upload failed: ${error}`);
  }

  const videoResult = await uploadResponse.json();
  const videoId = videoResult.id;

  // Step 3: Upload thumbnail if provided
  if (options.thumbnailBuffer || options.thumbnailPath) {
    try {
      await uploadThumbnail(videoId, options.thumbnailBuffer, options.thumbnailPath);
    } catch (e) {
      console.error("[YouTube] Thumbnail upload failed:", e);
      // Don't fail the whole upload for thumbnail issues
    }
  }

  // Step 4: Add to playlist if specified
  if (options.playlistId) {
    try {
      await addToPlaylist(videoId, options.playlistId);
    } catch (e) {
      console.error("[YouTube] Playlist add failed:", e);
    }
  }

  return {
    id: videoId,
    url: options.isShort 
      ? `https://youtube.com/shorts/${videoId}`
      : `https://youtube.com/watch?v=${videoId}`,
    title: options.title,
    platform: "youtube",
  };
}

/**
 * Upload a thumbnail for a video
 */
async function uploadThumbnail(
  videoId: string,
  thumbnailBuffer?: Buffer,
  thumbnailPath?: string
): Promise<void> {
  const accessToken = await getAccessToken();

  let imageData: Buffer;
  
  if (thumbnailBuffer) {
    imageData = thumbnailBuffer;
  } else if (thumbnailPath) {
    const fs = await import("fs/promises");
    imageData = await fs.readFile(thumbnailPath);
  } else {
    throw new Error("Either thumbnailBuffer or thumbnailPath is required");
  }

  const response = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "image/jpeg",
      },
      body: new Uint8Array(imageData),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Thumbnail upload failed: ${JSON.stringify(error)}`);
  }
}

/**
 * Add a video to a playlist
 */
async function addToPlaylist(videoId: string, playlistId: string): Promise<void> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        snippet: {
          playlistId,
          resourceId: {
            kind: "youtube#video",
            videoId,
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to add to playlist: ${JSON.stringify(error)}`);
  }
}

/**
 * Get channel info
 */
export async function getChannelInfo(): Promise<ChannelInfo> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to get channel info: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  
  if (!data.items || data.items.length === 0) {
    throw new Error("No channel found");
  }

  const channel = data.items[0];
  
  return {
    id: channel.id,
    title: channel.snippet.title,
    subscriberCount: parseInt(channel.statistics.subscriberCount) || 0,
    videoCount: parseInt(channel.statistics.videoCount) || 0,
  };
}

/**
 * Update video metadata
 */
export async function updateVideo(
  videoId: string,
  updates: {
    title?: string;
    description?: string;
    tags?: string[];
    privacyStatus?: "public" | "unlisted" | "private";
  }
): Promise<void> {
  const accessToken = await getAccessToken();

  // First get current video data
  const getResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${videoId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!getResponse.ok) {
    throw new Error("Failed to get video data");
  }

  const getData = await getResponse.json();
  if (!getData.items || getData.items.length === 0) {
    throw new Error("Video not found");
  }

  const video = getData.items[0];

  // Merge updates
  const updateBody: Record<string, unknown> = {
    id: videoId,
    snippet: {
      ...video.snippet,
      ...(updates.title && { title: updates.title }),
      ...(updates.description && { description: updates.description }),
      ...(updates.tags && { tags: updates.tags }),
      categoryId: video.snippet.categoryId,
    },
    status: {
      ...video.status,
      ...(updates.privacyStatus && { privacyStatus: updates.privacyStatus }),
    },
  };

  const updateResponse = await fetch(
    "https://www.googleapis.com/youtube/v3/videos?part=snippet,status",
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateBody),
    }
  );

  if (!updateResponse.ok) {
    const error = await updateResponse.json();
    throw new Error(`Failed to update video: ${JSON.stringify(error)}`);
  }
}

/**
 * Delete a video
 */
export async function deleteVideo(videoId: string): Promise<boolean> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?id=${videoId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return response.ok;
}

/**
 * Create a playlist
 */
export async function createPlaylist(
  title: string,
  description: string,
  privacyStatus: "public" | "unlisted" | "private" = "public"
): Promise<{ id: string; url: string }> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    "https://www.googleapis.com/youtube/v3/playlists?part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        snippet: {
          title,
          description,
        },
        status: {
          privacyStatus,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create playlist: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  
  return {
    id: data.id,
    url: `https://youtube.com/playlist?list=${data.id}`,
  };
}

/**
 * Check if YouTube credentials are configured
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
 * Validate the refresh token is still valid
 */
export async function validateCredentials(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}
