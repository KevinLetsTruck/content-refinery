/**
 * Dropbox Episode Sync
 *
 * Syncs audio files from Dropbox to the Sources table.
 * Downloads files to R2 storage and optionally triggers transcription.
 */

import prisma from "@/lib/db/prisma";
import { listAudioFiles, downloadFile, DropboxFile, getDropboxCredentials } from "./client";
import { uploadToR2, getPublicUrl, isR2Configured } from "@/lib/storage/r2";
import { v4 as uuid } from "uuid";

export interface SyncOptions {
  folderPath?: string;
  autoTranscribe?: boolean;
  limit?: number;
}

export interface SyncResult {
  imported: number;
  skipped: number;
  errors: string[];
  files: Array<{
    id: string;
    name: string;
    status: "imported" | "skipped" | "error";
    sourceId?: string;
    error?: string;
  }>;
}

/**
 * Parse episode title from filename
 *
 * Patterns:
 * - "TBB-2847-2026-01-10.mp3" -> "TBB Episode 2847"
 * - "Destination_Health_2026-01-10.mp3" -> "Destination Health - Jan 10"
 * - "Power_Hour_20260110.mp3" -> "Power Hour - Jan 10"
 * - Otherwise use filename without extension
 */
function parseEpisodeTitle(filename: string): string {
  // Remove extension
  const name = filename.replace(/\.[^/.]+$/, "");

  // Pattern: TBB-2847-DATE
  const tbbMatch = name.match(/^TBB[_-]?(\d+)/i);
  if (tbbMatch) {
    return `TBB Episode ${tbbMatch[1]}`;
  }

  // Pattern: SHOW_DATE or SHOW-DATE
  const showDateMatch = name.match(/^([A-Za-z_]+)[_-](\d{4})[_-]?(\d{2})[_-]?(\d{2})/);
  if (showDateMatch) {
    const showName = showDateMatch[1].replace(/_/g, " ");
    const month = new Date(2000, parseInt(showDateMatch[3]) - 1, 1).toLocaleDateString("en-US", { month: "short" });
    const day = parseInt(showDateMatch[4]);
    return `${showName} - ${month} ${day}`;
  }

  // Pattern: YYYYMMDD at the end
  const dateEndMatch = name.match(/^(.+?)[_-]?(\d{8})$/);
  if (dateEndMatch) {
    const showName = dateEndMatch[1].replace(/_/g, " ");
    const dateStr = dateEndMatch[2];
    const month = new Date(2000, parseInt(dateStr.slice(4, 6)) - 1, 1).toLocaleDateString("en-US", { month: "short" });
    const day = parseInt(dateStr.slice(6, 8));
    return `${showName} - ${month} ${day}`;
  }

  // Fallback: clean up underscores and return
  return name.replace(/_/g, " ");
}

/**
 * Check if a file has already been imported
 */
async function isAlreadyImported(dropboxId: string, filename: string): Promise<boolean> {
  // Check by Dropbox ID in metadata
  const existing = await prisma.source.findFirst({
    where: {
      OR: [
        {
          metadata: {
            path: ["dropboxId"],
            equals: dropboxId,
          },
        },
        {
          originalFilename: filename,
          sourceType: "audio",
          contentType: "episode",
        },
      ],
    },
  });

  return !!existing;
}

/**
 * Trigger transcription for a source (fire and forget)
 */
async function triggerTranscription(sourceId: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000";

  try {
    // Fire and forget - don't await the full transcription
    fetch(`${baseUrl}/api/transcribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sourceId }),
    }).catch((err) => {
      console.error(`[Sync] Failed to trigger transcription for ${sourceId}:`, err);
    });

    console.log(`[Sync] Transcription triggered for ${sourceId}`);
  } catch (error) {
    console.error(`[Sync] Error triggering transcription:`, error);
  }
}

/**
 * Sync episodes from Dropbox
 *
 * 1. Lists audio files from Dropbox
 * 2. Skips already imported files
 * 3. Downloads new files to R2
 * 4. Creates Source records
 * 5. Optionally triggers transcription
 */
export async function syncEpisodesFromDropbox(
  options: SyncOptions = {}
): Promise<SyncResult> {
  const {
    folderPath,
    autoTranscribe = true,
    limit = 50,
  } = options;

  const result: SyncResult = {
    imported: 0,
    skipped: 0,
    errors: [],
    files: [],
  };

  // Check if Dropbox is connected
  const credentials = await getDropboxCredentials();
  if (!credentials) {
    result.errors.push("Dropbox not connected");
    return result;
  }

  // Check if R2 is configured
  if (!isR2Configured()) {
    result.errors.push("R2 storage not configured - cannot store episode files");
    return result;
  }

  try {
    // List audio files from Dropbox
    const files = await listAudioFiles(folderPath);
    console.log(`[Sync] Found ${files.length} audio files in Dropbox`);

    // Process files (limited to avoid timeout)
    const filesToProcess = files.slice(0, limit);

    for (const file of filesToProcess) {
      try {
        // Check if already imported
        if (await isAlreadyImported(file.id, file.name)) {
          console.log(`[Sync] Skipping ${file.name} - already imported`);
          result.skipped++;
          result.files.push({
            id: file.id,
            name: file.name,
            status: "skipped",
          });
          continue;
        }

        console.log(`[Sync] Importing ${file.name}...`);

        // Download file from Dropbox
        const fileBuffer = await downloadFile(file.path);
        console.log(`[Sync] Downloaded ${file.name} (${Math.round(fileBuffer.length / 1024 / 1024)}MB)`);

        // Determine content type
        const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
        const contentTypeMap: Record<string, string> = {
          ".mp3": "audio/mpeg",
          ".wav": "audio/wav",
          ".m4a": "audio/mp4",
          ".aac": "audio/aac",
          ".ogg": "audio/ogg",
          ".flac": "audio/flac",
        };
        const mimeType = contentTypeMap[ext] || "audio/mpeg";

        // Upload to R2
        const storageKey = `episodes/${uuid()}${ext}`;
        await uploadToR2(storageKey, fileBuffer, mimeType);
        const fileUrl = getPublicUrl(storageKey);
        console.log(`[Sync] Uploaded to R2: ${storageKey}`);

        // Parse episode title
        const title = parseEpisodeTitle(file.name);

        // Create Source record
        const source = await prisma.source.create({
          data: {
            title,
            sourceType: "audio",
            contentType: "episode",
            fileUrl,
            storageKey,
            storageType: "r2",
            originalFilename: file.name,
            fileSizeBytes: BigInt(file.size),
            status: autoTranscribe ? "pending" : "completed",
            needsTranscription: autoTranscribe,
            metadata: {
              dropboxId: file.id,
              dropboxPath: file.path,
              dropboxModified: file.modifiedAt.toISOString(),
            },
          },
        });

        console.log(`[Sync] Created source ${source.id}: ${title}`);

        result.imported++;
        result.files.push({
          id: file.id,
          name: file.name,
          status: "imported",
          sourceId: source.id,
        });

        // Trigger transcription if enabled
        if (autoTranscribe) {
          await triggerTranscription(source.id);
        }
      } catch (fileError) {
        console.error(`[Sync] Error processing ${file.name}:`, fileError);
        result.errors.push(`${file.name}: ${fileError instanceof Error ? fileError.message : "Unknown error"}`);
        result.files.push({
          id: file.id,
          name: file.name,
          status: "error",
          error: fileError instanceof Error ? fileError.message : "Unknown error",
        });
      }
    }
  } catch (error) {
    console.error("[Sync] Error syncing from Dropbox:", error);
    result.errors.push(error instanceof Error ? error.message : "Unknown error");
  }

  console.log(`[Sync] Complete: ${result.imported} imported, ${result.skipped} skipped, ${result.errors.length} errors`);
  return result;
}

/**
 * Get sync status (last sync time, file counts, etc.)
 */
export async function getSyncStatus(): Promise<{
  isConnected: boolean;
  folderPath: string | null;
  totalEpisodes: number;
  pendingTranscription: number;
  lastImportedAt: Date | null;
}> {
  const credentials = await getDropboxCredentials();

  // Count episodes
  const totalEpisodes = await prisma.source.count({
    where: {
      sourceType: "audio",
      contentType: "episode",
    },
  });

  const pendingTranscription = await prisma.source.count({
    where: {
      sourceType: "audio",
      contentType: "episode",
      needsTranscription: true,
      status: { in: ["pending", "processing"] },
    },
  });

  // Get most recent import
  const lastImported = await prisma.source.findFirst({
    where: {
      sourceType: "audio",
      contentType: "episode",
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      createdAt: true,
    },
  });

  return {
    isConnected: !!credentials,
    folderPath: credentials?.folderPath || null,
    totalEpisodes,
    pendingTranscription,
    lastImportedAt: lastImported?.createdAt || null,
  };
}
