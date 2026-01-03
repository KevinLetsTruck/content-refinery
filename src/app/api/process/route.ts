import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { transcribeAudio, TranscriptionResult } from "@/lib/audio/deepgram";
import { extractContent, generateBulkContent, Extraction, Platform } from "@/lib/ai/claude";

export const maxDuration = 300; // 5 minutes for long audio files

/**
 * POST /api/process
 * 
 * Process a source through the full pipeline:
 * 1. Transcribe (if audio)
 * 2. Extract content pieces
 * 3. Generate platform content
 * 
 * Can be triggered manually or by webhook from ingestion
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceId, steps = ["transcribe", "extract", "generate"] } = body;

    if (!sourceId) {
      return NextResponse.json(
        { error: "sourceId is required" },
        { status: 400 }
      );
    }

    // Get the source
    const source = await prisma.source.findUnique({
      where: { id: sourceId },
      include: {
        sourceApp: true,
        transcripts: true,
        extractions: {
          include: { generatedContent: true }
        }
      }
    });

    if (!source) {
      return NextResponse.json(
        { error: "Source not found" },
        { status: 404 }
      );
    }

    const results: {
      transcription?: TranscriptionResult;
      extractions?: Extraction[];
      generatedContent?: number;
    } = {};

    // ====== STEP 1: TRANSCRIPTION ======
    if (steps.includes("transcribe") && source.needsTranscription && source.fileUrl) {
      console.log(`[Process] Transcribing source ${sourceId}...`);
      
      await prisma.source.update({
        where: { id: sourceId },
        data: { status: "transcribing" }
      });

      try {
        const transcriptionResult = await transcribeAudio(source.fileUrl);
        
        // Save transcript to database
        await prisma.transcript.create({
          data: {
            sourceId: sourceId,
            fullText: transcriptionResult.text,
            wordTimestamps: transcriptionResult.words,
            speakerSegments: transcriptionResult.speakers,
          }
        });

        // Update source
        await prisma.source.update({
          where: { id: sourceId },
          data: {
            needsTranscription: false,
            durationSeconds: Math.round(transcriptionResult.duration),
            status: "transcribed"
          }
        });

        results.transcription = transcriptionResult;
        console.log(`[Process] Transcription complete: ${transcriptionResult.text.length} chars`);
      } catch (error) {
        console.error("[Process] Transcription failed:", error);
        await prisma.source.update({
          where: { id: sourceId },
          data: { 
            status: "failed",
            errorMessage: `Transcription failed: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        });
        throw error;
      }
    }

    // ====== STEP 2: EXTRACTION ======
    if (steps.includes("extract") && source.needsExtraction) {
      console.log(`[Process] Extracting content from source ${sourceId}...`);
      
      await prisma.source.update({
        where: { id: sourceId },
        data: { status: "extracting" }
      });

      // Get transcript (either from DB or raw data)
      let textToExtract = "";
      
      const transcript = await prisma.transcript.findFirst({
        where: { sourceId: sourceId }
      });
      
      if (transcript) {
        textToExtract = transcript.fullText;
      } else if (source.rawData && typeof source.rawData === "object") {
        // Try to get text from raw data (for text sources)
        const rawData = source.rawData as Record<string, unknown>;
        textToExtract = (rawData.text as string) || 
                       (rawData.transcript as string) || 
                       (rawData.content as string) || 
                       "";
      }

      if (!textToExtract) {
        console.warn("[Process] No text to extract from");
        await prisma.source.update({
          where: { id: sourceId },
          data: { 
            status: "failed",
            errorMessage: "No text content found for extraction"
          }
        });
        return NextResponse.json(
          { error: "No text content found for extraction" },
          { status: 400 }
        );
      }

      try {
        const extractions = await extractContent(textToExtract);
        
        // Save extractions to database
        for (const extraction of extractions) {
          await prisma.extraction.create({
            data: {
              sourceId: sourceId,
              transcriptId: transcript?.id,
              type: extraction.type,
              text: extraction.text,
              startTime: extraction.startTime,
              endTime: extraction.endTime,
              confidence: extraction.confidence,
              productIds: extraction.productMentions || [],
            }
          });
        }

        // Update source
        await prisma.source.update({
          where: { id: sourceId },
          data: {
            needsExtraction: false,
            status: "extracted"
          }
        });

        results.extractions = extractions;
        console.log(`[Process] Extracted ${extractions.length} content pieces`);
      } catch (error) {
        console.error("[Process] Extraction failed:", error);
        await prisma.source.update({
          where: { id: sourceId },
          data: { 
            status: "failed",
            errorMessage: `Extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        });
        throw error;
      }
    }

    // ====== STEP 3: GENERATE PLATFORM CONTENT ======
    if (steps.includes("generate")) {
      console.log(`[Process] Generating platform content for source ${sourceId}...`);
      
      // Get extractions that don't have generated content yet
      const extractionsToProcess = await prisma.extraction.findMany({
        where: {
          sourceId: sourceId,
          generatedContent: { none: {} }
        },
        orderBy: { confidence: "desc" },
        take: 10 // Limit to top 10 extractions
      });

      const platforms: Platform[] = ["twitter", "instagram", "facebook"];
      let generatedCount = 0;

      for (const extraction of extractionsToProcess) {
        try {
          const generated = await generateBulkContent(
            {
              type: extraction.type as any,
              text: extraction.text,
              startTime: extraction.startTime?.toNumber(),
              endTime: extraction.endTime?.toNumber(),
              confidence: extraction.confidence.toNumber(),
            },
            platforms
          );

          // Save generated content
          for (const content of generated) {
            await prisma.generatedContent.create({
              data: {
                extractionId: extraction.id,
                platform: content.platform,
                text: content.text,
                hashtags: content.hashtags || [],
                mediaGuidance: content.mediaGuidance,
                status: "pending", // Goes to review queue
              }
            });
            generatedCount++;
          }
        } catch (error) {
          console.error(`[Process] Failed to generate content for extraction ${extraction.id}:`, error);
          // Continue with other extractions
        }
      }

      results.generatedContent = generatedCount;
      console.log(`[Process] Generated ${generatedCount} content pieces`);
    }

    // Update final status
    await prisma.source.update({
      where: { id: sourceId },
      data: { status: "completed" }
    });

    return NextResponse.json({
      success: true,
      sourceId,
      results
    });

  } catch (error) {
    console.error("[Process] Pipeline error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Processing failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/process?sourceId=xxx
 * 
 * Check processing status
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sourceId = searchParams.get("sourceId");

  if (!sourceId) {
    return NextResponse.json(
      { error: "sourceId is required" },
      { status: 400 }
    );
  }

  const source = await prisma.source.findUnique({
    where: { id: sourceId },
    include: {
      _count: {
        select: {
          transcripts: true,
          extractions: true,
        }
      },
      extractions: {
        include: {
          _count: {
            select: { generatedContent: true }
          }
        }
      }
    }
  });

  if (!source) {
    return NextResponse.json(
      { error: "Source not found" },
      { status: 404 }
    );
  }

  const totalGenerated = source.extractions.reduce(
    (sum, e) => sum + e._count.generatedContent, 
    0
  );

  return NextResponse.json({
    sourceId: source.id,
    status: source.status,
    errorMessage: source.errorMessage,
    transcripts: source._count.transcripts,
    extractions: source._count.extractions,
    generatedContent: totalGenerated,
    needsTranscription: source.needsTranscription,
    needsExtraction: source.needsExtraction,
  });
}
