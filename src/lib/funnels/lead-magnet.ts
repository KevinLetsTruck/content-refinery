/**
 * Lead Magnet Handler
 * Handle lead magnet upload to R2
 */

import { v4 as uuid } from "uuid";
import { uploadToR2, getPublicUrl, isR2Configured } from "@/lib/storage/r2";

export interface LeadMagnetUploadResult {
  url: string;
  fileName: string;
  fileType: string;
}

/**
 * Upload a lead magnet file to R2
 */
export async function uploadLeadMagnet(
  file: File,
  funnelId: string
): Promise<LeadMagnetUploadResult> {
  if (!isR2Configured()) {
    throw new Error("R2 storage is not configured. Cannot upload lead magnet.");
  }

  // Get file extension
  const ext = file.name.split(".").pop() || "pdf";
  const key = `funnels/${funnelId}/lead-magnet-${uuid()}.${ext}`;

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to R2
  await uploadToR2(key, buffer, file.type);

  // Return the public URL
  const url = getPublicUrl(key);

  return {
    url,
    fileName: file.name,
    fileType: file.type,
  };
}

/**
 * Upload lead magnet from a buffer (for server-side processing)
 */
export async function uploadLeadMagnetBuffer(
  buffer: Buffer,
  fileName: string,
  contentType: string,
  funnelId: string
): Promise<LeadMagnetUploadResult> {
  if (!isR2Configured()) {
    throw new Error("R2 storage is not configured. Cannot upload lead magnet.");
  }

  const ext = fileName.split(".").pop() || "pdf";
  const key = `funnels/${funnelId}/lead-magnet-${uuid()}.${ext}`;

  await uploadToR2(key, buffer, contentType);

  return {
    url: getPublicUrl(key),
    fileName,
    fileType: contentType,
  };
}

/**
 * Generate lead magnet with Gamma
 * TODO: Implement when Gamma PDF generation is available
 */
export async function generateLeadMagnetWithGamma(
  title: string,
  outline: string[],
  topic: string
): Promise<{ url: string; title: string }> {
  // Placeholder for Gamma integration
  // Gamma currently generates presentations, not PDFs
  // This will be implemented when Gamma supports PDF export
  throw new Error("Gamma lead magnet generation not yet implemented. Please upload a file or provide a URL.");
}
