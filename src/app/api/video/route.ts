import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  listVideoProjects,
  getProjectStats,
  VIDEO_TYPE_CONFIG,
  VideoStatus,
  VideoType,
} from "@/lib/video";
import { generateScriptOnly } from "@/lib/video/producer";
import { parseAndValidate, badRequest } from "@/lib/utils/api";

// Request validation schema matching VideoType and VideoGenerationRequest
const VideoRequestSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  type: z.enum(["short", "standard", "promo", "podcast_clip"]).default("short"),
  tone: z.enum(["educational", "promotional", "entertaining", "inspirational"]).default("educational"),
  targetDuration: z.number().positive().optional(),
  sourceContent: z.string().optional(),
  style: z.object({
    visualStyle: z.enum(["cinematic", "documentary", "energetic", "calm"]).optional(),
    includeTextOverlays: z.boolean().optional(),
    musicMood: z.enum(["upbeat", "inspiring", "calm", "dramatic"]).optional(),
  }).optional(),
});

/**
 * GET /api/video
 * List all video projects or get stats
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // Return video type configurations
  if (action === "config") {
    return NextResponse.json({
      videoTypes: VIDEO_TYPE_CONFIG,
    });
  }

  // Return project statistics
  if (action === "stats") {
    const stats = getProjectStats();
    return NextResponse.json(stats);
  }

  // List projects with optional filters
  const status = searchParams.get("status") as VideoStatus | null;
  const type = searchParams.get("type") || undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.max(1, parseInt(limitParam, 10) || 20) : 20;

  const projects = listVideoProjects({
    status: status ?? undefined,
    type,
    limit,
  });

  return NextResponse.json({
    total: projects.length,
    projects,
  });
}

/**
 * POST /api/video
 * Create a new video project (script only for preview)
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const { data, error } = await parseAndValidate(request, VideoRequestSchema);
    if (error || !data) return error ?? badRequest("Invalid request");

    const { topic, tone, targetDuration, sourceContent, style } = data;
    // Zod default ensures type is always defined, but TypeScript needs explicit assertion
    const videoType = (data.type ?? "short") as VideoType;

    // Validate video type exists in config
    if (!VIDEO_TYPE_CONFIG[videoType]) {
      return badRequest("Invalid video type");
    }

    console.log(`[API] Creating video project: "${topic}" (${videoType})`);

    // Generate script only (for preview/approval)
    const result = await generateScriptOnly({
      topic,
      type: videoType,
      tone,
      targetDuration,
      sourceContent,
      style,
    });
    
    return NextResponse.json({
      success: true,
      project: result.project,
      script: result.script,
    });
  } catch (error) {
    console.error("[API] Video creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create video" },
      { status: 500 }
    );
  }
}
