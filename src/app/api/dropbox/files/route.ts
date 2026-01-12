import { NextRequest, NextResponse } from "next/server";
import { listAudioFiles, listFolders, isDropboxConnected } from "@/lib/dropbox/client";

/**
 * GET /api/dropbox/files
 *
 * List files or folders from Dropbox
 *
 * Query params:
 * - path: folder path to list (default: configured folder or root)
 * - type: "audio" | "folders" (default: "audio")
 */
export async function GET(request: NextRequest) {
  try {
    // Check if Dropbox is connected
    if (!(await isDropboxConnected())) {
      return NextResponse.json(
        { error: "Dropbox not connected", connected: false },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path") || undefined;
    const type = searchParams.get("type") || "audio";

    if (type === "folders") {
      const folders = await listFolders(path);
      return NextResponse.json({
        connected: true,
        path: path || "/",
        folders,
      });
    }

    // Default: list audio files
    const files = await listAudioFiles(path);
    return NextResponse.json({
      connected: true,
      path: path || "/",
      files: files.map((f) => ({
        id: f.id,
        name: f.name,
        path: f.path,
        size: f.size,
        sizeFormatted: formatBytes(f.size),
        modifiedAt: f.modifiedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[Dropbox Files] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list files" },
      { status: 500 }
    );
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
