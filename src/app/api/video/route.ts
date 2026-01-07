import { NextRequest, NextResponse } from "next/server";
import {
  listVideoProjects,
  getProjectStats,
  VIDEO_TYPE_CONFIG,
} from "@/lib/video";
import { generateScriptOnly } from "@/lib/video/producer";

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
  const status = searchParams.get("status") as any;
  const type = searchParams.get("type") || undefined;
  const limit = parseInt(searchParams.get("limit") || "20");
  
  const projects = listVideoProjects({
    status,
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
    const body = await request.json();
    
    const {
      topic,
      type = "short",
      tone = "educational",
      targetDuration,
      sourceContent,
      style,
    } = body;
    
    if (!topic) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }
    
    // Validate video type
    if (!VIDEO_TYPE_CONFIG[type as keyof typeof VIDEO_TYPE_CONFIG]) {
      return NextResponse.json(
        { error: "Invalid video type" },
        { status: 400 }
      );
    }
    
    console.log(`[API] Creating video project: "${topic}" (${type})`);
    
    // Generate script only (for preview/approval)
    const result = await generateScriptOnly({
      topic,
      type,
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
