import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import prisma from "@/lib/db/prisma";

export const runtime = 'nodejs';

const anthropic = new Anthropic();

const EXTRACTION_PROMPT = `You are analyzing a PDF guide for Let's Truck, a health coaching brand for professional truck drivers.

Extract the following and return ONLY valid JSON:

{
  "title": "Main title of the guide",
  "subtitle": "Subtitle or tagline if present",
  "summary": "2-3 sentence summary of what the guide covers",
  "keyMessages": ["5-7 most important points that could become social posts - specific, provocative, quotable"],
  "stats": ["Any statistics or numbers mentioned"],
  "hooks": ["Compelling headlines or attention-grabbing phrases"],
  "chapters": ["Main sections/chapters of the guide"]
}

Focus on content that would make compelling social media posts for truck drivers.`;

interface ExtractedData {
  title: string;
  subtitle: string | null;
  summary: string;
  keyMessages: string[];
  stats: string[];
  hooks: string[];
  chapters: string[];
}

/**
 * POST /api/lead-magnets/extract
 * Extract campaign content from a PDF using Claude AI
 *
 * Accepts one of:
 * - { leadMagnetId: string } - Extract from an existing lead magnet
 * - { pdfUrl: string } - Extract from a PDF URL
 * - { pdfBase64: string, mediaType?: string } - Extract from base64 encoded PDF
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadMagnetId, pdfUrl, pdfBase64 } = body;

    // Validate input - need exactly one source
    const sourceCount = [leadMagnetId, pdfUrl, pdfBase64].filter(Boolean).length;
    if (sourceCount === 0) {
      return NextResponse.json(
        { error: "One of leadMagnetId, pdfUrl, or pdfBase64 is required" },
        { status: 400 }
      );
    }
    if (sourceCount > 1) {
      return NextResponse.json(
        { error: "Provide only one of leadMagnetId, pdfUrl, or pdfBase64" },
        { status: 400 }
      );
    }

    let base64Data: string;
    let mediaType: string = "application/pdf";
    let leadMagnet: { id: string } | null = null;

    // Get PDF data based on input type
    if (leadMagnetId) {
      // Fetch lead magnet from database
      const lm = await prisma.leadMagnet.findUnique({
        where: { id: leadMagnetId },
      });

      if (!lm) {
        return NextResponse.json(
          { error: "Lead magnet not found" },
          { status: 404 }
        );
      }

      if (!lm.fileUrl) {
        return NextResponse.json(
          { error: "Lead magnet has no file URL" },
          { status: 400 }
        );
      }

      leadMagnet = { id: lm.id };
      mediaType = lm.fileType || "application/pdf";

      // Fetch the PDF from the URL
      console.log(`[Lead Magnet Extract] Fetching PDF from: ${lm.fileUrl}`);
      const pdfResponse = await fetch(lm.fileUrl);

      if (!pdfResponse.ok) {
        return NextResponse.json(
          { error: `Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText}` },
          { status: 502 }
        );
      }

      const pdfBuffer = await pdfResponse.arrayBuffer();
      base64Data = Buffer.from(pdfBuffer).toString("base64");

    } else if (pdfUrl) {
      // Fetch PDF from provided URL
      console.log(`[Lead Magnet Extract] Fetching PDF from URL: ${pdfUrl}`);
      const pdfResponse = await fetch(pdfUrl);

      if (!pdfResponse.ok) {
        return NextResponse.json(
          { error: `Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText}` },
          { status: 502 }
        );
      }

      // Try to get content type from response
      const contentType = pdfResponse.headers.get("content-type");
      if (contentType) {
        mediaType = contentType.split(";")[0].trim();
      }

      const pdfBuffer = await pdfResponse.arrayBuffer();
      base64Data = Buffer.from(pdfBuffer).toString("base64");

    } else {
      // Use provided base64 data
      base64Data = pdfBase64;
      if (body.mediaType) {
        mediaType = body.mediaType;
      }
    }

    console.log(`[Lead Magnet Extract] Calling Claude API with ${mediaType} document`);

    // Call Claude API with the PDF as a document
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: mediaType as "application/pdf",
                data: base64Data,
              },
            },
            {
              type: "text",
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    // Extract text from response
    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );

    if (!textBlock?.text) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Parse JSON from response - handle markdown code blocks
    let jsonText = textBlock.text.trim();

    // Remove markdown code block if present
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.slice(7);
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith("```")) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    let extractedData: ExtractedData;
    try {
      extractedData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("[Lead Magnet Extract] Failed to parse JSON:", jsonText);
      return NextResponse.json(
        {
          error: "Failed to parse AI response as JSON",
          rawResponse: textBlock.text,
        },
        { status: 500 }
      );
    }

    // If leadMagnetId was provided, update the record
    if (leadMagnet) {
      await prisma.leadMagnet.update({
        where: { id: leadMagnet.id },
        data: {
          extractedData: extractedData as object,
          extractedText: extractedData.summary || null,
        },
      });
      console.log(`[Lead Magnet Extract] Updated lead magnet ${leadMagnet.id} with extracted data`);
    }

    return NextResponse.json({
      success: true,
      extractedData,
    });

  } catch (error) {
    console.error("[Lead Magnet Extract] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to extract content: ${errorMessage}` },
      { status: 500 }
    );
  }
}
