import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

// ============================================
// INGESTION PAYLOAD SCHEMA
// ============================================

const IngestPayloadSchema = z.object({
  // Required fields
  source: z.string().min(1), // audioroad, health-coaching, trucktales
  contentType: z.string().min(1), // episode, success_story, chapter_teaser, etc.
  title: z.string().min(1),
  
  // Content - at least one required
  audioUrl: z.string().url().optional(),
  transcript: z.string().optional(),
  text: z.string().optional(),
  data: z.record(z.any()).optional(), // Flexible structured data
  
  // Optional metadata
  metadata: z.record(z.any()).optional(),
});

type IngestPayload = z.infer<typeof IngestPayloadSchema>;

// ============================================
// CONTENT TYPE ROUTING
// ============================================

interface ProcessingConfig {
  sourceType: "audio" | "text" | "structured";
  needsTranscription: boolean;
  needsExtraction: boolean;
  extractionTypes: string[];
}

const CONTENT_TYPE_CONFIG: Record<string, ProcessingConfig> = {
  // AudioRoad content types
  episode: {
    sourceType: "audio",
    needsTranscription: true,
    needsExtraction: true,
    extractionTypes: ["quote", "stat", "hot_take", "story", "clip"],
  },
  caller_segment: {
    sourceType: "audio",
    needsTranscription: true,
    needsExtraction: true,
    extractionTypes: ["quote", "story", "testimonial"],
  },
  
  // Health Coaching content types
  success_story: {
    sourceType: "structured",
    needsTranscription: false,
    needsExtraction: true,
    extractionTypes: ["testimonial", "stat", "quote"],
  },
  protocol: {
    sourceType: "structured",
    needsTranscription: false,
    needsExtraction: true,
    extractionTypes: ["tip", "product_mention", "educational"],
  },
  research_insight: {
    sourceType: "text",
    needsTranscription: false,
    needsExtraction: true,
    extractionTypes: ["stat", "hot_take", "educational"],
  },
  lab_improvement: {
    sourceType: "structured",
    needsTranscription: false,
    needsExtraction: true,
    extractionTypes: ["testimonial", "stat"],
  },
  
  // TruckTales content types
  chapter_teaser: {
    sourceType: "text",
    needsTranscription: false,
    needsExtraction: true,
    extractionTypes: ["teaser", "excerpt", "hook"],
  },
  character_spotlight: {
    sourceType: "structured",
    needsTranscription: false,
    needsExtraction: true,
    extractionTypes: ["teaser", "story"],
  },
  story_launch: {
    sourceType: "structured",
    needsTranscription: false,
    needsExtraction: true,
    extractionTypes: ["teaser", "hook", "announcement"],
  },
  audiogram: {
    sourceType: "audio",
    needsTranscription: false,
    needsExtraction: true,
    extractionTypes: ["clip", "teaser"],
  },
  
  // Default fallback
  default: {
    sourceType: "text",
    needsTranscription: false,
    needsExtraction: true,
    extractionTypes: ["quote", "stat", "story"],
  },
};

function getProcessingConfig(contentType: string): ProcessingConfig {
  return CONTENT_TYPE_CONFIG[contentType] || CONTENT_TYPE_CONFIG.default;
}

// ============================================
// POST /api/ingest - Receive content from source apps
// ============================================

export async function POST(request: NextRequest) {
  try {
    // 1. Validate API key
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }
    
    const apiKey = authHeader.replace("Bearer ", "");
    
    const sourceApp = await prisma.sourceApp.findUnique({
      where: { apiKey },
    });
    
    if (!sourceApp) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }
    
    if (!sourceApp.isActive) {
      return NextResponse.json(
        { error: "Source app is disabled" },
        { status: 403 }
      );
    }
    
    // 2. Parse and validate payload
    const body = await request.json();
    const parseResult = IngestPayloadSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          error: "Invalid payload", 
          details: parseResult.error.flatten() 
        },
        { status: 400 }
      );
    }
    
    const payload = parseResult.data;
    
    // 3. Validate source matches API key
    if (payload.source !== sourceApp.name) {
      return NextResponse.json(
        { error: `API key belongs to '${sourceApp.name}', not '${payload.source}'` },
        { status: 403 }
      );
    }
    
    // 4. Get processing configuration
    const config = getProcessingConfig(payload.contentType);
    
    // 5. Determine file URL and content
    let fileUrl: string | null = null;
    let rawText: string | null = null;
    
    if (payload.audioUrl) {
      fileUrl = payload.audioUrl;
    }
    if (payload.transcript) {
      rawText = payload.transcript;
    }
    if (payload.text) {
      rawText = payload.text;
    }
    
    // 6. Create source record
    const source = await prisma.source.create({
      data: {
        sourceAppId: sourceApp.id,
        title: payload.title,
        sourceType: config.sourceType,
        contentType: payload.contentType,
        fileUrl,
        status: "pending",
        needsTranscription: config.needsTranscription && !!payload.audioUrl && !payload.transcript,
        needsExtraction: config.needsExtraction,
        rawData: {
          text: rawText,
          data: payload.data,
          extractionTypes: config.extractionTypes,
        },
        metadata: payload.metadata || {},
      },
    });
    
    // 7. If transcript was provided, create transcript record
    if (rawText && config.sourceType !== "structured") {
      await prisma.transcript.create({
        data: {
          sourceId: source.id,
          fullText: rawText,
        },
      });
      
      // Update source status
      await prisma.source.update({
        where: { id: source.id },
        data: { 
          status: "transcribed",
          needsTranscription: false,
        },
      });
    }
    
    // 8. Return success with source ID
    console.log(`[Ingest] Created source ${source.id} from ${sourceApp.name} (${payload.contentType})`);
    
    return NextResponse.json({
      success: true,
      sourceId: source.id,
      status: source.status,
      processingConfig: {
        needsTranscription: source.needsTranscription,
        needsExtraction: source.needsExtraction,
        voiceProfile: sourceApp.voiceProfile,
      },
      message: `Content received from ${sourceApp.displayName}. Processing will begin shortly.`,
    }, { status: 201 });
    
  } catch (error) {
    console.error("[Ingest] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// GET /api/ingest - Check ingestion status
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get("sourceId");
    
    if (!sourceId) {
      return NextResponse.json(
        { error: "sourceId query parameter required" },
        { status: 400 }
      );
    }
    
    const source = await prisma.source.findUnique({
      where: { id: sourceId },
      include: {
        sourceApp: {
          select: { name: true, displayName: true },
        },
        transcripts: {
          select: { id: true, createdAt: true },
        },
        extractions: {
          select: { id: true, type: true, createdAt: true },
        },
      },
    });
    
    if (!source) {
      return NextResponse.json(
        { error: "Source not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      sourceId: source.id,
      title: source.title,
      sourceApp: source.sourceApp?.displayName,
      contentType: source.contentType,
      status: source.status,
      needsTranscription: source.needsTranscription,
      needsExtraction: source.needsExtraction,
      transcriptCount: source.transcripts.length,
      extractionCount: source.extractions.length,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
    });
    
  } catch (error) {
    console.error("[Ingest] Status check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
