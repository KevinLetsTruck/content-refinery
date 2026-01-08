import { NextRequest, NextResponse } from "next/server";
import { getPresignedUploadUrl, isR2Configured, getPublicUrl } from "@/lib/storage/r2";

export const runtime = 'nodejs';

/**
 * POST /api/upload/lead-magnet
 * Get a presigned URL for uploading lead magnet files (PDFs, images)
 *
 * Request body:
 * - filename: string
 * - contentType: string
 * - fileSize: number (in bytes)
 *
 * Response:
 * - uploadUrl: string (presigned URL for PUT request)
 * - key: string (file key in R2)
 * - publicUrl: string (URL to access the file after upload)
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

    const body = await request.json();
    const { filename, contentType, fileSize } = body;

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "filename and contentType are required" },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB for lead magnets)
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (fileSize && fileSize > MAX_SIZE) {
      const sizeMB = Math.round(fileSize / 1024 / 1024);
      return NextResponse.json(
        { error: `File too large (${sizeMB}MB). Maximum size is 50MB.` },
        { status: 413 }
      );
    }

    // Allowed types for lead magnets
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/gif',
    ];

    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: `Invalid file type: ${contentType}. Allowed types: PDF, PNG, JPEG, WebP, GIF` },
        { status: 400 }
      );
    }

    console.log(`[Lead Magnet Upload] Generating presigned URL for: ${filename} (${contentType}, ${fileSize} bytes)`);

    const { uploadUrl, key, publicUrl } = await getPresignedUploadUrl(filename, contentType, "lead-magnets");

    return NextResponse.json({
      uploadUrl,
      key,
      publicUrl,
      expiresIn: 3600, // 1 hour
    });

  } catch (error) {
    console.error("[Lead Magnet Upload] Error generating presigned URL:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate upload URL: ${errorMessage}` },
      { status: 500 }
    );
  }
}
