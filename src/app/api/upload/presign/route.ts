import { NextRequest, NextResponse } from "next/server";
import { getPresignedUploadUrl, isR2Configured } from "@/lib/storage/r2";

export const runtime = 'nodejs';

/**
 * POST /api/upload/presign
 * Get a presigned URL for direct upload to Cloudflare R2
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
          fallback: true
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

    // Validate file size (max 500MB)
    const MAX_SIZE = 500 * 1024 * 1024; // 500MB
    if (fileSize && fileSize > MAX_SIZE) {
      const sizeMB = Math.round(fileSize / 1024 / 1024);
      return NextResponse.json(
        { error: `File too large (${sizeMB}MB). Maximum size is 500MB.` },
        { status: 413 }
      );
    }

    // Validate content type for audio files
    const allowedTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/mp4',
      'audio/m4a',
      'audio/x-m4a',
      'audio/ogg',
      'audio/webm',
      'video/mp4', // Some podcasts are uploaded as video
    ];

    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: `Invalid file type: ${contentType}. Allowed types: MP3, WAV, M4A, OGG, WebM` },
        { status: 400 }
      );
    }

    console.log(`Generating presigned URL for: ${filename} (${contentType}, ${fileSize} bytes)`);

    const { uploadUrl, key, publicUrl } = await getPresignedUploadUrl(filename, contentType);

    return NextResponse.json({
      uploadUrl,
      key,
      publicUrl,
      expiresIn: 3600, // 1 hour
    });

  } catch (error) {
    console.error("Error generating presigned URL:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate upload URL: ${errorMessage}` },
      { status: 500 }
    );
  }
}





