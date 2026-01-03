import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { BRAND_TERMINOLOGY_RULES, BRAND_VOICE_CHARACTERISTICS } from "@/lib/gamma/brand-rules";

const anthropic = new Anthropic();

interface ContentOption {
  id: string;
  text: string;
  type: string;
  emotion: string;
  cta: string;
  hashtags: string[];
}

const SYSTEM_PROMPT = `You are a social media content generator for Let's Truck Health Coaching, founded by Kevin Rutherford, FNTP. You create content specifically for professional drivers (NOT "truckers" - NEVER use that word).

${BRAND_TERMINOLOGY_RULES}

${BRAND_VOICE_CHARACTERISTICS}

When generating content:
1. Create 3 distinct variations with different angles
2. Each should be 2-4 short paragraphs max
3. Use line breaks for readability
4. Include specific stats/facts when provided
5. End with a clear call to action
6. Generate relevant hashtags (5-7 per post)

Content types to create:
- stat: Lead with a striking statistic
- hook: Start with a provocative question
- educational: Explain with authority

Respond in JSON format with an array of options.
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceContent, interviewData } = body;

    if (!sourceContent) {
      return NextResponse.json(
        { error: "sourceContent is required" },
        { status: 400 }
      );
    }

    const userPrompt = buildPrompt(sourceContent, interviewData);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    // Extract text from response
    const textBlock = response.content.find((block) => block.type === "text");
    const rawText = textBlock ? textBlock.text : "";

    // Parse JSON from response
    let options: ContentOption[] = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        options = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("[Generate] Failed to parse JSON:", parseError);
      // Fall back to mock data
      options = generateFallbackOptions(sourceContent, interviewData);
    }

    // Ensure proper IDs
    options = options.map((opt, index) => ({
      ...opt,
      id: `option-${index + 1}`,
    }));

    return NextResponse.json({ options });
  } catch (error) {
    console.error("[Generate] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function buildPrompt(sourceContent: string, interviewData?: any): string {
  let prompt = `Create 3 social media content variations based on this idea:\n\n"${sourceContent}"`;

  if (interviewData) {
    if (interviewData.targetEmotion) {
      prompt += `\n\nTarget emotion: ${interviewData.targetEmotion}`;
    }
    if (interviewData.supportingEvidence) {
      prompt += `\nSupporting evidence/stat: ${interviewData.supportingEvidence}`;
    }
    if (interviewData.callToAction) {
      prompt += `\nCall to action: ${interviewData.callToAction}`;
    }
    if (interviewData.targetAudience) {
      prompt += `\nTarget audience: ${interviewData.targetAudience}`;
    }
  }

  prompt += `

Return a JSON array with 3 objects, each containing:
- text: The full post content (use \\n for line breaks)
- type: "stat", "hook", or "educational"
- emotion: The primary emotion it evokes
- cta: The call to action
- hashtags: Array of 5-7 relevant hashtags

REMEMBER: Never use "trucker" or "truckers" - use "driver", "professional driver", "O/O", or "The Tribe" instead.`;

  return prompt;
}

function generateFallbackOptions(sourceContent: string, interviewData?: any): ContentOption[] {
  const evidence = interviewData?.supportingEvidence || "";
  const emotion = interviewData?.targetEmotion || "empowerment";
  
  return [
    {
      id: "option-1",
      text: `${sourceContent}\n\n${evidence ? evidence + "\n\n" : ""}Your body is your rig. Time to start treating it like one.`,
      type: "stat",
      emotion: emotion,
      cta: "Learn more",
      hashtags: ["#LetsTruck", "#DriverHealth", "#GutHealth", "#OwnerOperator", "#TheTribe"],
    },
    {
      id: "option-2",
      text: `Why do professional drivers struggle more than everyone else?\n\n${evidence ? evidence + "\n\n" : ""}The answer isn't what you think.`,
      type: "hook",
      emotion: "curiosity",
      cta: "Read more",
      hashtags: ["#LetsTruck", "#ProperHumanDiet", "#DriverWellness", "#HealthCoaching"],
    },
    {
      id: "option-3",
      text: `I've worked with hundreds of professional drivers.\n\n${evidence ? evidence + "\n\n" : ""}The conventional health industry doesn't understand what you face. But I do.\n\nYou're the owner-operator of your own health. Time to take back control.`,
      type: "educational",
      emotion: "empowerment",
      cta: "Get started",
      hashtags: ["#LetsTruck", "#FNTP", "#OwnerOperator", "#TakeBackControl", "#TheTribe"],
    },
  ];
}
