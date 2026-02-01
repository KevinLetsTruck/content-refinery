/**
 * AI Script Generator for Video Production
 * Uses Claude to generate video scripts with scene breakdowns
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  VideoType,
  VideoScript,
  Scene,
  VideoGenerationRequest,
  ScriptGenerationResult,
  VIDEO_TYPE_CONFIG,
  ContentCategory,
} from "./types";

const anthropic = new Anthropic();

const CATEGORY_SPECIFIC_GUIDANCE: Record<ContentCategory, string> = {
  health: `
CONTENT FOCUS: HEALTH
- Focus on driver health, nutrition, and wellness
- Reference functional health approaches
- Challenge mainstream medical advice where appropriate
- Signature phrases: "proper human diet", "your body, your rig"
`,
  business: `
CONTENT FOCUS: BUSINESS
- Focus on trucking business operations, profitability, fuel efficiency
- Reference specific numbers and metrics (CPM, MPG, rates)
- Practical business advice for owner-operators
- Signature phrases: "know your numbers", "run it like a business"
`,
  industry: `
CONTENT FOCUS: INDUSTRY
- Focus on regulations, compliance, market trends
- Reference FMCSA, DOT, ELD rules where relevant
- Pro-driver perspective on industry changes
`,
  lifestyle: `
CONTENT FOCUS: LIFESTYLE
- Focus on life on the road, driver community
- Authentic stories and experiences
- The Tribe mentality
`,
  fiction: `
CONTENT FOCUS: FICTION (TRUCKTALES)
- Engaging storytelling
- Build suspense and curiosity
- Character-driven narratives
`,
  general: `
CONTENT FOCUS: GENERAL
- Adapt to the specific topic provided
`,
};

function getScriptSystemPrompt(category: ContentCategory = "general"): string {
  return `You are a professional video scriptwriter for Kevin Rutherford's "Let's Truck" brand. Let's Truck covers health coaching, trucking business advice, industry news, and driver lifestyle content.

BRAND VOICE:
- Authentic, experienced perspective
- Educational but conversational
- Direct and practical - drivers are busy
- Use "driver" or "owner-operator" not "trucker"
- No CB radio handles or truck nicknames
- Focus on actionable advice

${CATEGORY_SPECIFIC_GUIDANCE[category]}

SCRIPT STRUCTURE:
1. HOOK (first 3 seconds) - Grab attention immediately with a bold statement or question
2. SCENES - Each scene has narration + visual description
3. CALL TO ACTION - Clear next step (subscribe, download app, etc.)

VISUAL STYLE GUIDELINES:
- Cinematic truck footage (highways, sunsets, truck stops)
- Close-ups of dashboards, hands on wheel
- For health content: healthy food, meal prep
- For business content: receipts, fuel pumps, load boards
- Avoid showing specific people's faces (use silhouettes, hands, or over-shoulder)
- Modern trucks, clean cabs
- Dramatic lighting (golden hour, night driving, rain)

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "hook": "Opening hook text (what Kevin says in first 3 seconds)",
  "scenes": [
    {
      "narration": "What Kevin says",
      "visualDescription": "Detailed prompt for AI video generation",
      "textOverlay": "Optional on-screen text (short, impactful)",
      "duration": 5,
      "visualStyle": "cinematic|documentary|energetic|calm",
      "cameraMovement": "static|slow_pan|zoom_in|zoom_out|tracking"
    }
  ],
  "callToAction": "Final CTA text"
}`;
}

export async function generateVideoScript(
  request: VideoGenerationRequest
): Promise<ScriptGenerationResult> {
  const config = VIDEO_TYPE_CONFIG[request.type];
  const targetDuration = request.targetDuration || config.defaultDuration;

  // Use content category to customize the system prompt
  const contentCategory = request.contentCategory || "general";
  const systemPrompt = getScriptSystemPrompt(contentCategory);

  const prompt = buildScriptPrompt(request, config, targetDuration);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
  });

  // Extract JSON from response
  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to extract JSON from script response");
  }

  const scriptData = JSON.parse(jsonMatch[0]);
  
  // Process and validate the script
  const script = processScript(scriptData, request.type);

  return {
    script,
    estimatedDuration: script.totalDuration,
    sceneCount: script.scenes.length,
  };
}

function buildScriptPrompt(
  request: VideoGenerationRequest,
  config: typeof VIDEO_TYPE_CONFIG[VideoType],
  targetDuration: number
): string {
  let prompt = `Create a ${config.name} script about: "${request.topic}"

VIDEO SPECS:
- Type: ${config.name}
- Target Duration: ${targetDuration} seconds
- Aspect Ratio: ${config.aspectRatio}
- Scene Count: ${config.sceneCount.min}-${config.sceneCount.max} scenes
- Tone: ${request.tone || "educational"}

`;

  if (request.sourceContent) {
    prompt += `SOURCE CONTENT TO REFERENCE:
"""
${request.sourceContent.slice(0, 2000)}
"""

Use this content as the basis for the script, but adapt it for video format.

`;
  }

  if (request.style) {
    prompt += `STYLE PREFERENCES:
- Visual Style: ${request.style.visualStyle || "cinematic"}
- Include Text Overlays: ${request.style.includeTextOverlays !== false ? "Yes" : "No"}
- Music Mood: ${request.style.musicMood || "inspiring"}

`;
  }

  prompt += `REQUIREMENTS:
1. Hook must grab attention in the first 3 seconds
2. Each scene's narration should be natural spoken language
3. Visual descriptions must be detailed enough for AI video generation
4. Keep text overlays short (3-5 words max)
5. End with a clear call to action
6. Total duration should be approximately ${targetDuration} seconds

Generate the complete script as a JSON object.`;

  return prompt;
}

function processScript(data: any, videoType: VideoType): VideoScript {
  const config = VIDEO_TYPE_CONFIG[videoType];
  
  // Generate scene IDs and calculate timing
  let currentTime = 0;
  const scenes: Scene[] = data.scenes.map((scene: any, index: number) => {
    const processedScene: Scene = {
      id: `scene_${index + 1}`,
      order: index + 1,
      status: "pending",
      narration: scene.narration,
      visualDescription: scene.visualDescription,
      textOverlay: scene.textOverlay,
      duration: scene.duration || 5,
      startTime: currentTime,
      visualStyle: scene.visualStyle || "cinematic",
      cameraMovement: scene.cameraMovement || "slow_pan",
    };
    
    currentTime += processedScene.duration;
    return processedScene;
  });

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

  return {
    hook: data.hook,
    scenes,
    callToAction: data.callToAction,
    totalDuration,
  };
}

/**
 * Generate a YouTube-optimized title and description
 */
export async function generateVideoMetadata(
  script: VideoScript,
  topic: string,
  videoType: VideoType
): Promise<{
  title: string;
  description: string;
  tags: string[];
}> {
  const prompt = `Generate YouTube metadata for a ${VIDEO_TYPE_CONFIG[videoType].name} video.

TOPIC: ${topic}

SCRIPT HOOK: ${script.hook}

CALL TO ACTION: ${script.callToAction}

Generate:
1. A compelling, SEO-optimized title (max 70 characters)
2. A description with timestamps placeholder, key points, and CTA (max 500 words)
3. 10-15 relevant tags for YouTube SEO

Target audience: Truck drivers, owner-operators, small fleet owners interested in health and business

Return as JSON:
{
  "title": "...",
  "description": "...",
  "tags": ["tag1", "tag2", ...]
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to extract JSON");
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Refine a single scene's visual description for better video generation
 */
export async function refineVisualPrompt(
  visualDescription: string,
  aspectRatio: "16:9" | "9:16" | "1:1"
): Promise<string> {
  const prompt = `Enhance this video generation prompt for a ${aspectRatio} trucking/health video:

"${visualDescription}"

Requirements:
- Be specific about lighting, camera angle, movement
- Include atmospheric details (time of day, weather)
- Focus on trucks, highways, healthy food, or dashboard elements
- NO human faces (use silhouettes, hands, or over-shoulder shots)
- Make it cinematic and professional

Return only the enhanced prompt, no explanation.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  return content.text.trim();
}
