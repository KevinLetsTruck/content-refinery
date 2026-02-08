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

export const MN_API_BASE = "https://api.mn.co";

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
export function getApiToken(): string {
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
export function getNetworkId(): string {
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

    // MN asset upload requires multipart/form-data (not JSON body).
    // Omit input_type — MN infers it from source_url presence.
    // FormData stringifies integers which causes "Invalid input_type" errors.
    // Proven to work: Feb 8 18:34 upload succeeded with id 149939655 using this approach.
    const formData = new FormData();
    formData.append("asset_style", "post");
    formData.append("source_url", imageUrl);

    console.log("[MightyNetworks] Uploading asset from URL:", imageUrl.substring(0, 100));

    const response = await fetch(
      `${MN_API_BASE}/admin/v1/networks/${config.networkId}/assets`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiToken}`,
          Accept: "application/json",
          // Do NOT set Content-Type — fetch auto-sets multipart/form-data with boundary
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
 * Publish a post via Zapier webhook bridge.
 *
 * The MN Admin API does not support attaching images to posts (all field names
 * are rejected). Zapier's native MN integration has an "Asset" field that works
 * via a proprietary API channel. We POST to a Zapier Catch Hook webhook, which
 * triggers a Zap that creates the MN post with the image.
 *
 * Requires ZAPIER_MN_WEBHOOK_URL environment variable.
 */
async function publishViaZapier(
  options: MightyNetworksPostOptions
): Promise<PostResult> {
  const webhookUrl = process.env.ZAPIER_MN_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("ZAPIER_MN_WEBHOOK_URL environment variable is not set");
  }

  const config = getConfig();
  const sanitizedBody = sanitizeMNHtml(options.body);

  console.log(
    "[MightyNetworks] Sending to Zapier bridge — title:",
    options.title,
    "body length:",
    sanitizedBody.length,
    "imageUrl:",
    options.imageUrl?.substring(0, 80)
  );

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: options.title,
      body: sanitizedBody,
      imageUrl: options.imageUrl,
      spaceId: parseInt(config.spaceId, 10),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[MightyNetworks] Zapier webhook error:", response.status, errorText);
    throw new Error(`Zapier webhook error (${response.status}): ${errorText}`);
  }

  console.log("[MightyNetworks] Zapier bridge accepted the post");

  // Zapier returns a generic 200 — no post ID or permalink available
  return {
    id: `zapier-${Date.now()}`,
    url: config.networkUrl,
    platform: "mighty_networks",
  };
}

/**
 * Sanitize HTML for Mighty Networks API.
 *
 * MN only allows inline style tags: <strong>, <em>, <b>, <i>, <br>.
 * Block-level tags (<p>, <div>, <h1-h6>) and media tags (<a>, <img>)
 * are NOT supported and will cause a 422 error.
 *
 * MN renders description as HTML, so we use <br> tags for line breaks
 * (plain \n newlines are collapsed by HTML rendering).
 */
function sanitizeMNHtml(html: string): string {
  return html
    .replace(/<\/p>\s*<p[^>]*>/gi, "<br><br>") // </p><p> → double break
    .replace(/<p[^>]*>/gi, "") // Opening <p> → remove
    .replace(/<\/p>/gi, "<br><br>") // Closing </p> → double break
    .replace(/<br\s*\/?>/gi, "<br>") // Normalize <br> variants
    .replace(/<a[^>]*>(.*?)<\/a>/gi, "$1") // Strip <a> tags, keep text
    .replace(/<img[^>]*\/?>/gi, "") // Remove <img> tags
    .replace(/<\/?(div|section|article|header|footer|nav|main|aside)[^>]*>/gi, "<br>")
    .replace(/<\/?(h[1-6])[^>]*>/gi, "<br>") // Headings → break
    .replace(/<\/?(ul|ol)[^>]*>/gi, "<br>") // List containers → break
    .replace(/<li[^>]*>/gi, "• ") // List items → bullet
    .replace(/<\/li>/gi, "<br>") // End list item → break
    .replace(/<\/?(blockquote)[^>]*>/gi, "<br>")
    .replace(/\n\n/g, "<br><br>") // Double newlines → double break
    .replace(/\n/g, "<br>") // Single newlines → single break
    .replace(/<\/?(?!(?:strong|em|b|i|br)\b)[a-z][^>]*>/gi, "") // Strip any non-whitelisted HTML tags
    .replace(/(<br>){4,}/g, "<br><br>") // Collapse excess breaks
    .trim();
}

export async function publishToMightyNetworks(
  options: MightyNetworksPostOptions
): Promise<PostResult> {
  // If we have an image and Zapier is configured, route through Zapier.
  // The MN Admin API does not support attaching images to posts (exhaustively
  // tested: all field names rejected). Zapier's native MN integration has an
  // "Asset" field that works via a proprietary API channel.
  if (options.imageUrl && process.env.ZAPIER_MN_WEBHOOK_URL) {
    try {
      console.log("[MightyNetworks] Using Zapier bridge for image post");
      return await publishViaZapier(options);
    } catch (error) {
      console.error(
        "[MightyNetworks] Zapier bridge failed, falling back to direct API (without image):",
        error
      );
      // Fall through to direct API without image
    }
  }

  // Direct API: JSON post (space_id, title, description) — no image support
  const config = getConfig();
  const sanitizedBody = sanitizeMNHtml(options.body);
  const apiEndpoint = `${MN_API_BASE}/admin/v1/networks/${config.networkId}/posts`;
  const spaceId = parseInt(config.spaceId, 10);

  console.log(
    "[MightyNetworks] Creating post via direct API in space:",
    config.spaceId,
    "network:",
    config.networkId,
    "title:",
    options.title,
    "body length:",
    sanitizedBody.length
  );

  const postPayload = {
    space_id: spaceId,
    title: options.title,
    description: sanitizedBody,
  };

  const response = await fetch(apiEndpoint, {
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
  // Note: MN API returns full URLs in permalink (e.g., "https://www.letstrucktribe.com/posts/...")
  const postUrl = permalink
    ? permalink.startsWith("http")
      ? permalink
      : `${config.networkUrl}${permalink.startsWith("/") ? "" : "/"}${permalink}`
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
          content: `Rewrite this social media post as a community post for The Tribe (Let's Truck community on Mighty Networks). Return a JSON object with "title" and "body" fields.

SOCIAL POST:
${socialText}

TITLE RULES:
- Short, compelling title (5-10 words) that captures the core message
- NOT a greeting like "Hey Tribe" — make it descriptive and attention-grabbing
- Examples: "Creatine Isn't Just for Gym Bros", "Your Brain Needs Real Fuel", "Why 70% of Drivers Have Candida"
- Plain text only (no HTML in the title)

BODY FORMATTING RULES:
- Use <br><br> between paragraphs for spacing (NOT newlines — MN renders as HTML)
- Use SHORT paragraphs (2-3 sentences max)
- Use <strong>...</strong> for bold emphasis on key phrases
- Use <em>...</em> for italic
- For bullet lists, use: • Point one<br>• Point two<br>• Point three
- ONLY allowed HTML tags: <strong>, <em>, <b>, <i>, <br>
- Do NOT use <p>, <div>, <h1-h6>, <a>, <img>, or any other HTML tags
- Do NOT use markdown (#, **, _, etc.)
- Keep it readable: lots of short paragraphs separated by <br><br>

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
- If there's a product URL, mention the product name in bold but do NOT include a link — MN doesn't allow them. Just say something like "check out <strong>Product Name</strong> on the store"
- Strip any emojis that feel too "social media" — a few are OK if natural

Return ONLY valid JSON with this exact structure:
{"title": "Your Compelling Title Here", "body": "First paragraph here.<br><br>Second paragraph with <strong>emphasis</strong>.<br><br>Third paragraph."}`,
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
