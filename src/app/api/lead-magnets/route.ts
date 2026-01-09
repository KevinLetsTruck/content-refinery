import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { isR2Configured, uploadToR2, getPublicUrl } from "@/lib/storage/r2";
import { v4 as uuid } from "uuid";

export const runtime = 'nodejs';

/**
 * GET /api/lead-magnets
 * Fetch all lead magnets from database
 */
export async function GET() {
  try {
    const leadMagnets = await prisma.leadMagnet.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Convert BigInt to string for JSON serialization
    const serializedLeadMagnets = leadMagnets.map((lm) => ({
      ...lm,
      fileSizeBytes: lm.fileSizeBytes?.toString() || null,
    }));

    return NextResponse.json({ leadMagnets: serializedLeadMagnets });
  } catch (error) {
    console.error("[Lead Magnets] Error fetching lead magnets:", error);
    return NextResponse.json(
      { error: "Failed to fetch lead magnets" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lead-magnets
 * Create a new lead magnet with file upload
 *
 * Accepts multipart/form-data with:
 * - file: The file to upload (required)
 * - title: Title of the lead magnet (required)
 * - description: Description (optional)
 * - category: Category (optional)
 * - tags: JSON string of tags array (optional)
 */
export async function POST(request: NextRequest) {
  try {
    // Check if R2 is configured
    if (!isR2Configured()) {
      return NextResponse.json(
        {
          error: "Cloud storage not configured",
          message: "Cloudflare R2 is not set up. Please configure R2 credentials in environment variables.",
        },
        { status: 503 }
      );
    }

    const formData = await request.formData();

    // Get required fields
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Get optional fields
    const description = formData.get("description") as string | null;
    const category = formData.get("category") as string | null;
    const tagsRaw = formData.get("tags") as string | null;
    const tags: string[] = tagsRaw ? JSON.parse(tagsRaw) : [];

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/gif',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed types: PDF, PNG, JPEG, WebP, GIF` },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      const sizeMB = Math.round(file.size / 1024 / 1024);
      return NextResponse.json(
        { error: `File too large (${sizeMB}MB). Maximum size is 50MB.` },
        { status: 413 }
      );
    }

    // Generate storage key
    const ext = file.name.split(".").pop() || "bin";
    const storageKey = `lead-magnets/${uuid()}.${ext}`;

    console.log(`[Lead Magnets] Uploading file: ${file.name} (${file.type}, ${file.size} bytes)`);

    // Upload file to R2
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await uploadToR2(storageKey, buffer, file.type);

    // Get public URL
    const fileUrl = getPublicUrl(storageKey);

    // Create lead magnet record in database
    const leadMagnet = await prisma.leadMagnet.create({
      data: {
        title,
        description,
        category,
        tags,
        fileUrl,
        storageKey,
        fileName: file.name,
        fileType: file.type,
        fileSizeBytes: BigInt(file.size),
      },
    });

    console.log(`[Lead Magnets] Created lead magnet: ${leadMagnet.id}`);

    // Convert BigInt to string for JSON serialization
    const serializedLeadMagnet = {
      ...leadMagnet,
      fileSizeBytes: leadMagnet.fileSizeBytes?.toString() || null,
    };

    return NextResponse.json({
      success: true,
      leadMagnet: serializedLeadMagnet,
    });

  } catch (error) {
    console.error("[Lead Magnets] Error creating lead magnet:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create lead magnet: ${errorMessage}` },
      { status: 500 }
    );
  }
}
