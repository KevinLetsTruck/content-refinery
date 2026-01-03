import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

// GET /api/sources/[id] - Get a single source
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const source = await prisma.source.findUnique({
      where: { id },
      include: {
        transcripts: true,
        extractions: {
          include: {
            generatedContent: true,
          },
        },
      },
    });

    if (!source) {
      return NextResponse.json(
        { error: "Source not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ source });
  } catch (error) {
    console.error("Error fetching source:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/sources/[id] - Delete a source and all related data
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if source exists
    const source = await prisma.source.findUnique({
      where: { id },
    });

    if (!source) {
      return NextResponse.json(
        { error: "Source not found" },
        { status: 404 }
      );
    }

    // Delete source (cascades to transcripts, extractions, generated_content)
    await prisma.source.delete({
      where: { id },
    });

    return NextResponse.json({ 
      success: true, 
      message: `Deleted source: ${source.title}` 
    });
  } catch (error) {
    console.error("Error deleting source:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

