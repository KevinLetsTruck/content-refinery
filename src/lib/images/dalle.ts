/**
 * DALL-E 3 Image Generation for Social Media
 * High-quality AI image generation via OpenAI API
 */

import { uploadToR2, getPublicUrl } from "@/lib/storage/r2";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export function isDalleAvailable(): boolean {
  return !!OPENAI_API_KEY;
}

type DalleSize = "1024x1024" | "1024x1792" | "1792x1024";

/**
 * Get optimal DALL-E size for platform
 */
export function getSizeForPlatform(platform: string): DalleSize {
  switch (platform) {
    case "instagram_story":
    case "tiktok":
      return "1024x1792"; // Vertical
    case "twitter":
    case "facebook":
    case "linkedin":
      return "1792x1024"; // Landscape
    case "instagram_feed":
    default:
      return "1024x1024"; // Square
  }
}

/**
 * Generate image with DALL-E 3
 */
export async function generateImage(
  prompt: string,
  platform: string
): Promise<Buffer> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const size = getSizeForPlatform(platform);

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: size,
      quality: "standard", // "standard" or "hd" (hd costs more)
      response_format: "url", // Get URL, then download
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("[DALL-E] API error:", error);
    throw new Error(error.error?.message || `DALL-E API error: ${response.status}`);
  }

  const data = await response.json();
  const imageUrl = data.data?.[0]?.url;

  if (!imageUrl) {
    throw new Error("No image URL returned from DALL-E");
  }

  // Download the image from OpenAI's temporary URL
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error("Failed to download generated image");
  }

  const arrayBuffer = await imageResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Upload image buffer to R2 and return public URL
 */
export async function uploadImageToR2(
  imageBuffer: Buffer,
  platform: string
): Promise<string> {
  const filename = `social-images/${platform}/${Date.now()}.png`;
  await uploadToR2(filename, imageBuffer, "image/png");
  return getPublicUrl(filename);
}

/**
 * Generate image and store in R2
 */
export async function generateAndStoreImage(
  prompt: string,
  platform: string
): Promise<string> {
  const imageBuffer = await generateImage(prompt, platform);
  return uploadImageToR2(imageBuffer, platform);
}

/**
 * Create a social media image prompt
 * DALL-E 3 is much better at understanding complex prompts
 */
export function createImagePrompt(
  contentText: string,
  contentType: string,
  platform: string
): string {
  // Extract key themes from content
  const keywords = extractKeywords(contentText);
  
  // Brand style - DALL-E understands natural language well
  // CRITICAL: Emphatic no-text instruction - DALL-E often ignores single mentions
  const brandStyle = `
    Professional, cinematic photography style. Pure visual imagery only.
    Color palette: Deep blacks, rich oranges (#FF6B35), warm earth tones.
    Mood: Powerful, authentic, no-nonsense.
    Theme: Professional truck drivers, health, freedom of the open road.
    CRITICAL: Absolutely NO text, NO words, NO letters, NO numbers, NO labels, NO signs, NO banners, NO titles, NO captions anywhere in the image. This is a text-free photograph only.
  `.trim();

  // Build scene based on content keywords
  let scene: string;

  if (keywords.some(k => ["truck", "driver", "road", "highway", "haul"].includes(k))) {
    scene = "A powerful semi-truck on an open American highway at golden hour, dramatic clouds, sense of freedom and adventure";
  } else if (keywords.some(k => ["gut", "candida", "microbiome", "digestive", "inflammation"].includes(k))) {
    scene = "Beautiful arrangement of fresh, whole foods - grass-fed steak, farm eggs, colorful vegetables - on a rustic wooden table, warm natural lighting";
  } else if (keywords.some(k => ["sleep", "fatigue", "tired", "rest", "recovery"].includes(k))) {
    scene = "Peaceful sunrise breaking over mountains, a truck stop in the distance, new day beginning, sense of renewal and energy";
  } else if (keywords.some(k => ["energy", "performance", "strength", "power"].includes(k))) {
    scene = "Close-up of a powerful diesel engine, chrome details gleaming, industrial strength and reliability";
  } else if (keywords.some(k => ["diet", "nutrition", "protein", "meat", "food", "eat"].includes(k))) {
    scene = "Appetizing steak and eggs breakfast on a cast iron skillet, steam rising, rustic diner atmosphere, hearty and satisfying";
  } else if (keywords.some(k => ["detox", "toxic", "chemical", "clean"].includes(k))) {
    scene = "Crystal clear mountain stream flowing over rocks, pure nature, clean and refreshing environment";
  } else if (keywords.some(k => ["weight", "fat", "obesity", "lose"].includes(k))) {
    scene = "Before/after transformation concept - dark stormy sky transitioning to bright sunny horizon, journey of change";
  } else {
    // Default: iconic trucking scene
    scene = "Majestic semi-truck parked at a scenic overlook during sunset, American heartland, freedom and independence of the open road";
  }

  // Combine for final prompt - repeat no-text instruction at start and end for emphasis
  const prompt = `Create a photograph with NO TEXT whatsoever: ${scene}. ${brandStyle} Remember: This image must contain absolutely zero text, letters, words, or writing of any kind.`;

  return prompt;
}

/**
 * Extract keywords from content text
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "must", "shall", "can", "need", "dare",
    "ought", "used", "to", "of", "in", "for", "on", "with", "at", "by",
    "from", "as", "into", "through", "during", "before", "after", "above",
    "below", "between", "under", "again", "further", "then", "once", "here",
    "there", "when", "where", "why", "how", "all", "each", "few", "more",
    "most", "other", "some", "such", "no", "nor", "not", "only", "own",
    "same", "so", "than", "too", "very", "just", "and", "but", "if", "or",
    "because", "until", "while", "this", "that", "these", "those", "i",
    "you", "he", "she", "it", "we", "they", "what", "which", "who", "whom",
    "your", "his", "her", "its", "our", "their", "my", "me", "him", "us"
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 20);
}

