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
 * NOTE: AI image generators are BAD at text - so we generate mood/background images only
 */
export function createImagePrompt(
  contentText: string,
  contentType: string,
  platform: string
): string {
  // Extract key concepts from the content
  const keywords = extractKeywords(contentText);
  
  // Base style - NO TEXT, just atmospheric visuals
  const baseStyle = "professional photography, cinematic lighting, high quality, 8k, sharp focus";
  const noText = "no text, no words, no letters, no numbers, no labels, no watermarks";
  
  // Build prompt based on content type - focus on MOOD not infographics
  let scene: string;
  
  if (keywords.includes("truck") || keywords.includes("driver")) {
    scene = "semi truck on open highway at golden hour, dramatic sky, american landscape";
  } else if (keywords.includes("gut") || keywords.includes("candida") || keywords.includes("microbiome")) {
    scene = "healthy organic food arrangement, fresh vegetables, clean eating, dark moody background";
  } else if (keywords.includes("sleep") || keywords.includes("recovery") || keywords.includes("fatigue")) {
    scene = "peaceful sunrise over mountain landscape, calm serene atmosphere, new beginning";
  } else if (keywords.includes("energy") || keywords.includes("performance")) {
    scene = "powerful semi truck engine, industrial strength, chrome and steel details";
  } else if (keywords.includes("diet") || keywords.includes("nutrition") || keywords.includes("protein")) {
    scene = "premium steak and eggs breakfast, rustic table, warm morning light";
  } else if (keywords.includes("detox") || keywords.includes("inflammation")) {
    scene = "clean water flowing over rocks, nature purification, fresh and clean";
  } else {
    // Default: trucking + health theme
    scene = "semi truck at truck stop during beautiful sunset, americana vibes, freedom of the road";
  }

  // Combine for final prompt
  const prompt = `${scene}, ${baseStyle}, ${noText}`;
  
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
 * NOTE: All dimensions must be divisible by 8 for SDXL-Lightning
 */
export function getDimensionsForPlatform(platform: string): { width: number; height: number } {
  switch (platform) {
    case "instagram_feed":
      return { width: 1024, height: 1024 }; // Square (1024/8=128 ✓)
    case "instagram_story":
    case "tiktok":
      return { width: 768, height: 1344 }; // 9:16 vertical (both divisible by 8)
    case "twitter":
      return { width: 1024, height: 576 }; // 16:9 landscape (both divisible by 8)
    case "facebook":
      return { width: 1024, height: 1024 }; // Square
    case "linkedin":
      return { width: 1200, height: 624 }; // ~1.92:1 (624/8=78 ✓)
    default:
      return { width: 1024, height: 1024 };
  }
}

