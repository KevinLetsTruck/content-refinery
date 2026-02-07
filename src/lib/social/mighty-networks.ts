/**
 * Mighty Networks API Client for Content Refinery
 *
 * Handles publishing posts to Let's Truck Tribe (letstrucktribe.com)
 * using the Mighty Networks Admin API.
 *
 * Required environment variables:
 * - MIGHTY_NETWORKS_API_TOKEN (Bearer token from MN Admin > Integrations)
 * - MIGHTY_NETWORKS_SPACE_ID (ID of the target space, e.g., "News")
 *
 * Optional:
 * - MIGHTY_NETWORKS_NETWORK_URL (defaults to "https://letstrucktribe.com")
 */

import Anthropic from "@anthropic-ai/sdk";

const MN_API_BASE = "https://api.mn.co";

interface MightyNetworksConfig {
  apiToken: string;
  spaceId: string;
  networkUrl: string;
}

interface PostResult {
  id: string;
  url: string;
  platform: "mighty_networks";
}

interface MightyNetworksPostOptions {
  text: string;
  imageUrl?: string | null;
}

interface MightyNetworksSpace {
  id: number;
  name: string;
  slug: string;
  description?: string;
  space_type?: string;
  member_count?: number;
}

function getConfig(): MightyNetworksConfig {
  const apiToken = process.env.MIGHTY_NETWORKS_API_TOKEN;
  const spaceId = process.env.MIGHTY_NETWORKS_SPACE_ID;
  const networkUrl =
    process.env.MIGHTY_NETWORKS_NETWORK_URL || "https://letstrucktribe.com";

  if (!apiToken) {
    throw new Error(
      "MIGHTY_NETWORKS_API_TOKEN environment variable is not set"
    );
  }

  if (!spaceId) {
    throw new Error(
      "MIGHTY_NETWORKS_SPACE_ID environment variable is not set"
    );
  }

  return {
    apiToken,
    spaceId,
    networkUrl,
  };
}

/**
 * Check if Mighty Networks credentials are configured
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
 * Validate the API token by making a test request
 */
export async function validateToken(): Promise<boolean> {
  try {
    const spaces = await getSpaces();
    return spaces.length > 0;
  } catch {
    return false;
  }
}

/**
 * List all spaces in the network
 * Useful for discovering space IDs during setup
 */
export async function getSpaces(): Promise<MightyNetworksSpace[]> {
  const config = getConfig();

  const response = await fetch(`${MN_API_BASE}/admin/v1/spaces`, {
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[MightyNetworks] Failed to fetch spaces:", errorText);
    throw new Error(
      `Mighty Networks API error (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();

  // API may return { spaces: [...] } or just an array
  return Array.isArray(data) ? data : data.spaces || data.data || [];
}

/**
 * Publish a post to the configured Mighty Networks space
 *
 * Uses POST /admin/v1/posts to create a new post.
 * The post will appear in the specified space (e.g., "News").
 */
export async function publishToMightyNetworks(
  options: MightyNetworksPostOptions
): Promise<PostResult> {
  const config = getConfig();

  // Build the post payload
  // Note: Exact field names may vary — the API accepts body/content for post text
  // and space_id to target a specific space
  const postPayload: Record<string, unknown> = {
    space_id: parseInt(config.spaceId, 10) || config.spaceId,
    body: options.text,
    post_type: "post",
  };

  console.log(
    "[MightyNetworks] Creating post in space:",
    config.spaceId,
    "text length:",
    options.text.length
  );

  const response = await fetch(`${MN_API_BASE}/admin/v1/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(postPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[MightyNetworks] Post error:", response.status, errorText);

    // Try to parse error for better message
    let errorMessage = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage =
        errorJson.message || errorJson.error || JSON.stringify(errorJson);
    } catch {
      // Use raw text
    }

    throw new Error(
      `Mighty Networks API error (${response.status}): ${errorMessage}`
    );
  }

  const data = await response.json();

  // Extract post ID from response
  // API may return { id, ... } or nested structure
  const postId = data.id || data.post_id || data.data?.id;

  if (!postId) {
    console.warn(
      "[MightyNetworks] No post ID in response:",
      JSON.stringify(data).substring(0, 500)
    );
  }

  // Build the public URL for the post
  const postUrl = postId
    ? `${config.networkUrl}/posts/${postId}`
    : config.networkUrl;

  console.log("[MightyNetworks] Post created:", postId, "URL:", postUrl);

  return {
    id: String(postId || "unknown"),
    url: postUrl,
    platform: "mighty_networks",
  };
}

/**
 * Adapt social media content into a community-tailored Tribe post.
 *
 * Takes content written for social platforms (short, hashtaggy) and
 * rewrites it as a conversational community post for The Tribe.
 * Uses Claude to transform the tone while preserving the message.
 */
export async function adaptForTribe(socialText: string): Promise<string> {
  try {
    const anthropic = new Anthropic();

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `Rewrite this social media post as a community post for The Tribe (Let's Truck community on Mighty Networks).

SOCIAL POST:
${socialText}

RULES:
- Write as Kevin Rutherford talking directly to The Tribe
- Conversational and community-focused — like talking to your people
- Longer than social (200-600 words is fine), add more depth and context
- NO hashtags — community posts don't use them
- Can open with "Tribe," or "Hey Tribe," or just dive in
- End with engagement: ask a question, invite comments, start discussion
- Examples: "What's your experience with this?", "Drop your thoughts below", "Who else deals with this?"
- Keep Kevin's direct, no-BS voice — NEVER say "trucker" (use "driver", "professional driver")
- Use phrases like "proper human diet", "owner-operator of your health", "The Tribe"
- If there's a product link, keep it but weave it naturally into the conversation
- Strip any emojis that feel too "social media" — a few are OK if natural

Return ONLY the rewritten community post text. No JSON, no labels, no markdown formatting.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === "text" && content.text.trim()) {
      console.log(
        "[MightyNetworks] Adapted content for Tribe, length:",
        content.text.trim().length
      );
      return content.text.trim();
    }
  } catch (error) {
    console.error("[MightyNetworks] Failed to adapt content for Tribe:", error);
    // Fall through to return original text
  }

  // Fallback: strip hashtags from original text
  return socialText.replace(/#\w+/g, "").trim();
}

/**
 * Delete a post from Mighty Networks
 */
export async function deletePost(postId: string): Promise<boolean> {
  const config = getConfig();

  const response = await fetch(`${MN_API_BASE}/admin/v1/posts/${postId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      Accept: "application/json",
    },
  });

  return response.ok;
}
