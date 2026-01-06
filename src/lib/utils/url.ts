/**
 * URL utilities for Content Refinery
 */

/**
 * Check if a URL is a direct image URL (not a page containing an image)
 * Direct image URLs can be used for Twitter media uploads
 */
export function isDirectImageUrl(url: string): boolean {
  if (!url) return false;

  // Check for common image extensions
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"];
  const lowercaseUrl = url.toLowerCase();
  
  if (imageExtensions.some((ext) => lowercaseUrl.includes(ext))) {
    return true;
  }

  // Check for R2/S3 URLs that typically serve images
  if (url.includes(".r2.cloudflarestorage.com") || url.includes("pub-")) {
    return true;
  }

  // Check for known CDN patterns that serve images
  if (url.includes("cloudflare-ipfs") || url.includes("imagedelivery.net")) {
    return true;
  }

  // Gamma URLs are NOT direct images (they're interactive pages)
  if (url.includes("gamma.app")) {
    return false;
  }

  return false;
}

/**
 * Extract filename from a URL
 */
export function getFilenameFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const segments = pathname.split("/");
    const filename = segments[segments.length - 1];
    return filename || null;
  } catch {
    return null;
  }
}

/**
 * Check if URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}




