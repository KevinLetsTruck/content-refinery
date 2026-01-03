/**
 * Twitter API v2 Client for Content Refinery
 * 
 * Uses OAuth 1.0a for user-context authentication (posting on behalf of user)
 * 
 * Required environment variables:
 * - TWITTER_API_KEY (Consumer Key)
 * - TWITTER_API_SECRET (Consumer Secret)
 * - TWITTER_ACCESS_TOKEN (User Access Token)
 * - TWITTER_ACCESS_SECRET (User Access Token Secret)
 */

import crypto from "crypto";

interface TwitterConfig {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
}

interface TweetResult {
  id: string;
  text: string;
  url: string;
}

interface TweetOptions {
  text: string;
  replyToId?: string;
  mediaIds?: string[];
}

function getConfig(): TwitterConfig {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    throw new Error(
      "Missing Twitter credentials. Required: TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET"
    );
  }

  return { apiKey, apiSecret, accessToken, accessSecret };
}

/**
 * Generate OAuth 1.0a signature for Twitter API
 */
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  config: TwitterConfig
): string {
  // Create parameter string
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join("&");

  // Create signature base string
  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join("&");

  // Create signing key
  const signingKey = `${encodeURIComponent(config.apiSecret)}&${encodeURIComponent(config.accessSecret)}`;

  // Generate HMAC-SHA1 signature
  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(signatureBase)
    .digest("base64");

  return signature;
}

/**
 * Generate OAuth 1.0a Authorization header
 */
function generateAuthHeader(
  method: string,
  url: string,
  config: TwitterConfig,
  additionalParams: Record<string, string> = {}
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: config.apiKey,
    oauth_token: config.accessToken,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_version: "1.0",
  };

  // Combine OAuth params with additional params for signature
  const allParams = { ...oauthParams, ...additionalParams };

  // Generate signature
  oauthParams.oauth_signature = generateOAuthSignature(
    method,
    url,
    allParams,
    config
  );

  // Build Authorization header
  const headerParams = Object.keys(oauthParams)
    .sort()
    .map((key) => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(", ");

  return `OAuth ${headerParams}`;
}

/**
 * Post a tweet
 */
export async function postTweet(options: TweetOptions): Promise<TweetResult> {
  const config = getConfig();
  const url = "https://api.twitter.com/2/tweets";

  const body: Record<string, unknown> = {
    text: options.text,
  };

  if (options.replyToId) {
    body.reply = { in_reply_to_tweet_id: options.replyToId };
  }

  if (options.mediaIds && options.mediaIds.length > 0) {
    body.media = { media_ids: options.mediaIds };
  }

  const authHeader = generateAuthHeader("POST", url, config);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("[Twitter] API error:", error);
    throw new Error(`Twitter API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  const tweetId = data.data.id;

  return {
    id: tweetId,
    text: options.text,
    url: `https://twitter.com/i/web/status/${tweetId}`,
  };
}

/**
 * Post a thread (multiple tweets)
 */
export async function postThread(tweets: string[]): Promise<TweetResult[]> {
  const results: TweetResult[] = [];
  let lastTweetId: string | undefined;

  for (const text of tweets) {
    const result = await postTweet({
      text,
      replyToId: lastTweetId,
    });
    results.push(result);
    lastTweetId = result.id;

    // Small delay between tweets to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
}

/**
 * Delete a tweet
 */
export async function deleteTweet(tweetId: string): Promise<boolean> {
  const config = getConfig();
  const url = `https://api.twitter.com/2/tweets/${tweetId}`;

  const authHeader = generateAuthHeader("DELETE", url, config);

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("[Twitter] Delete error:", error);
    return false;
  }

  return true;
}

/**
 * Get authenticated user info
 */
export async function getMe(): Promise<{ id: string; name: string; username: string }> {
  const config = getConfig();
  const url = "https://api.twitter.com/2/users/me";

  const authHeader = generateAuthHeader("GET", url, config);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Twitter API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Check if Twitter credentials are configured
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
 * Upload media (image) to Twitter
 * Note: This uses v1.1 API for media upload
 */
export async function uploadMedia(
  imageUrl: string
): Promise<string> {
  const config = getConfig();
  
  // First, download the image
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.statusText}`);
  }
  
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = Buffer.from(imageBuffer).toString("base64");
  
  // Upload to Twitter
  const uploadUrl = "https://upload.twitter.com/1.1/media/upload.json";
  
  const params = {
    media_data: base64Image,
  };
  
  const authHeader = generateAuthHeader("POST", uploadUrl, config, params);
  
  const formData = new URLSearchParams();
  formData.append("media_data", base64Image);
  
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error("[Twitter] Media upload error:", error);
    throw new Error(`Twitter media upload error: ${JSON.stringify(error)}`);
  }
  
  const data = await response.json();
  return data.media_id_string;
}
