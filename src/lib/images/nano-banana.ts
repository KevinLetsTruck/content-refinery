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
 * Uses AI to analyze the full content and generate contextually-appropriate visuals
 */
export async function createImagePromptWithAI(
  contentText: string,
  contentType: string,
  platform: string
): Promise<string> {
  // Use Gemini to generate a contextually-appropriate scene description
  const analysisPrompt = `You are an expert visual director for Let's Truck, a health coaching brand for professional truck drivers.

Analyze this social media post and create a scene description for an AI image generator.

POST CONTENT:
${contentText}

POST TYPE: ${contentType}
PLATFORM: ${platform}

IMPORTANT CONTEXT:
- Let's Truck serves professional truck drivers with health coaching
- The brand is direct, no-BS, anti-establishment
- Understand the SENTIMENT: Is this a warning? A celebration? Education? A wake-up call?
- Match the visual MOOD to the message - don't show hopeful imagery for warnings about dangers

VISUAL REQUIREMENTS:
- Create a scene that visually represents the core message
- If the post is WARNING about something (like drug side effects, health dangers), use dark/serious/cautionary imagery
- If the post is EDUCATIONAL, use clear, informative visuals
- If the post is INSPIRING, use uplifting, powerful imagery
- Include specific visual elements, camera angles, lighting, and mood
- Reference trucking/driver lifestyle when relevant
- NO TEXT in the image

Respond with ONLY the scene description (2-3 sentences), nothing else.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: analysisPrompt }] }],
          generationConfig: { maxOutputTokens: 200 },
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const scene = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (scene) {
        const brandStyle = `
Style: Professional, cinematic photography with rich contrast.
Color palette: Deep blacks (#0D0D0D), vibrant orange (#FF4500), warm earth tones.
Mood: Match the content - serious for warnings, powerful for inspiration.
IMPORTANT: Do NOT include any text, words, or letters in the image. Pure visual imagery only.`.trim();

        return `${scene}\n\n${brandStyle}`;
      }
    }
  } catch (error) {
    console.error("[Nano Banana] AI scene analysis failed, using fallback:", error);
  }

  // Fallback to keyword-based analysis
  return createImagePrompt(contentText, contentType, platform);
}

/**
 * Create a social media image prompt optimized for Nano Banana (sync version)
 * Gemini handles detailed, descriptive prompts very well
 *
 * This function analyzes the actual content to generate relevant imagery
 */
export function createImagePrompt(
  contentText: string,
  contentType: string,
  platform: string
): string {
  // Brand style for Let's Truck (always included)
  const brandStyle = `
Style: Professional, cinematic photography with rich contrast.
Color palette: Deep blacks (#0D0D0D), vibrant orange (#FF4500), warm earth tones.
Mood: Powerful, authentic, no-nonsense, freedom.
IMPORTANT: Do NOT include any text, words, or letters in the image. Pure visual imagery only.
  `.trim();

  // Analyze content to determine the best scene
  const scene = analyzeContentForScene(contentText);

  return `${scene}\n\n${brandStyle}`;
}

/**
 * Analyze content text and generate a relevant scene description
 */
function analyzeContentForScene(contentText: string): string {
  const text = contentText.toLowerCase();
  const keywords = extractKeywords(contentText);

  // Detect sentiment/tone
  const isWarning = containsAny(text, [
    "wake up", "warning", "danger", "risk", "beware", "caution", "avoid",
    "don't", "stop", "quit", "harmful", "toxic", "side effect", "kill",
    "death", "worse", "fail", "scam", "lie", "truth about", "what they",
    "won't tell", "hidden", "exposed", "reality"
  ]);

  const isNegativeHealth = containsAny(text, [
    "ozempic", "wegovy", "semaglutide", "glp-1", "tirzepatide", "mounjaro",
    "pharmaceutical", "big pharma", "drug", "medication", "prescription",
    "muscle loss", "muscle mass", "depression", "suicidal", "side effect"
  ]) && isWarning;

  // === PHARMACEUTICAL/DRUG WARNINGS ===
  if (isNegativeHealth) {
    return "Dramatic moody scene of prescription pill bottles casting long shadows, ominous lighting, cold clinical blue tones mixed with warning orange, sense of hidden danger, pharmaceutical dystopia aesthetic, no people visible";
  }

  // === GENERAL HEALTH WARNINGS ===
  if (isWarning && containsAny(text, ["health", "body", "weight", "fat", "muscle", "metabolism"])) {
    return "Dark dramatic scene of a crossroads at stormy dusk, one path leading to storm clouds and danger, the other to clear skies, choice and consequence, moody documentary photography";
  }

  // === TRUCKING & INDUSTRY TOPICS ===
  if (containsAny(text, ["violation", "inspection", "dot", "csa", "fmcsa", "enforcement", "compliance", "out-of-service", "oos"])) {
    return "A serious-looking DOT inspection scene at a weigh station, officers with clipboards examining a commercial truck, official atmosphere, tension in the air, realistic documentary-style photography";
  }

  if (containsAny(text, ["pre-trip", "maintenance", "brake", "tire", "repair", "mechanic", "shop"])) {
    return "Professional driver performing thorough pre-trip inspection, checking tires and brakes on a well-maintained Peterbilt, morning light, meticulous attention to detail, pride in equipment";
  }

  if (containsAny(text, ["rate", "freight", "broker", "load", "shipper", "pay", "revenue", "market"])) {
    return "Aerial view of a massive freight distribution hub, hundreds of trucks lined up, logistics in motion, the scale of American commerce, industrial photography";
  }

  if (containsAny(text, ["regulation", "eld", "hos", "hours of service", "logbook", "mandate"])) {
    return "Close-up of a truck dashboard with ELD device, driver's hand on steering wheel, digital clock showing hours, the reality of modern trucking regulations";
  }

  if (containsAny(text, ["owner-operator", "o/o", "independent", "authority", "mc number", "business"])) {
    return "Proud owner-operator standing confidently beside their pristine custom truck, American flag waving in background, small business owner success, entrepreneurial spirit";
  }

  if (containsAny(text, ["accident", "crash", "safety", "dangerous", "death", "kill"])) {
    return "Dramatic rainstorm on a dark highway, tail lights blurred in rain, dangerous driving conditions, cautionary mood, moody cinematic photography";
  }

  // === POLITICS & POLICY ===
  if (containsAny(text, ["congress", "senate", "bill", "legislation", "lawmaker", "politician", "vote", "policy"])) {
    return "The United States Capitol building at dusk, American flag flying, seat of government, political power and decision-making, patriotic but serious mood";
  }

  if (containsAny(text, ["tax", "irs", "deduction", "write-off", "quarterly"])) {
    return "Stack of financial documents and receipts on a desk, calculator, coffee cup, the business side of trucking, late night paperwork, small business finances";
  }

  // === FINANCE & MONEY ===
  if (containsAny(text, ["retire", "401k", "invest", "save", "wealth", "financial freedom"])) {
    return "Scenic view from the front porch of a beautiful country home, mountains in distance, rocking chairs, the reward of hard work and smart planning, peaceful retirement dream";
  }

  if (containsAny(text, ["diesel", "fuel", "price", "pump", "cost"])) {
    return "Dramatic close-up of fuel pump nozzle filling a truck tank, digital price display showing high numbers, the cost of business, impactful documentary style";
  }

  // === HEALTH TOPICS ===
  if (containsAny(text, ["gut", "candida", "microbiome", "digestive", "inflammation", "probiotics"])) {
    return "Beautiful arrangement of fermented foods - kimchi, sauerkraut, bone broth - alongside fresh vegetables, gut-healing foods, warm kitchen lighting, health and vitality";
  }

  if (containsAny(text, ["sleep", "fatigue", "tired", "rest", "recovery", "insomnia"])) {
    return "Peaceful scene of a cozy truck sleeper berth at night, soft ambient lighting, comfortable bedding, the importance of rest on the road";
  }

  if (containsAny(text, ["energy", "performance", "strength", "power", "supplement", "vitamin"])) {
    return "Dynamic shot of supplement bottles arranged artistically with whole food ingredients, natural energy sources, health optimization, clean product photography";
  }

  if (containsAny(text, ["diet", "nutrition", "protein", "meat", "food", "eat", "meal", "keto", "carnivore", "paleo"])) {
    return "Mouth-watering ribeye steak on a cast iron skillet, perfectly cooked, steam rising, accompanied by eggs and butter, real food for real results, appetizing food photography";
  }

  if (containsAny(text, ["weight", "fat", "obesity", "lose", "transform", "pound"])) {
    return "Before and after transformation concept - split image of stormy clouds transitioning to bright sunshine over open road, journey of change, hope and determination";
  }

  if (containsAny(text, ["heart", "cardio", "blood", "pressure", "cardiovascular", "nitric oxide"])) {
    return "Artistic representation of blood flow and circulation, red abstract patterns suggesting vitality, life force, cardiovascular health concept, medical-artistic style";
  }

  if (containsAny(text, ["detox", "toxic", "chemical", "clean", "liver"])) {
    return "Crystal clear mountain spring water cascading over rocks, pristine wilderness, pure and clean environment, detoxification and renewal concept";
  }

  if (containsAny(text, ["stress", "cortisol", "anxiety", "mental", "depression"])) {
    return "Serene landscape of open prairie at golden hour, sense of peace and calm, escape from chaos, mental clarity, therapeutic natural scenery";
  }

  // === LIFESTYLE & COMMUNITY ===
  if (containsAny(text, ["family", "home", "wife", "kid", "son", "daughter", "love"])) {
    return "Warm family reunion scene - truck driver arriving home, family running to greet them, suburban driveway, the sacrifice and reward of the profession, emotional moment";
  }

  if (containsAny(text, ["tribe", "community", "together", "support", "brotherhood"])) {
    return "Group of professional drivers gathered at a truck stop, camaraderie and friendship, diverse faces united by profession, the trucking brotherhood, candid group portrait";
  }

  // === DEFAULT BASED ON GENERAL KEYWORDS ===
  if (keywords.some(k => ["truck", "driver", "road", "highway", "haul", "rig", "mile", "route"].includes(k))) {
    // Trucking-related but no specific match - use iconic trucking imagery
    const truckingScenes = [
      "Powerful Kenworth W900 climbing a mountain pass at sunrise, exhaust steam in cold air, chrome gleaming, conquering the terrain",
      "Long line of trucks stretching to the horizon on Interstate 40, the backbone of America, commerce in motion",
      "Driver's POV through windshield at night, dashboard glow, rain-slicked highway, lonely but focused, the night shift",
      "Peterbilt 389 at a desert truck stop during blue hour, neon signs reflecting on chrome, iconic American scene",
    ];
    return truckingScenes[Math.floor(Math.random() * truckingScenes.length)];
  }

  // === ABSOLUTE DEFAULT - Analyze first 100 chars for context ===
  const preview = contentText.substring(0, 200);

  if (preview.includes("%") || preview.match(/\d+/)) {
    // Contains statistics - use impactful data visualization style
    return "Dramatic wide shot of a massive truck convoy stretching across American heartland, scale and impact, the numbers behind the industry, documentary photography";
  }

  // Generic but varied trucking scenes
  const defaultScenes = [
    "Breathtaking aerial view of an 18-wheeler navigating a winding mountain road, drone photography, epic scale of trucking",
    "Close-up of weathered but strong hands gripping a steering wheel, wedding ring visible, the professional driver, character portrait",
    "Sunset silhouette of truck and driver at scenic overlook, reflection and contemplation, end of day, cinematic mood",
    "Early morning fog lifting at a rural truck stop, trucks lined up, coffee steam rising, the quiet before the road calls",
  ];
  return defaultScenes[Math.floor(Math.random() * defaultScenes.length)];
}

/**
 * Helper to check if text contains any of the given terms
 */
function containsAny(text: string, terms: string[]): boolean {
  return terms.some(term => text.includes(term));
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
