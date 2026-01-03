import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { transcribeAudio, TranscriptionResult } from "@/lib/audio/deepgram";
import { extractContent, generateBulkContent, Extraction, Platform } from "@/lib/ai/claude";
import { getGammaClient } from "@/lib/gamma/client";

export const maxDuration = 300; // 5 minutes for long audio files

/**
 * POST /api/process
 * 
 * Process a source through the full pipeline:
 * 1. Transcribe (if audio)
 * 2. Extract content pieces
 * 3. Generate platform content
 * 4. Generate visuals (Gamma)
 * 
 * Can be triggered manually or by webhook from ingestion
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceId, steps = ["transcribe", "extract", "generate", "visuals"] } = body;

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
      visualsGenerated?: number;
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

    // ====== STEP 4: GENERATE VISUALS ======
    if (steps.includes("visuals")) {
      console.log(`[Process] Generating visuals for source ${sourceId}...`);
      
      await prisma.source.update({
        where: { id: sourceId },
        data: { status: "generating_visuals" }
      });

      // Get generated content without media
      const contentNeedingVisuals = await prisma.generatedContent.findMany({
        where: {
          extraction: { sourceId: sourceId },
          mediaUrl: null,
        },
        include: {
          extraction: true
        }
      });

      let visualsCount = 0;
      const gamma = getGammaClient();

      // Types that benefit from visuals
      const visualTypes = ["quote", "stat", "hot_take", "story", "testimonial", "teaser"];

      for (const content of contentNeedingVisuals) {
        // Skip types that don't need visuals (clips use video)
        if (!content.extraction || !visualTypes.includes(content.extraction.type)) {
          continue;
        }

        // Only generate one visual per extraction (reuse across platforms)
        // Check if sibling content already has a visual
        const siblingWithVisual = await prisma.generatedContent.findFirst({
          where: {
            extractionId: content.extractionId,
            mediaUrl: { not: null }
          }
        });

        if (siblingWithVisual?.mediaUrl) {
          // Reuse existing visual
          await prisma.generatedContent.update({
            where: { id: content.id },
            data: { mediaUrl: siblingWithVisual.mediaUrl }
          });
          visualsCount++;
          continue;
        }

        try {
          // Build prompt for Gamma
          const visualPrompt = buildVisualPrompt(
            content.extraction.type,
            content.extraction.text,
            content.platform
          );

          console.log(`[Process] Generating Gamma visual for ${content.id}...`);
          
          const result = await gamma.generateAndWait({
            inputText: visualPrompt,
            outputType: "social",
            imageOptions: {
              source: "aiGenerated",
              style: "photorealistic",
            },
            textOptions: {
              amount: "brief",
              tone: "direct, confident",
              audience: "professional drivers",
            }
          });

          if (result.gammaUrl) {
            // Update this content and siblings with same extraction
            await prisma.generatedContent.updateMany({
              where: { extractionId: content.extractionId },
              data: { mediaUrl: result.gammaUrl }
            });
            visualsCount++;
            console.log(`[Process] Visual generated: ${result.gammaUrl}`);
          }

          // Rate limit: wait between generations
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          console.error(`[Process] Visual generation failed for ${content.id}:`, error);
          // Continue with other content
        }
      }

      results.visualsGenerated = visualsCount;
      console.log(`[Process] Generated ${visualsCount} visuals`);
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
 * Build a visual prompt for Gamma based on content type
 */
function buildVisualPrompt(type: string, text: string, platform: string): string {
  const baseStyle = "Bold, professional social media graphic for professional truck drivers. Dark background with high contrast text.";
  
  switch (type) {
    case "quote":
      return `${baseStyle}
      
Create a powerful quote graphic with this quote:
"${text}"

Style: Inspirational quote card, large bold text, trucking/highway imagery in background, Let's Truck branding.
Format: Square for ${platform}`;

    case "stat":
      return `${baseStyle}
      
Create an eye-catching statistic graphic:
${text}

Style: Data visualization feel, big bold numbers, clean modern design, health/wellness theme.
Format: Square for ${platform}`;

    case "hot_take":
      return `${baseStyle}
      
Create a provocative statement graphic:
"${text}"

Style: Bold, attention-grabbing, slightly controversial feel, uses strong typography.
Format: Square for ${platform}`;

    case "story":
    case "testimonial":
      return `${baseStyle}
      
Create a story/testimonial graphic with this message:
${text}

Style: Warm, authentic feel, could include a silhouette of a truck driver, personal transformation theme.
Format: Square for ${platform}`;

    case "teaser":
      return `${baseStyle}
      
Create a teaser/preview graphic:
${text}

Style: Mysterious, creates curiosity, "coming soon" or "learn more" feel.
Format: Square for ${platform}`;

    default:
      return `${baseStyle}

Create a social media graphic with this content:
${text}

Style: Professional, clean, health and trucking themed.
Format: Square for ${platform}`;
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

  // Count content with visuals
  const contentWithVisuals = await prisma.generatedContent.count({
    where: {
      extraction: { sourceId: sourceId },
      mediaUrl: { not: null }
    }
  });

  return NextResponse.json({
    sourceId: source.id,
    status: source.status,
    errorMessage: source.errorMessage,
    transcripts: source._count.transcripts,
    extractions: source._count.extractions,
    generatedContent: totalGenerated,
    visualsGenerated: contentWithVisuals,
    needsTranscription: source.needsTranscription,
    needsExtraction: source.needsExtraction,
  });
}
