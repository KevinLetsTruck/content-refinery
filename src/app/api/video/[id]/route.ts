import { NextRequest, NextResponse } from "next/server";
import {
  getVideoProject,
  updateVideoProject,
  deleteVideoProject,
} from "@/lib/video/storage";
import { continueFromDraft } from "@/lib/video/producer";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/video/[id]
 * Get a video project by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  const project = getVideoProject(id);
  
  if (!project) {
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404 }
    );
  }
  
  return NextResponse.json(project);
}

/**
 * PUT /api/video/[id]
 * Update a video project
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  const project = getVideoProject(id);
  if (!project) {
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404 }
    );
  }
  
  try {
    const body = await request.json();
    const updated = updateVideoProject(id, body);
    
    return NextResponse.json({
      success: true,
      project: updated,
    });
  } catch (error) {
    console.error("[API] Update error:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/video/[id]
 * Delete a video project
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  const deleted = deleteVideoProject(id);
  
  if (!deleted) {
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    success: true,
    message: "Project deleted",
  });
}

/**
 * POST /api/video/[id]
 * Start/continue video production
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  
  const project = getVideoProject(id);
  if (!project) {
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404 }
    );
  }
  
  try {
    const body = await request.json().catch(() => ({}));
    
    if (action === "produce") {
      // Start full production from draft
      console.log(`[API] Starting production for ${id}...`);
      
      const result = await continueFromDraft(id, {
        skipVideoGeneration: body.skipVideoGeneration,
        skipAssembly: body.skipAssembly,
      });
      
      return NextResponse.json({
        success: true,
        project: result,
      });
    }
    
    return NextResponse.json(
      { error: "Invalid action. Use ?action=produce" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[API] Production error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Production failed" },
      { status: 500 }
    );
  }
}
