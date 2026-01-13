/**
 * Dropbox API Client
 *
 * Provides functions to interact with Dropbox API for listing and downloading files.
 * Uses OAuth tokens stored in PlatformCredential table.
 */

import prisma from "@/lib/db/prisma";

// Supported audio file extensions
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"];

export interface DropboxFile {
  id: string;
  name: string;
  path: string;
  size: number;
  modifiedAt: Date;
  isFolder: boolean;
}

export interface DropboxCredentials {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  folderPath: string;
}

/**
 * Check if Dropbox is connected
 */
export async function isDropboxConnected(): Promise<boolean> {
  const credentials = await prisma.platformCredential.findUnique({
    where: { platform: "dropbox" },
  });
  return !!credentials;
}

/**
 * Get Dropbox credentials from database
 */
export async function getDropboxCredentials(): Promise<DropboxCredentials | null> {
  const credentials = await prisma.platformCredential.findUnique({
    where: { platform: "dropbox" },
  });

  if (!credentials) {
    return null;
  }

  const metadata = credentials.metadata as { folderPath?: string } | null;

  return {
    accessToken: credentials.accessToken,
    refreshToken: credentials.refreshToken,
    expiresAt: credentials.expiresAt,
    folderPath: metadata?.folderPath || "/",
  };
}

/**
 * Refresh access token if expired
 */
async function refreshTokenIfNeeded(credentials: DropboxCredentials): Promise<string> {
  // Check if token is expired (with 5 minute buffer)
  if (credentials.expiresAt && credentials.expiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
    if (!credentials.refreshToken) {
      throw new Error("Dropbox token expired and no refresh token available");
    }

    const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY;
    const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET;

    if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) {
      throw new Error("Dropbox app credentials not configured");
    }

    console.log("[Dropbox] Refreshing access token...");

    const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: credentials.refreshToken,
        client_id: DROPBOX_APP_KEY,
        client_secret: DROPBOX_APP_SECRET,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("[Dropbox] Token refresh error:", error);
      throw new Error("Failed to refresh Dropbox token");
    }

    const tokenData = await response.json();

    // Update stored credentials
    await prisma.platformCredential.update({
      where: { platform: "dropbox" },
      data: {
        accessToken: tokenData.access_token,
        expiresAt: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : null,
      },
    });

    console.log("[Dropbox] Token refreshed successfully");
    return tokenData.access_token;
  }

  return credentials.accessToken;
}

/**
 * Make authenticated request to Dropbox API
 */
async function dropboxRequest<T>(
  endpoint: string,
  body: Record<string, unknown>,
  credentials: DropboxCredentials
): Promise<T> {
  const accessToken = await refreshTokenIfNeeded(credentials);

  const response = await fetch(`https://api.dropboxapi.com/2${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  // Get response text first to handle both JSON and plain text errors
  const responseText = await response.text();

  if (!response.ok) {
    console.error(`[Dropbox] API error (${endpoint}):`, responseText);
    // Try to parse as JSON for structured error
    try {
      const error = JSON.parse(responseText);
      throw new Error(error.error_summary || `Dropbox API error: ${response.status}`);
    } catch (parseError) {
      // If JSON parsing fails, use the raw text
      if (parseError instanceof SyntaxError) {
        throw new Error(responseText || `Dropbox API error: ${response.status}`);
      }
      throw parseError;
    }
  }

  return JSON.parse(responseText);
}

/**
 * List audio files in a Dropbox folder
 */
export async function listAudioFiles(
  folderPath?: string
): Promise<DropboxFile[]> {
  const credentials = await getDropboxCredentials();
  if (!credentials) {
    throw new Error("Dropbox not connected");
  }

  const path = folderPath || credentials.folderPath || "";
  // Dropbox API requires empty string for root, not "/"
  const normalizedPath = path === "/" ? "" : path;

  console.log(`[Dropbox] Listing files in: ${normalizedPath || "(root)"}`);

  interface DropboxEntry {
    ".tag": string;
    id: string;
    name: string;
    path_lower: string;
    size?: number;
    server_modified?: string;
  }

  interface DropboxListResponse {
    entries: DropboxEntry[];
    cursor: string;
    has_more: boolean;
  }

  const allFiles: DropboxFile[] = [];
  let hasMore = true;
  let cursor: string | undefined;

  while (hasMore) {
    let response: DropboxListResponse;

    if (cursor) {
      // Continue listing
      response = await dropboxRequest<DropboxListResponse>(
        "/files/list_folder/continue",
        { cursor },
        credentials
      );
    } else {
      // Initial listing
      response = await dropboxRequest<DropboxListResponse>(
        "/files/list_folder",
        {
          path: normalizedPath,
          recursive: false,
          include_media_info: false,
          include_deleted: false,
        },
        credentials
      );
    }

    // Log all entries for debugging
    console.log(`[Dropbox] Raw entries (${response.entries.length}):`,
      response.entries.map(e => ({ tag: e[".tag"], name: e.name, path: e.path_lower }))
    );

    // Filter for audio files
    for (const entry of response.entries) {
      if (entry[".tag"] === "file") {
        const ext = entry.name.toLowerCase().slice(entry.name.lastIndexOf("."));
        console.log(`[Dropbox] File: ${entry.name}, ext: ${ext}, isAudio: ${AUDIO_EXTENSIONS.includes(ext)}`);
        if (AUDIO_EXTENSIONS.includes(ext)) {
          allFiles.push({
            id: entry.id,
            name: entry.name,
            path: entry.path_lower,
            size: entry.size || 0,
            modifiedAt: new Date(entry.server_modified || Date.now()),
            isFolder: false,
          });
        }
      }
    }

    hasMore = response.has_more;
    cursor = response.cursor;
  }

  // Sort by modified date (newest first)
  allFiles.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());

  console.log(`[Dropbox] Found ${allFiles.length} audio files`);
  return allFiles;
}

/**
 * List folders in a Dropbox path (for folder picker)
 */
export async function listFolders(
  folderPath?: string
): Promise<DropboxFile[]> {
  const credentials = await getDropboxCredentials();
  if (!credentials) {
    throw new Error("Dropbox not connected");
  }

  const path = folderPath || "";
  const normalizedPath = path === "/" ? "" : path;

  interface DropboxEntry {
    ".tag": string;
    id: string;
    name: string;
    path_lower: string;
  }

  interface DropboxListResponse {
    entries: DropboxEntry[];
  }

  const response = await dropboxRequest<DropboxListResponse>(
    "/files/list_folder",
    {
      path: normalizedPath,
      recursive: false,
      include_media_info: false,
      include_deleted: false,
    },
    credentials
  );

  return response.entries
    .filter((entry) => entry[".tag"] === "folder")
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      path: entry.path_lower,
      size: 0,
      modifiedAt: new Date(),
      isFolder: true,
    }));
}

/**
 * Download a file from Dropbox (returns buffer - use for small files only)
 */
export async function downloadFile(path: string): Promise<Buffer> {
  const credentials = await getDropboxCredentials();
  if (!credentials) {
    throw new Error("Dropbox not connected");
  }

  const accessToken = await refreshTokenIfNeeded(credentials);

  console.log(`[Dropbox] Downloading: ${path}`);

  const response = await fetch("https://content.dropboxapi.com/2/files/download", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Dropbox-API-Arg": JSON.stringify({ path }),
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Dropbox] Download error:", error);
    throw new Error(`Failed to download file: ${path}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Get a temporary download link for a file (valid for 4 hours)
 * Use this for large files to stream directly to R2
 */
export async function getTemporaryDownloadLink(path: string): Promise<string> {
  const credentials = await getDropboxCredentials();
  if (!credentials) {
    throw new Error("Dropbox not connected");
  }

  interface TempLinkResponse {
    link: string;
    metadata: {
      name: string;
      size: number;
    };
  }

  const response = await dropboxRequest<TempLinkResponse>(
    "/files/get_temporary_link",
    { path },
    credentials
  );

  return response.link;
}

/**
 * Get file metadata
 */
export async function getFileMetadata(path: string): Promise<{
  id: string;
  name: string;
  size: number;
  modifiedAt: Date;
}> {
  const credentials = await getDropboxCredentials();
  if (!credentials) {
    throw new Error("Dropbox not connected");
  }

  interface MetadataResponse {
    id: string;
    name: string;
    size: number;
    server_modified: string;
  }

  const response = await dropboxRequest<MetadataResponse>(
    "/files/get_metadata",
    { path },
    credentials
  );

  return {
    id: response.id,
    name: response.name,
    size: response.size,
    modifiedAt: new Date(response.server_modified),
  };
}

/**
 * Update the configured folder path
 */
export async function updateFolderPath(folderPath: string): Promise<void> {
  const credentials = await prisma.platformCredential.findUnique({
    where: { platform: "dropbox" },
  });

  if (!credentials) {
    throw new Error("Dropbox not connected");
  }

  const metadata = (credentials.metadata || {}) as Record<string, unknown>;

  await prisma.platformCredential.update({
    where: { platform: "dropbox" },
    data: {
      metadata: {
        ...metadata,
        folderPath,
      },
    },
  });

  console.log(`[Dropbox] Folder path updated to: ${folderPath}`);
}

/**
 * Get current configured folder path
 */
export async function getConfiguredFolderPath(): Promise<string> {
  const credentials = await getDropboxCredentials();
  return credentials?.folderPath || "/";
}
