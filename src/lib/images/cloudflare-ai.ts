/**
 * Cloudflare Workers AI Image Generation
 * Uses SDXL-Lightning model for fast, high-quality social media images
 */

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_AI_MODEL = "@cf/bytedance/stable-diffusion-xl-lightning";

interface ImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
}

interface ImageGenerationResult {
  success: boolean;
  imageData?: Buffer;
  contentType: string;
  error?: string;
}

/**
 * Check if Cloudflare AI is configured
 */
export function isConfigured(): boolean {
  return !!(CF_ACCOUNT_ID && CF_API_TOKEN);
}

/**
 * Generate an image using Cloudflare Workers AI
 * Returns raw image data (PNG)
 */
export async function generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    return {
      success: false,
      contentType: "image/png",
      error: "Cloudflare credentials not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.",
    };
  }

  const {
    prompt,
    negativePrompt = "blurry, low quality, distorted, ugly, bad anatomy, watermark, text, logo",
    width = 1024,
    height = 1024,
    steps = 4, // SDXL-Lightning is optimized for 4 steps
  } = options;

  console.log(`[CF-AI] Generating image: "${prompt.substring(0, 50)}..."`);

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${CF_AI_MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          negative_prompt: negativePrompt,
          width,
          height,
          num_steps: steps,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[CF-AI] API error:", response.status, errorText);
      return {
        success: false,
        contentType: "image/png",
        error: `Cloudflare AI error: ${response.status} - ${errorText}`,
      };
    }

    // Response is raw image data
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    console.log(`[CF-AI] Image generated successfully (${imageBuffer.length} bytes)`);

    return {
      success: true,
      imageData: imageBuffer,
      contentType: "image/png",
    };
  } catch (error) {
    console.error("[CF-AI] Generation failed:", error);
    return {
      success: false,
      contentType: "image/png",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create a social media image prompt from content
 * Transforms the post text into an image generation prompt
 */
export function createImagePrompt(
  contentText: string,
  contentType: string,
  platform: string
): string {
  // Base style for Let's Truck brand
  const brandStyle = "professional health and wellness, trucking industry, clean modern design, bold typography, dark background with orange accents";
  
  // Extract key concepts from the content
  const keywords = extractKeywords(contentText);
  
  // Build prompt based on content type
  let promptBase: string;
  
  switch (contentType) {
    case "quote":
      promptBase = `Inspirational quote card design, motivational, ${brandStyle}`;
      break;
    case "stat":
      promptBase = `Infographic style, data visualization, statistics, ${brandStyle}`;
      break;
    case "tip":
    case "protocol":
      promptBase = `Educational health tip card, actionable advice, ${brandStyle}`;
      break;
    case "hot_take":
    case "contrarian":
      promptBase = `Bold statement graphic, attention-grabbing, ${brandStyle}`;
      break;
    case "story":
    case "testimonial":
      promptBase = `Transformation story graphic, before after concept, ${brandStyle}`;
      break;
    default:
      promptBase = `Social media content card, health coaching, ${brandStyle}`;
  }

  // Add platform-specific hints
  const platformHint = platform === "instagram_story" || platform === "tiktok"
    ? "vertical format, mobile-optimized"
    : "square format, feed-optimized";

  // Combine all elements
  const prompt = `${promptBase}, ${platformHint}, featuring: ${keywords.slice(0, 5).join(", ")}`;
  
  return prompt;
}

/**
 * Extract keywords from content text
 */
function extractKeywords(text: string): string[] {
  // Common health/trucking keywords to look for
  const domainKeywords = [
    "candida", "gut health", "microbiome", "sleep", "energy", "fatigue",
    "diet", "nutrition", "fasting", "keto", "carnivore", "protein",
    "driver", "truck", "road", "health", "wellness", "coaching",
    "inflammation", "detox", "hormones", "insulin", "blood sugar",
    "weight loss", "metabolism", "recovery", "performance"
  ];
  
  const lowerText = text.toLowerCase();
  const found = domainKeywords.filter(keyword => lowerText.includes(keyword));
  
  // Also extract any numbers/statistics
  const numbers = text.match(/\d+%?/g) || [];
  
  return [...found, ...numbers.slice(0, 2)];
}

/**
 * Get dimensions for platform
 */
export function getDimensionsForPlatform(platform: string): { width: number; height: number } {
  switch (platform) {
    case "instagram_feed":
      return { width: 1024, height: 1024 }; // Square
    case "instagram_story":
    case "tiktok":
      return { width: 768, height: 1344 }; // 9:16 vertical
    case "twitter":
      return { width: 1200, height: 675 }; // 16:9 landscape  
    case "facebook":
      return { width: 1024, height: 1024 }; // Square
    case "linkedin":
      return { width: 1200, height: 627 }; // 1.91:1
    default:
      return { width: 1024, height: 1024 };
  }
}

