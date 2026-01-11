/**
 * Veo 3 Video Generation (Google Gemini)
 * State-of-the-art AI video generation with native audio
 *
 * Features:
 * - Text-to-video generation
 * - Image-to-video animation
 * - Native synchronized audio (dialogue, SFX, music)
 * - 720p/1080p resolution
 * - 4, 6, or 8 second clips
 */

import { uploadToR2, getPublicUrl } from "@/lib/storage/r2";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const VEO_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Available Veo models
export const VEO_MODELS = {
  "veo-2": "veo-2.0-generate-001", // Veo 2 (stable)
  "veo-3": "veo-3.0-generate-001", // Standard Veo 3 with native audio
  "veo-3-fast": "veo-3.0-fast-generate-001", // Faster, lower cost
  "veo-3.1": "veo-3.1-generate-preview", // Latest with video extension (preview)
} as const;

export type VeoModel = keyof typeof VEO_MODELS;
export type VeoAspectRatio = "16:9" | "9:16";
export type VeoResolution = "720p" | "1080p";
export type VeoDuration = 4 | 6 | 8;

interface GenerateVideoOptions {
  prompt: string;
  aspectRatio?: VeoAspectRatio;
  resolution?: VeoResolution;
  durationSeconds?: VeoDuration;
  model?: VeoModel;
  negativePrompt?: string;
  // For image-to-video
  imageBase64?: string;
  imageMimeType?: string;
}

interface VeoOperation {
  name: string;
  done: boolean;
  error?: {
    code: number;
    message: string;
  };
  response?: {
    generateVideoResponse: {
      generatedSamples: Array<{
        video: {
          uri: string;
        };
      }>;
    };
  };
}

export function isVeoAvailable(): boolean {
  return !!GEMINI_API_KEY;
}

/**
 * Start a video generation task
 * Returns an operation name for polling
 */
export async function startVideoGeneration(
  options: GenerateVideoOptions
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const {
    prompt,
    aspectRatio = "16:9",
    resolution = "720p",
    durationSeconds = 8,
    model = "veo-3",
    negativePrompt,
    imageBase64,
    imageMimeType,
  } = options;

  const modelId = VEO_MODELS[model];

  // Build the request body
  const instance: Record<string, unknown> = {
    prompt,
  };

  // Add image for image-to-video
  if (imageBase64 && imageMimeType) {
    instance.image = {
      bytesBase64Encoded: imageBase64,
      mimeType: imageMimeType,
    };
  }

  const parameters: Record<string, unknown> = {
    aspectRatio,
    resolution,
    durationSeconds,
  };

  if (negativePrompt) {
    parameters.negativePrompt = negativePrompt;
  }

  const response = await fetch(
    `${VEO_BASE_URL}/${modelId}:predictLongRunning?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instances: [instance],
        parameters,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("[Veo] API error:", error);
    throw new Error(
      error.error?.message || `Veo API error: ${response.status}`
    );
  }

  const data = await response.json();
  return data.name; // Operation name for polling
}

/**
 * Check the status of a video generation operation
 */
export async function getOperationStatus(
  operationName: string
): Promise<VeoOperation> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  // The operation name includes the full path, but we need to use it with the base URL
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${GEMINI_API_KEY}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error?.message || `Failed to get operation status: ${response.status}`
    );
  }

  return response.json();
}

/**
 * Wait for video generation to complete
 */
export async function waitForCompletion(
  operationName: string,
  maxWaitMs: number = 300000, // 5 minutes
  pollIntervalMs: number = 5000
): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const operation = await getOperationStatus(operationName);

    if (operation.error) {
      throw new Error(
        `Video generation failed: ${operation.error.message} (code: ${operation.error.code})`
      );
    }

    if (operation.done) {
      const videoUri =
        operation.response?.generateVideoResponse?.generatedSamples?.[0]?.video
          ?.uri;
      if (!videoUri) {
        throw new Error("No video URI in completed operation");
      }
      return videoUri;
    }

    // Still processing, wait and poll again
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Video generation timed out after ${maxWaitMs / 1000} seconds`);
}

/**
 * Download video from Google's temporary URI
 */
export async function downloadVideo(videoUri: string): Promise<Buffer> {
  // The URI might need the API key appended
  const urlWithKey = videoUri.includes("?")
    ? `${videoUri}&key=${GEMINI_API_KEY}`
    : `${videoUri}?key=${GEMINI_API_KEY}`;

  // Follow redirects manually since Google returns a 302
  let response = await fetch(urlWithKey, { redirect: "follow" });

  // If we get a redirect response, follow it
  if (response.status === 302 || response.status === 301) {
    const redirectUrl = response.headers.get("location");
    if (redirectUrl) {
      response = await fetch(redirectUrl);
    }
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Failed to download video: ${response.status} - ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate video and wait for completion
 * Returns the temporary video URI from Google
 */
export async function generateVideo(
  options: GenerateVideoOptions
): Promise<string> {
  const operationName = await startVideoGeneration(options);
  console.log(`[Veo] Started operation: ${operationName}`);

  const videoUri = await waitForCompletion(operationName);
  console.log(`[Veo] Video ready: ${videoUri}`);

  return videoUri;
}

/**
 * Generate video and store in R2
 * Returns public URL
 */
export async function generateAndStoreVideo(
  options: GenerateVideoOptions
): Promise<{ videoUrl: string; durationSeconds: number }> {
  const videoUri = await generateVideo(options);
  const videoBuffer = await downloadVideo(videoUri);

  const filename = `videos/${options.aspectRatio || "16-9"}/${Date.now()}-veo.mp4`;
  await uploadToR2(filename, videoBuffer, "video/mp4");
  const publicUrl = getPublicUrl(filename);

  return {
    videoUrl: publicUrl,
    durationSeconds: options.durationSeconds || 8,
  };
}

/**
 * Get optimal aspect ratio for platform
 */
export function getAspectRatioForPlatform(platform: string): VeoAspectRatio {
  switch (platform) {
    case "tiktok":
    case "instagram_story":
    case "instagram_reels":
    case "youtube_shorts":
      return "9:16"; // Vertical
    case "youtube":
    case "twitter":
    case "facebook":
    case "linkedin":
    default:
      return "16:9"; // Horizontal
  }
}

/**
 * Create an optimized video prompt for Let's Truck content
 */
export function createVideoPrompt(
  contentText: string,
  contentType: string,
  platform: string
): string {
  const keywords = extractKeywords(contentText);

  // Brand style for video
  const brandStyle = `
Cinematic quality, professional lighting, rich contrast.
Color palette: Deep blacks, vibrant orange accents, warm earth tones.
Mood: Powerful, authentic, freedom.
Style: Documentary-feel but polished.
NO TEXT overlays in the video.
  `.trim();

  // Build scene based on content keywords
  let scene: string;

  if (
    keywords.some((k) =>
      ["truck", "driver", "road", "highway", "haul", "rig"].includes(k)
    )
  ) {
    scene =
      "Cinematic drone shot following a powerful semi-truck on an endless American highway at golden hour, dramatic clouds, dust trails, sense of freedom and adventure";
  } else if (
    keywords.some((k) =>
      ["gut", "candida", "microbiome", "digestive"].includes(k)
    )
  ) {
    scene =
      "Close-up food preparation sequence - hands seasoning a ribeye steak, cracking fresh eggs into a cast iron skillet, steam rising, appetizing cooking sounds";
  } else if (
    keywords.some((k) =>
      ["sleep", "fatigue", "tired", "rest", "recovery"].includes(k)
    )
  ) {
    scene =
      "Time-lapse of night transitioning to dawn at a truck stop, stars fading, sun rising over mountains, a driver stepping out of their cab refreshed";
  } else if (
    keywords.some((k) =>
      ["energy", "performance", "strength", "power", "supplement"].includes(k)
    )
  ) {
    scene =
      "Slow-motion close-up of diesel engine starting, exhaust pulse, chrome details catching light, raw power and reliability";
  } else if (
    keywords.some((k) =>
      ["diet", "nutrition", "protein", "meat", "food", "meal"].includes(k)
    )
  ) {
    scene =
      "Mouth-watering steak sizzling on a grill, camera slowly orbiting, juices bubbling, perfect sear forming, then plated with eggs";
  } else if (
    keywords.some((k) =>
      ["heart", "cardio", "blood", "cardiovascular"].includes(k)
    )
  ) {
    scene =
      "Abstract visualization of blood flowing through healthy arteries, pulsing with life, transitioning to a driver checking their health metrics";
  } else {
    // Default: iconic trucking scene
    scene =
      "Majestic semi-truck driving through stunning American landscape at sunset, camera tracking alongside, open road ahead, freedom and independence";
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
