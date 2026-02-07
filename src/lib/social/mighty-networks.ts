/**
 * Mighty Networks API Client for Content Refinery
 *
 * Handles publishing posts to Let's Truck Tribe (letstrucktribe.com)
 * using the Mighty Networks Admin API.
 *
 * API docs: https://docs.mightynetworks.com/api-reference
 * All endpoints require network_id in the path:
 *   /admin/v1/networks/{network_id}/spaces
 *   /admin/v1/networks/{network_id}/posts
 *
 * Required environment variables:
 * - MIGHTY_NETWORKS_API_TOKEN (Bearer token from MN Admin > Integrations)
 * - MIGHTY_NETWORKS_SPACE_ID (ID of the target space, e.g., "News")
 *
 * Optional:
 * - MIGHTY_NETWORKS_NETWORK_ID (numeric ID or subdomain — defaults to "letstrucktribe")
 * - MIGHTY_NETWORKS_NETWORK_URL (defaults to "https://letstrucktribe.com")
 */

import Anthropic from "@anthropic-ai/sdk";

const MN_API_BASE = "https://api.mn.co";

interface MightyNetworksConfig {
  apiToken: string;
  spaceId: string;
  networkId: string;
  networkUrl: string;
}

interface PostResult {
  id: string;
  url: string;
  platform: "mighty_networks";
}

interface MightyNetworksPostOptions {
  title: string;
  body: string;
  imageUrl?: string | null;
}

export interface TribeContent {
  title: string;
  body: string;
}

interface MightyNetworksSpace {
  id: number;
  name: string;
  slug: string;
  description?: string;
  space_type?: string;
  member_count?: number;
}

/**
 * Get the API token only (for discovery endpoints that don't need space ID)
 */
function getApiToken(): string {
  const apiToken = process.env.MIGHTY_NETWORKS_API_TOKEN;
  if (!apiToken) {
    throw new Error(
      "MIGHTY_NETWORKS_API_TOKEN environment variable is not set"
    );
  }
  return apiToken;
}

/**
 * Check if the API token is set (doesn't require space ID)
 */
export function hasToken(): boolean {
  return !!process.env.MIGHTY_NETWORKS_API_TOKEN;
}

/**
 * Get the network ID (numeric or subdomain) for API paths
 */
function getNetworkId(): string {
  return process.env.MIGHTY_NETWORKS_NETWORK_ID || "letstruck";
}

function getConfig(): MightyNetworksConfig {
  const apiToken = getApiToken();
  const spaceId = process.env.MIGHTY_NETWORKS_SPACE_ID;
  const networkId = getNetworkId();
  const networkUrl =
    process.env.MIGHTY_NETWORKS_NETWORK_URL || "https://letstrucktribe.com";

  if (!spaceId) {
    throw new Error(
      "MIGHTY_NETWORKS_SPACE_ID environment variable is not set"
    );
  }

  return {
    apiToken,
    spaceId,
    networkId,
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
  const apiToken = getApiToken();
  const networkId = getNetworkId();

  const response = await fetch(
    `${MN_API_BASE}/admin/v1/networks/${networkId}/spaces`,
    {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[MightyNetworks] Failed to fetch spaces:", errorText);
    throw new Error(
      `Mighty Networks API error (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();

  // API returns { items: [...], links: {...} } for paginated results
  return Array.isArray(data) ? data : data.items || data.spaces || data.data || [];
}

/**
 * Upload an image asset to Mighty Networks.
 *
 * Uses POST /admin/v1/networks/{network_id}/assets with source_url
 * to upload an image from a URL. Returns the asset ID if successful.
 *
 * This should be called before creating a post — MN may auto-associate
 * the uploaded asset with the next post created.
 */
async function uploadAsset(
  imageUrl: string
): Promise<{ id: number; url: string } | null> {
  try {
    const config = getConfig();

    const formData = new FormData();
    formData.append("asset_style", "post");
    formData.append("source_url", imageUrl);
    formData.append("input_type", "1");

    console.log("[MightyNetworks] Uploading asset from URL:", imageUrl.substring(0, 100));

    const response = await fetch(
      `${MN_API_BASE}/admin/v1/networks/${config.networkId}/assets`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiToken}`,
          Accept: "application/json",
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[MightyNetworks] Asset upload error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    const assetId = data.id || data.asset_id;
    const assetUrl = data.url || data.image_url;

    console.log("[MightyNetworks] Asset uploaded:", assetId, assetUrl);
    return { id: assetId, url: assetUrl || imageUrl };
  } catch (error) {
    console.error("[MightyNetworks] Asset upload failed:", error);
    return null;
  }
}

/**
 * Publish a post to the configured Mighty Networks space
 *
 * Uses POST /admin/v1/networks/{network_id}/posts to create a new post.
 * The post will appear in the specified space (e.g., "News").
 *
 * If an imageUrl is provided, uploads it as an asset first.
 * API requires: space_id (int), title (string), description (string)
 */
export async function publishToMightyNetworks(
  options: MightyNetworksPostOptions
): Promise<PostResult> {
  const config = getConfig();

  // Upload image asset first if provided (non-blocking — post still goes out if upload fails)
  if (options.imageUrl) {
    await uploadAsset(options.imageUrl);
  }

  // Build the post payload per API docs:
  // - space_id: integer ID of the target space
  // - title: required string (AI-generated, descriptive)
  // - description: HTML-formatted body content
  // - post_type: "article" renders with rich formatting (paragraphs, bold, lists)
  //   vs "post" (Quick Post) which collapses all whitespace into one block
  const postPayload: Record<string, unknown> = {
    space_id: parseInt(config.spaceId, 10),
    title: options.title,
    description: options.body,
    post_type: "article",
  };

  console.log(
    "[MightyNetworks] Creating post in space:",
    config.spaceId,
    "network:",
    config.networkId,
    "title:",
    options.title,
    "body length:",
    options.body.length
  );

  const response = await fetch(
    `${MN_API_BASE}/admin/v1/networks/${config.networkId}/posts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(postPayload),
    }
  );

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

  // Extract post ID and permalink from response
  const postId = data.id || data.post_id || data.data?.id;
  const permalink = data.permalink || data.data?.permalink;

  if (!postId) {
    console.warn(
      "[MightyNetworks] No post ID in response:",
      JSON.stringify(data).substring(0, 500)
    );
  }

  // Use permalink from API if available, otherwise construct URL
  const postUrl = permalink
    ? `${config.networkUrl}${permalink.startsWith("/") ? "" : "/"}${permalink}`
    : postId
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
 * Returns a title and formatted body with paragraph breaks and bullets.
 */
export async function adaptForTribe(socialText: string): Promise<TribeContent> {
  try {
    const anthropic = new Anthropic();

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Rewrite this social media post as a community post for The Tribe (Let's Truck community on Mighty Networks). Return a JSON object with "title" and "body" fields. The body MUST use HTML tags for formatting.

SOCIAL POST:
${socialText}

TITLE RULES:
- Short, compelling title (5-10 words) that captures the core message
- NOT a greeting like "Hey Tribe" — make it descriptive and attention-grabbing
- Examples: "Creatine Isn't Just for Gym Bros", "Your Brain Needs Real Fuel", "Why 70% of Drivers Have Candida"
- Plain text only (no HTML in the title)

BODY FORMATTING RULES (HTML REQUIRED):
- Wrap EVERY paragraph in <p>...</p> tags — this is critical for spacing
- Use SHORT paragraphs (2-3 sentences max per <p> block)
- Use <strong>...</strong> for emphasis on key phrases (not ALL CAPS)
- For bullet lists, use plain text bullets with <br> tags:
  <p>• Point one<br>• Point two<br>• Point three</p>
- Do NOT use markdown (#, **, _, etc.) — use HTML only
- Keep it readable: lots of short paragraphs, not dense blocks

VOICE & CONTENT RULES:
- Write as Kevin Rutherford talking directly to The Tribe
- Conversational and community-focused — like talking to your people
- Longer than social (200-600 words is fine), add more depth and context
- NO hashtags — community posts don't use them
- Can open the body with "Tribe," or "Hey Tribe," or just dive in
- End with engagement: ask a question, invite comments, start discussion
- Examples: "What's your experience with this?", "Drop your thoughts below", "Who else deals with this?"
- Keep Kevin's direct, no-BS voice — NEVER say "trucker" (use "driver", "professional driver")
- Use phrases like "proper human diet", "owner-operator of your health", "The Tribe"
- If there's a product link, keep it but weave it naturally using <a href="...">link text</a>
- Strip any emojis that feel too "social media" — a few are OK if natural

Return ONLY valid JSON with this exact structure:
{"title": "Your Compelling Title Here", "body": "<p>First paragraph.</p><p>Second paragraph with <strong>emphasis</strong>.</p>"}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === "text" && content.text.trim()) {
      // Parse JSON response
      const text = content.text.trim();
      // Try to extract JSON from the response (may be wrapped in code fences)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.title && parsed.body) {
          console.log(
            "[MightyNetworks] Adapted for Tribe — title:",
            parsed.title,
            "body length:",
            parsed.body.length
          );
          return {
            title: parsed.title,
            body: parsed.body,
          };
        }
      }

      // If JSON parsing fails, use text as body with a generated title
      console.warn("[MightyNetworks] Failed to parse JSON, using text as body");
      const firstSentence = text.split(/[.!?]/)[0];
      return {
        title: firstSentence.length > 80 ? firstSentence.substring(0, 77) + "..." : firstSentence,
        body: text,
      };
    }
  } catch (error) {
    console.error("[MightyNetworks] Failed to adapt content for Tribe:", error);
    // Fall through to fallback
  }

  // Fallback: strip hashtags from original text, generate simple title
  const cleanText = socialText.replace(/#\w+/g, "").trim();
  const fallbackTitle = cleanText.split(/[.!?\n]/)[0].substring(0, 80);
  return {
    title: fallbackTitle || "Community Update",
    body: cleanText,
  };
}

/**
 * Delete a post from Mighty Networks
 */
export async function deletePost(postId: string): Promise<boolean> {
  const config = getConfig();

  const response = await fetch(
    `${MN_API_BASE}/admin/v1/networks/${config.networkId}/posts/${postId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        Accept: "application/json",
      },
    }
  );

  return response.ok;
}
