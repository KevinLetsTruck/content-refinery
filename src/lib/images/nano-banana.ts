/**
 * Nano Banana Image Generation (Google Gemini)
 * Alternative to DALL-E with better text rendering and flexible aspect ratios
 */

import { uploadToR2, getPublicUrl } from "@/lib/storage/r2";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Available models
export const NANO_BANANA_MODELS = {
  standard: "gemini-2.5-flash-image", // Fast, efficient (Nano Banana)
  pro: "gemini-3-pro-image-preview", // Higher quality, better text (Nano Banana Pro)
} as const;

export type NanoBananaModel = keyof typeof NANO_BANANA_MODELS;

export function isNanoBananaAvailable(): boolean {
  return !!GEMINI_API_KEY;
}

type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

/**
 * Get optimal aspect ratio for platform
 */
export function getAspectRatioForPlatform(platform: string): AspectRatio {
  switch (platform) {
    case "instagram_story":
    case "tiktok":
      return "9:16"; // Vertical
    case "twitter":
    case "facebook":
    case "linkedin":
    case "youtube_thumbnail":
      return "16:9"; // Landscape
    case "instagram_feed":
    default:
      return "1:1"; // Square
  }
}

/**
 * Generate image with Nano Banana (Gemini)
 */
export async function generateImage(
  prompt: string,
  options: {
    aspectRatio?: AspectRatio;
    model?: NanoBananaModel;
  } = {}
): Promise<Buffer> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const { aspectRatio = "1:1", model = "standard" } = options;
  const modelId = NANO_BANANA_MODELS[model];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("[Nano Banana] API error:", error);
    throw new Error(
      error.error?.message || `Nano Banana API error: ${response.status}`
    );
  }

  const data = await response.json();

  // Find the image part in the response
  const imagePart = data.candidates?.[0]?.content?.parts?.find(
    (part: { inlineData?: { mimeType: string; data: string } }) =>
      part.inlineData?.mimeType?.startsWith("image/")
  );

  if (!imagePart?.inlineData?.data) {
    console.error("[Nano Banana] No image in response:", JSON.stringify(data, null, 2));
    throw new Error("No image returned from Nano Banana");
  }

  // Decode base64 image
  const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");
  return imageBuffer;
}

/**
 * Upload image buffer to R2 and return public URL
 */
export async function uploadImageToR2(
  imageBuffer: Buffer,
  platform: string
): Promise<string> {
  const filename = `social-images/${platform}/${Date.now()}-nano-banana.png`;
  await uploadToR2(filename, imageBuffer, "image/png");
  return getPublicUrl(filename);
}

/**
 * Generate image and store in R2
 */
export async function generateAndStoreImage(
  prompt: string,
  platform: string,
  model: NanoBananaModel = "standard"
): Promise<string> {
  const aspectRatio = getAspectRatioForPlatform(platform);
  const imageBuffer = await generateImage(prompt, { aspectRatio, model });
  return uploadImageToR2(imageBuffer, platform);
}

/**
 * Create a social media image prompt optimized for Nano Banana
 * Gemini handles detailed, descriptive prompts very well
 */
export function createImagePrompt(
  contentText: string,
  contentType: string,
  platform: string
): string {
  const keywords = extractKeywords(contentText);

  // Brand style for Let's Truck
  const brandStyle = `
Style: Professional, cinematic photography with rich contrast.
Color palette: Deep blacks (#0D0D0D), vibrant orange (#FF4500), warm earth tones.
Mood: Powerful, authentic, no-nonsense, freedom.
Theme: Professional truck drivers, health transformation, open road freedom.
IMPORTANT: Do NOT include any text, words, or letters in the image.
  `.trim();

  // Build scene based on content keywords
  let scene: string;

  if (
    keywords.some((k) =>
      ["truck", "driver", "road", "highway", "haul", "rig"].includes(k)
    )
  ) {
    scene =
      "A powerful Peterbilt or Kenworth semi-truck on an open American highway at golden hour, dramatic cloud formations, endless road stretching to the horizon, cinematic lighting";
  } else if (
    keywords.some((k) =>
      ["gut", "candida", "microbiome", "digestive", "inflammation"].includes(k)
    )
  ) {
    scene =
      "Beautiful arrangement of whole foods - grass-fed ribeye steak, farm-fresh eggs, colorful vegetables, avocados - on a rustic wooden cutting board, warm natural window lighting, appetizing food photography";
  } else if (
    keywords.some((k) =>
      ["sleep", "fatigue", "tired", "rest", "recovery"].includes(k)
    )
  ) {
    scene =
      "Breathtaking sunrise breaking over mountain range, a lone truck stop silhouetted in the distance, rays of golden light piercing through clouds, new day beginning";
  } else if (
    keywords.some((k) =>
      ["energy", "performance", "strength", "power", "supplement"].includes(k)
    )
  ) {
    scene =
      "Close-up of gleaming chrome diesel engine details, powerful machinery, industrial strength, droplets of morning dew on polished metal";
  } else if (
    keywords.some((k) =>
      ["diet", "nutrition", "protein", "meat", "food", "eat", "meal"].includes(k)
    )
  ) {
    scene =
      "Mouth-watering steak and eggs breakfast on a cast iron skillet, steam rising, rustic truck stop diner atmosphere, hearty and satisfying American breakfast";
  } else if (
    keywords.some((k) => ["detox", "toxic", "chemical", "clean"].includes(k))
  ) {
    scene =
      "Crystal clear mountain stream flowing over smooth rocks, pristine wilderness, pure untouched nature, clean air and water, refreshing environment";
  } else if (
    keywords.some((k) =>
      ["weight", "fat", "obesity", "lose", "transform"].includes(k)
    )
  ) {
    scene =
      "Dramatic sky split between dark stormy clouds and bright sunshine, representing transformation and change, journey from darkness to light";
  } else if (
    keywords.some((k) =>
      ["heart", "cardio", "blood", "pressure", "cardiovascular"].includes(k)
    )
  ) {
    scene =
      "Powerful image of a healthy beating heart concept, red blood cells flowing, life force and vitality, medical-artistic rendering";
  } else {
    // Default: iconic trucking scene
    scene =
      "Majestic chrome semi-truck parked at a scenic overlook during sunset, American heartland vista, freedom and independence of the open road, driver's perspective";
  }

  return `${scene}\n\n${brandStyle}`;
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
    "your", "his", "her", "its", "our", "their", "my", "me", "him", "us",
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word))
    .slice(0, 20);
}
