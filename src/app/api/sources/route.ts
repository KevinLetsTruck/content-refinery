import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { uploadFile } from "@/lib/storage";

// Configure API route for large file uploads
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout

// POST /api/sources - Create a new source from uploaded file or URL
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const title = formData.get("title") as string;
    const sourceType = formData.get("sourceType") as string;
    const file = formData.get("file") as File | null;
    const url = formData.get("url") as string | null;

    if (!title || !sourceType) {
      return NextResponse.json(
        { error: "Title and sourceType are required" },
        { status: 400 }
      );
    }

    let fileUrl: string | null = null;
    let originalFilename: string | null = null;
    let fileSizeBytes: bigint | null = null;

    // Handle file upload
    if (file && sourceType === "audio") {
      originalFilename = file.name;
      fileSizeBytes = BigInt(file.size);

      // Convert File to Buffer and upload
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const uploadResult = await uploadFile(buffer, file.name, file.type);
      fileUrl = uploadResult.url;
    } else if (url) {
      fileUrl = url;
    }

    // Create source record with Prisma
    const source = await prisma.source.create({
      data: {
        title,
        sourceType,
        fileUrl,
        originalFilename,
        fileSizeBytes,
        status: "pending",
      },
    });

    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    console.error("Error creating source:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : "";
    console.error("Error details:", { message: errorMessage, stack: errorStack });
    return NextResponse.json(
      { error: `Failed to create source: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// GET /api/sources - List all sources
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    const sources = await prisma.source.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ sources });
  } catch (error) {
    console.error("Error fetching sources:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
