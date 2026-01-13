import { NextRequest, NextResponse } from "next/server";
import { syncEpisodesFromDropbox, getSyncStatus, getPendingFiles, syncSingleFile } from "@/lib/dropbox/sync";
import { isDropboxConnected, updateFolderPath } from "@/lib/dropbox/client";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for downloading/uploading files

/**
 * GET /api/dropbox/sync
 *
 * Get sync status or pending files
 * Query params:
 * - pending=true: Get list of files pending import
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const getPending = searchParams.get("pending") === "true";

    if (getPending) {
      const pending = await getPendingFiles();
      return NextResponse.json(pending);
    }

    const status = await getSyncStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("[Dropbox Sync] Status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get sync status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dropbox/sync
 *
 * Trigger sync from Dropbox
 *
 * Body:
 * - folderPath?: string - Override folder path
 * - autoTranscribe?: boolean - Auto-transcribe new episodes (default: true)
 * - limit?: number - Max files to process (default: 50)
 * - singleFile?: string - Sync only this specific file path (for large files)
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Dropbox is connected
    if (!(await isDropboxConnected())) {
      return NextResponse.json(
        { error: "Dropbox not connected. Please connect Dropbox first." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { folderPath, autoTranscribe = true, limit = 50, singleFile } = body;

    // Single file sync mode (for large files)
    if (singleFile) {
      console.log("[Dropbox Sync] Single file sync:", singleFile);
      const result = await syncSingleFile(singleFile, autoTranscribe);
      return NextResponse.json(result);
    }

    // Batch sync mode
    console.log("[Dropbox Sync] Starting sync...", { folderPath, autoTranscribe, limit });

    const result = await syncEpisodesFromDropbox({
      folderPath,
      autoTranscribe,
      limit,
    });

    console.log("[Dropbox Sync] Sync complete:", result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Dropbox Sync] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/dropbox/sync
 *
 * Update sync settings (folder path)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { folderPath } = body;

    if (folderPath !== undefined) {
      await updateFolderPath(folderPath);
    }

    const status = await getSyncStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("[Dropbox Sync] Update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update settings" },
      { status: 500 }
    );
  }
}
