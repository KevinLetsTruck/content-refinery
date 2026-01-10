import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import prisma from "@/lib/db/prisma";
import { extractText } from "unpdf";

export const runtime = 'nodejs';

const anthropic = new Anthropic();

const EXTRACTION_PROMPT = `You are analyzing content from a PDF guide for Let's Truck, a health coaching brand for professional truck drivers.

Based on the text content provided below, extract the following and return ONLY valid JSON:

{
  "title": "Main title of the guide",
  "subtitle": "Subtitle or tagline if present",
  "summary": "2-3 sentence summary of what the guide covers",
  "keyMessages": ["5-7 most important points that could become social posts - specific, provocative, quotable"],
  "stats": ["Any statistics or numbers mentioned"],
  "hooks": ["Compelling headlines or attention-grabbing phrases"],
  "chapters": ["Main sections/chapters of the guide"]
}

Focus on content that would make compelling social media posts for truck drivers.

PDF CONTENT:
`;

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
 * Extract text from PDF buffer using unpdf library
 * unpdf is a modern, serverless-friendly PDF parser
 */
async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  try {
    // Convert Buffer to Uint8Array for unpdf compatibility
    const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const { text } = await extractText(uint8Array, { mergePages: true });

    // Clean up the extracted text
    const cleanedText = (text || "")
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    if (!cleanedText || cleanedText.length < 100) {
      return "Unable to extract meaningful text from PDF. The PDF may be image-based or encrypted.";
    }

    return cleanedText;
  } catch (error) {
    console.error("[PDF Parse] Error extracting text:", error);
    return "Failed to parse PDF. The file may be corrupted or use an unsupported format.";
  }
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

    let pdfBuffer: Buffer;
    let leadMagnet: { id: string; title: string } | null = null;

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

      leadMagnet = { id: lm.id, title: lm.title };

      // Fetch the PDF from the URL
      console.log(`[Lead Magnet Extract] Fetching PDF from: ${lm.fileUrl}`);
      const pdfResponse = await fetch(lm.fileUrl);

      if (!pdfResponse.ok) {
        return NextResponse.json(
          { error: `Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText}` },
          { status: 502 }
        );
      }

      const arrayBuffer = await pdfResponse.arrayBuffer();
      pdfBuffer = Buffer.from(arrayBuffer);

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

      const arrayBuffer = await pdfResponse.arrayBuffer();
      pdfBuffer = Buffer.from(arrayBuffer);

    } else {
      // Use provided base64 data
      pdfBuffer = Buffer.from(pdfBase64, 'base64');
    }

    // Extract text from PDF
    console.log(`[Lead Magnet Extract] Extracting text from PDF (${pdfBuffer.length} bytes)`);
    const pdfText = await extractTextFromPdfBuffer(pdfBuffer);

    // Truncate if too long (Claude has context limits)
    const maxChars = 100000;
    const truncatedText = pdfText.length > maxChars
      ? pdfText.substring(0, maxChars) + "\n\n[Content truncated...]"
      : pdfText;

    console.log(`[Lead Magnet Extract] Extracted ${pdfText.length} chars, sending to Claude`);

    // Call Claude API with the extracted text
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: EXTRACTION_PROMPT + truncatedText,
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
