/**
 * Lead Magnet Handler
 * Handle lead magnet upload to R2 and Gamma generation
 */

import { v4 as uuid } from "uuid";
import { uploadToR2, getPublicUrl, isR2Configured } from "@/lib/storage/r2";

/**
 * Upload a lead magnet file to R2
 */
export async function uploadLeadMagnet(
  buffer: Buffer,
  fileName: string,
  funnelId: string
): Promise<{ url: string; fileName: string; fileType: string }> {
  if (!isR2Configured()) {
    throw new Error("R2 storage is not configured");
  }

  // Get file extension and determine content type
  const ext = fileName.split(".").pop()?.toLowerCase() || "pdf";
  const contentType = getContentType(ext);

  // Generate unique key
  const key = `funnels/${funnelId}/lead-magnets/${uuid()}.${ext}`;

  // Upload to R2
  await uploadToR2(key, buffer, contentType);

  // Get public URL
  const url = getPublicUrl(key);

  return {
    url,
    fileName,
    fileType: contentType,
  };
}

/**
 * Get content type from file extension
 */
function getContentType(ext: string): string {
  const types: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    zip: "application/zip",
    epub: "application/epub+zip",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
  };

  return types[ext] || "application/octet-stream";
}

/**
 * Generate a lead magnet with Gamma (placeholder - uses existing Gamma integration)
 */
export async function generateLeadMagnetWithGamma(
  title: string,
  outline: string[],
  topic: string
): Promise<{ url: string; title: string }> {
  // This would call the Gamma API to generate a document
  // For now, return a placeholder - the actual Gamma integration
  // should be implemented based on existing patterns in the codebase

  // Check for existing Gamma API integration
  const gammaApiKey = process.env.GAMMA_API_KEY;
  if (!gammaApiKey) {
    throw new Error("Gamma API key is not configured");
  }

  // Placeholder: In production, this would call the Gamma API
  // to generate a PDF/presentation based on the outline
  throw new Error("Gamma lead magnet generation not yet implemented. Please upload a file or provide a URL instead.");
}

/**
 * Validate a lead magnet URL
 */
export function validateLeadMagnetUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}
