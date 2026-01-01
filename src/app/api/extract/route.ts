import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { extractContent } from "@/lib/ai/claude";
import { Decimal } from "@prisma/client/runtime/library";

// POST /api/extract - Extract content pieces from a transcript
export async function POST(request: NextRequest) {
  try {
    const { sourceId, transcriptId } = await request.json();

    if (!sourceId) {
      return NextResponse.json(
        { error: "sourceId is required" },
        { status: 400 }
      );
    }

    // Get the transcript
    let transcript;
    
    if (transcriptId) {
      transcript = await prisma.transcript.findUnique({
        where: { id: transcriptId },
      });
      
      if (!transcript) {
        return NextResponse.json(
          { error: "Transcript not found" },
          { status: 404 }
        );
      }
    } else {
      // Get the most recent transcript for this source
      transcript = await prisma.transcript.findFirst({
        where: { sourceId },
        orderBy: { createdAt: "desc" },
      });

      if (!transcript) {
        return NextResponse.json(
          { error: "No transcript found for this source" },
          { status: 404 }
        );
      }
    }

    console.log(`Extracting content from transcript ${transcript.id}...`);
    
    // Extract content using Claude
    const extractions = await extractContent(transcript.fullText);

    if (!extractions || extractions.length === 0) {
      return NextResponse.json({
        message: "No content pieces extracted",
        extractions: [],
      });
    }

    // Save extractions to database
    const savedExtractions = await prisma.extraction.createMany({
      data: extractions.map((extraction) => ({
        sourceId,
        transcriptId: transcript.id,
        type: extraction.type,
        text: extraction.text,
        startTime: extraction.startTime ? new Decimal(extraction.startTime) : null,
        endTime: extraction.endTime ? new Decimal(extraction.endTime) : null,
        confidence: new Decimal(extraction.confidence),
        productIds: extraction.productMentions || [],
      })),
    });

    // Fetch the created extractions to return
    const createdExtractions = await prisma.extraction.findMany({
      where: { sourceId, transcriptId: transcript.id },
      orderBy: { confidence: "desc" },
    });

    return NextResponse.json({
      message: `Extracted ${createdExtractions.length} content pieces`,
      extractions: createdExtractions,
    });
  } catch (error) {
    console.error("Extraction error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Extraction failed" },
      { status: 500 }
    );
  }
}

// GET /api/extract - List extractions for a source
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const sourceId = searchParams.get("sourceId");
    const type = searchParams.get("type");
    const minConfidence = parseFloat(searchParams.get("minConfidence") || "0");

    const extractions = await prisma.extraction.findMany({
      where: {
        ...(sourceId ? { sourceId } : {}),
        ...(type ? { type } : {}),
        ...(minConfidence > 0 ? { confidence: { gte: new Decimal(minConfidence) } } : {}),
      },
      orderBy: { confidence: "desc" },
    });

    return NextResponse.json({ extractions });
  } catch (error) {
    console.error("Error fetching extractions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
