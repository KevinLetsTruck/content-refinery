/**
 * LinkedIn API Client for Content Refinery
 * 
 * Handles publishing posts to LinkedIn using the v2 API
 * 
 * Required environment variables:
 * - LINKEDIN_ACCESS_TOKEN (OAuth access token with w_member_social scope)
 * - LINKEDIN_USER_ID (optional - will be auto-fetched if not provided)
 */

const LINKEDIN_API_BASE = "https://api.linkedin.com/v2";

interface LinkedInConfig {
  accessToken: string;
  userId?: string;
}

interface PostResult {
  id: string;
  url: string;
  platform: "linkedin";
}

interface LinkedInPostOptions {
  text: string;
  articleUrl?: string;
  articleTitle?: string;
  articleDescription?: string;
  imageUrl?: string;
}

function getConfig(): LinkedInConfig {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const userId = process.env.LINKEDIN_USER_ID;

  if (!accessToken) {
    throw new Error("LINKEDIN_ACCESS_TOKEN environment variable is not set");
  }

  return {
    accessToken,
    userId,
  };
}

/**
 * Get the authenticated user's LinkedIn URN
 * Caches the result for subsequent calls
 *
 * Note: Uses /userinfo endpoint (OpenID Connect) instead of /me
 * because /me requires r_liteprofile scope which we don't have.
 * With just w_member_social scope, we need the LINKEDIN_USER_ID env var.
 */
let cachedUserUrn: string | null = null;

export async function getUserUrn(): Promise<string> {
  if (cachedUserUrn) {
    return cachedUserUrn;
  }

  const config = getConfig();

  // Check if manually configured (required for w_member_social-only tokens)
  if (config.userId) {
    cachedUserUrn = `urn:li:person:${config.userId}`;
    console.log(`[LinkedIn] Using configured user URN: ${cachedUserUrn}`);
    return cachedUserUrn;
  }

  // Try userinfo endpoint (OpenID Connect - requires openid scope)
  // This likely won't work without openid scope, but try anyway
  try {
    const response = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      // userinfo returns 'sub' field with the user ID
      if (data.sub) {
        cachedUserUrn = `urn:li:person:${data.sub}`;
        console.log(`[LinkedIn] Fetched user URN from userinfo: ${cachedUserUrn}`);
        return cachedUserUrn;
      }
    }
  } catch (e) {
    console.log("[LinkedIn] userinfo endpoint failed, trying /me");
  }

  // Fallback: Try /me endpoint (requires r_liteprofile scope)
  const response = await fetch(`${LINKEDIN_API_BASE}/me`, {
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("[LinkedIn] Failed to get user info:", error);
    throw new Error(
      `LinkedIn API error: ${error.message || JSON.stringify(error)}. ` +
      `Please set LINKEDIN_USER_ID environment variable with your LinkedIn member ID.`
    );
  }

  const data = await response.json();
  cachedUserUrn = `urn:li:person:${data.id}`;

  console.log(`[LinkedIn] Fetched user URN: ${cachedUserUrn}`);
  return cachedUserUrn;
}

/**
 * Post a text update to LinkedIn
 */
export async function postToLinkedIn(options: LinkedInPostOptions): Promise<PostResult> {
  const config = getConfig();
  const authorUrn = await getUserUrn();

  // Build the share content
  const shareContent: Record<string, unknown> = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text: options.text,
        },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  // Add article if provided
  if (options.articleUrl) {
    const media: Record<string, unknown> = {
      status: "READY",
      originalUrl: options.articleUrl,
    };
    
    if (options.articleTitle) {
      media.title = { text: options.articleTitle };
    }
    if (options.articleDescription) {
      media.description = { text: options.articleDescription };
    }

    shareContent.specificContent = {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text: options.text,
        },
        shareMediaCategory: "ARTICLE",
        media: [media],
      },
    };
  }

  const response = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(shareContent),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("[LinkedIn] Post error:", error);
    throw new Error(`LinkedIn API error: ${error.message || JSON.stringify(error)}`);
  }

  // Get the post ID from the response header
  const postId = response.headers.get("x-restli-id") || "";
  
  // Extract the activity ID for the URL
  // Format: urn:li:share:XXXXX or urn:li:ugcPost:XXXXX
  const activityId = postId.split(":").pop() || postId;

  return {
    id: postId,
    url: `https://www.linkedin.com/feed/update/${postId}`,
    platform: "linkedin",
  };
}

/**
 * Post with an image to LinkedIn
 * Note: This requires uploading the image first
 */
export async function postWithImage(options: {
  text: string;
  imageUrl: string;
}): Promise<PostResult> {
  const config = getConfig();
  const authorUrn = await getUserUrn();

  // Step 1: Register the image upload
  const registerResponse = await fetch(`${LINKEDIN_API_BASE}/assets?action=registerUpload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: authorUrn,
        serviceRelationships: [
          {
            relationshipType: "OWNER",
            identifier: "urn:li:userGeneratedContent",
          },
        ],
      },
    }),
  });

  if (!registerResponse.ok) {
    const error = await registerResponse.json();
    throw new Error(`Failed to register image upload: ${JSON.stringify(error)}`);
  }

  const registerData = await registerResponse.json();
  const uploadUrl = registerData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
  const asset = registerData.value.asset;

  // Step 2: Download the image from URL
  const imageResponse = await fetch(options.imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.statusText}`);
  }
  const imageBuffer = await imageResponse.arrayBuffer();

  // Step 3: Upload the image to LinkedIn
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/octet-stream",
    },
    body: imageBuffer,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload image: ${uploadResponse.statusText}`);
  }

  // Step 4: Create the post with the image
  const shareContent = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text: options.text,
        },
        shareMediaCategory: "IMAGE",
        media: [
          {
            status: "READY",
            media: asset,
          },
        ],
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const postResponse = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(shareContent),
  });

  if (!postResponse.ok) {
    const error = await postResponse.json();
    throw new Error(`Failed to create post: ${JSON.stringify(error)}`);
  }

  const postId = postResponse.headers.get("x-restli-id") || "";

  return {
    id: postId,
    url: `https://www.linkedin.com/feed/update/${postId}`,
    platform: "linkedin",
  };
}

/**
 * Delete a LinkedIn post
 */
export async function deletePost(postUrn: string): Promise<boolean> {
  const config = getConfig();

  const response = await fetch(`${LINKEDIN_API_BASE}/ugcPosts/${encodeURIComponent(postUrn)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });

  return response.ok;
}

/**
 * Check if LinkedIn credentials are configured
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
 * Get LinkedIn profile info
 */
export async function getProfileInfo(): Promise<{
  id: string;
  firstName: string;
  lastName: string;
}> {
  const config = getConfig();

  const response = await fetch(`${LINKEDIN_API_BASE}/me`, {
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`LinkedIn API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();

  return {
    id: data.id,
    firstName: data.localizedFirstName,
    lastName: data.localizedLastName,
  };
}

/**
 * Validate the access token is still valid
 */
export async function validateToken(): Promise<boolean> {
  try {
    await getProfileInfo();
    return true;
  } catch {
    return false;
  }
}
