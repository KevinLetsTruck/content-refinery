import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { uploadFile } from "@/lib/storage";

// Configure API route for large file uploads
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout

// Max file size: 25MB to avoid memory issues on starter plan
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes

// POST /api/sources - Create a new source from uploaded file or URL
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const title = formData.get("title") as string;
    const sourceType = formData.get("sourceType") as string;
    const file = formData.get("file") as File | null;
    const url = formData.get("url") as string | null;
    
    // R2 direct upload fields
    const r2Key = formData.get("r2Key") as string | null;
    const r2FileUrl = formData.get("fileUrl") as string | null;
    const r2OriginalFilename = formData.get("originalFilename") as string | null;
    const r2FileSizeBytes = formData.get("fileSizeBytes") as string | null;

    if (!title || !sourceType) {
      return NextResponse.json(
        { error: "Title and sourceType are required" },
        { status: 400 }
      );
    }

    let fileUrl: string | null = null;
    let originalFilename: string | null = null;
    let fileSizeBytes: bigint | null = null;
    let storageKey: string | null = null;

    // Option 1: R2 direct upload (already uploaded to cloud)
    if (r2Key && sourceType === "audio") {
      console.log(`Using R2 direct upload: ${r2Key}`);
      storageKey = r2Key;
      fileUrl = r2FileUrl;
      originalFilename = r2OriginalFilename;
      fileSizeBytes = r2FileSizeBytes ? BigInt(r2FileSizeBytes) : null;
    }
    // Option 2: Server file upload (for small files, fallback)
    else if (file && sourceType === "audio") {
      // Check file size before processing
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = Math.round(file.size / 1024 / 1024);
        return NextResponse.json(
          { error: `File too large (${sizeMB}MB). Maximum size is 25MB. For larger files, configure Cloudflare R2 for cloud storage.` },
          { status: 413 }
        );
      }

      console.log(`Processing server file upload: ${file.name}, size: ${file.size} bytes`);
      
      originalFilename = file.name;
      fileSizeBytes = BigInt(file.size);

      // Convert File to Buffer and upload
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log(`File loaded into memory, uploading to local storage...`);
      
      const uploadResult = await uploadFile(buffer, file.name, file.type);
      fileUrl = uploadResult.url;
      storageKey = uploadResult.key;
      
      console.log(`File uploaded successfully: ${fileUrl}`);
    } 
    // Option 3: URL source
    else if (url) {
      fileUrl = url;
    }

    // Determine storage type
    const storageType = r2Key ? "r2" : (storageKey ? "local" : null);

    // Create source record with Prisma
    const source = await prisma.source.create({
      data: {
        title,
        sourceType,
        fileUrl,
        storageKey: storageKey || r2Key,
        storageType,
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
