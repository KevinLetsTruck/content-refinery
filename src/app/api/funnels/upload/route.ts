import { NextRequest, NextResponse } from "next/server";
import { uploadLeadMagnet } from "@/lib/funnels/lead-magnet";

/**
 * POST /api/funnels/upload
 * Upload lead magnet file to R2 storage
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const funnelId = (formData.get("funnelId") as string) || `temp_${Date.now()}`;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 50MB limit" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/zip",
      "application/epub+zip",
      "audio/mpeg",
      "video/mp4",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".pdf")) {
      return NextResponse.json(
        { error: "File type not allowed. Please upload a PDF, document, or media file." },
        { status: 400 }
      );
    }

    // Convert File to Buffer for upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log(`[API] Uploading lead magnet: ${file.name} (${file.size} bytes)`);

    // Upload to R2
    const result = await uploadLeadMagnet(buffer, file.name, funnelId);

    return NextResponse.json({
      success: true,
      url: result.url,
      fileName: result.fileName,
      fileType: result.fileType,
    });
  } catch (error) {
    console.error("[API] Lead magnet upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload file" },
      { status: 500 }
    );
  }
}
