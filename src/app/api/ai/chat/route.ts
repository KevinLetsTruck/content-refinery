import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { BRAND_TERMINOLOGY_RULES, BRAND_VOICE_CHARACTERISTICS } from "@/lib/gamma/brand-rules";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are an AI assistant helping Kevin Rutherford create social media content for Let's Truck Health Coaching. You specialize in content for professional drivers.

${BRAND_TERMINOLOGY_RULES}

${BRAND_VOICE_CHARACTERISTICS}

Your role in the Content Creation Wizard:
- Help users brainstorm content ideas
- Suggest improvements to their messages
- Recommend platforms based on content type
- Answer questions about best practices
- Keep responses concise and actionable (2-3 sentences max unless asked for more)

You are direct, helpful, and speak with Kevin's voice - no-BS, pro-driver, anti-establishment.
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context } = body;

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    // Build context for the AI
    let contextInfo = "";
    if (context) {
      if (context.currentStep) {
        contextInfo += `\nUser is on Step ${context.currentStep} of the wizard.`;
      }
      if (context.sourceContent) {
        contextInfo += `\nTheir content idea: "${context.sourceContent}"`;
      }
      if (context.selectedContentId && context.contentOptions) {
        const selected = context.contentOptions.find((o: any) => o.id === context.selectedContentId);
        if (selected) {
          contextInfo += `\nThey selected this content: "${selected.text}"`;
        }
      }
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `${contextInfo ? `Context: ${contextInfo}\n\n` : ""}User question: ${message}`,
        },
      ],
    });

    // Extract text from response
    const textBlock = response.content.find((block) => block.type === "text");
    const aiMessage = textBlock ? textBlock.text : "I'm here to help!";

    // Generate suggestions based on the response
    const suggestions = generateSuggestions(context?.currentStep, message);

    return NextResponse.json({
      message: aiMessage,
      suggestions,
    });
  } catch (error) {
    console.error("[AI Chat] Error:", error);
    return NextResponse.json(
      { 
        message: "I had trouble processing that. Try asking differently?",
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

function generateSuggestions(step?: number, message?: string): string[] {
  // Generate contextual follow-up suggestions
  switch (step) {
    case 1:
      return ["What's trending?", "Show me content gaps", "Suggest a topic"];
    case 2:
      return ["Make it stronger", "Different angle", "Add urgency"];
    case 3:
      return ["Make it edgier", "Shorter version", "More stats"];
    case 4:
      return ["Best platforms?", "Skip any?", "Why LinkedIn?"];
    case 5:
      return ["Different style", "Larger text", "More dramatic"];
    case 6:
      return ["Check hashtags", "Any issues?", "Improve CTA"];
    case 7:
      return ["Best time?", "Posting frequency?", "Schedule tips"];
    default:
      return ["Help me create", "What should I post?", "Show examples"];
  }
}
