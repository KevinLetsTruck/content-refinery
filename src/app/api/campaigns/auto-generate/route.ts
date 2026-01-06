import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Extract URL from text (supports __url__ format or plain URLs)
function extractUrl(text: string): string | null {
  // Check for __url__ format first
  const wrappedMatch = text.match(/__([^_]+)__/);
  if (wrappedMatch) {
    return wrappedMatch[1];
  }
  
  // Check for plain URL
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  if (urlMatch) {
    return urlMatch[0];
  }
  
  return null;
}

// Extract the instruction part (everything except the URL)
function extractInstruction(text: string, url: string): string {
  return text
    .replace(/__[^_]+__/g, "")
    .replace(url, "")
    .trim();
}

// Fetch URL content with multiple strategies
async function fetchUrlContent(url: string): Promise<string> {
  // Try fetching directly first
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ContentRefinery/1.0)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // Basic HTML to text extraction
    const text = html
      // Remove scripts and styles
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      // Remove HTML tags
      .replace(/<[^>]+>/g, " ")
      // Decode HTML entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Clean up whitespace
      .replace(/\s+/g, " ")
      .trim();
    
    // Limit to ~50k chars to avoid token limits
    return text.slice(0, 50000);
  } catch (error) {
    console.error("Direct fetch failed:", error);
    throw new Error(`Could not fetch URL: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json();
    
    if (!input || typeof input !== "string") {
      return NextResponse.json(
        { error: "Input text is required" },
        { status: 400 }
      );
    }
    
    // Extract URL and instruction
    const url = extractUrl(input);
    if (!url) {
      return NextResponse.json(
        { error: "No URL found. Include a URL in your input (e.g., https://example.com or __https://example.com__)" },
        { status: 400 }
      );
    }
    
    const instruction = extractInstruction(input, url);
    
    // Fetch URL content
    let urlContent: string;
    try {
      urlContent = await fetchUrlContent(url);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to fetch URL" },
        { status: 400 }
      );
    }
    
    if (urlContent.length < 100) {
      return NextResponse.json(
        { error: "Could not extract meaningful content from URL" },
        { status: 400 }
      );
    }

    // Use Claude to analyze and generate campaign
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: `You are an expert content strategist for Let's Truck, a health and wellness platform for professional truck drivers (owner-operators).

Your job is to analyze source material and create a compelling social media campaign.

AUDIENCE: Professional truck drivers (owner-operators) who:
- Spend long hours on the road
- Face unique health challenges (sitting, irregular sleep, limited food options)
- Are skeptical of mainstream medicine
- Value practical, no-BS advice
- Respond to data and real evidence

VOICE: Direct, no-BS, anti-establishment. Like Kevin Rutherford (FNTP):
- Uses trucking industry vernacular ("driver", "owner-operator", not "trucker")
- Pro-functional health, skeptical of big pharma
- Data-driven but accessible
- Can be confrontational when needed

CAMPAIGN STRUCTURE OPTIONS:
- product_launch: Tease → Announce → Educate → Social Proof → Urgency (10-14 days)
- educational_series: Hook → Foundation → Deep Dives → Integration → CTA (5-7 days)
- custom: Flexible structure

When analyzing the source material:
1. Extract key claims and statistics
2. Identify controversial or surprising findings
3. Find angles that resonate with truckers specifically
4. Generate compelling key messages

Return a JSON object with:
{
  "summary": "Brief summary of the source material (2-3 sentences)",
  "keyFindings": ["array of 3-5 key findings/claims from the source"],
  "campaign": {
    "name": "Suggested campaign name",
    "campaignType": "product_launch" | "educational_series" | "custom",
    "goal": "email_signups" | "sales" | "awareness" | "engagement",
    "productName": "If promoting something, what is it?",
    "keyMessages": ["Message 1 tailored for truckers", "Message 2", "Message 3"],
    "suggestedDuration": number (days),
    "angles": ["Different content angles to explore"],
    "hooks": ["Attention-grabbing hooks for posts"]
  }
}`,
      messages: [
        {
          role: "user",
          content: `INSTRUCTION FROM USER:
${instruction || "Create a comprehensive educational campaign from this content"}

SOURCE URL: ${url}

SOURCE CONTENT:
${urlContent.slice(0, 30000)}

Analyze this content and generate a campaign strategy tailored for professional truck drivers.`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    // Parse the JSON response
    let result;
    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      result = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content.text);
      return NextResponse.json(
        { error: "Failed to parse AI analysis" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url,
      instruction,
      ...result,
    });
  } catch (error) {
    console.error("Auto-generate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate campaign" },
      { status: 500 }
    );
  }
}
