import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

interface ImportUrlRequest {
  urls: string[];
}

// Extract gamma ID from various URL formats
function extractGammaId(url: string): { id: string; type: string } | null {
  try {
    const urlObj = new URL(url.trim());
    
    // Handle gamma.app URLs
    if (!urlObj.hostname.includes("gamma.app")) {
      return null;
    }

    // URL formats:
    // https://gamma.app/docs/Title-abc123xyz
    // https://gamma.app/public/Title-abc123xyz
    // https://gamma.app/embed/abc123xyz
    
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    
    if (pathParts.length < 2) {
      return null;
    }

    const type = pathParts[0]; // "docs", "public", "embed"
    const slugOrId = pathParts[pathParts.length - 1];
    
    // Extract ID from slug (last segment after final hyphen, or the whole thing)
    // e.g., "My-Presentation-Title-abc123xyz" -> "abc123xyz"
    // or just "abc123xyz" -> "abc123xyz"
    const idMatch = slugOrId.match(/([a-zA-Z0-9]+)$/);
    const id = idMatch ? idMatch[1] : slugOrId;

    return { id, type };
  } catch {
    return null;
  }
}

// Extract title from URL slug
function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url.trim());
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    const slug = pathParts[pathParts.length - 1];
    
    // Remove the ID suffix and convert hyphens to spaces
    // "My-Presentation-Title-abc123xyz" -> "My Presentation Title"
    const titlePart = slug.replace(/-[a-zA-Z0-9]+$/, "");
    const title = titlePart.replace(/-/g, " ").trim();
    
    return title || "Imported from Gamma";
  } catch {
    return "Imported from Gamma";
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ImportUrlRequest = await request.json();
    
    if (!body.urls || body.urls.length === 0) {
      return NextResponse.json(
        { error: "No URLs provided" },
        { status: 400 }
      );
    }

    const results = {
      imported: 0,
      skipped: 0,
      invalid: 0,
      errors: [] as string[],
    };

    for (const url of body.urls) {
      const trimmedUrl = url.trim();
      
      if (!trimmedUrl) {
        continue;
      }

      // Extract gamma ID from URL
      const extracted = extractGammaId(trimmedUrl);
      
      if (!extracted) {
        results.invalid++;
        results.errors.push(`Invalid URL: ${trimmedUrl}`);
        continue;
      }

      // Check if already imported
      const existing = await prisma.generatedContent.findFirst({
        where: {
          OR: [
            { gammaId: extracted.id },
            { gammaUrl: trimmedUrl },
          ],
        },
      });

      if (existing) {
        results.skipped++;
        continue;
      }

      // Extract title from URL
      const title = extractTitleFromUrl(trimmedUrl);

      // Determine content type from URL path
      const contentType = extracted.type === "embed" ? "presentation" : "document";

      // Create record
      try {
        await prisma.generatedContent.create({
          data: {
            title,
            contentType,
            gammaId: extracted.id,
            gammaUrl: trimmedUrl,
            status: "ready",
            source: "imported",
            importedAt: new Date(),
            platform: "gamma",
            text: "", // Required field, empty for imported content
          },
        });

        results.imported++;
      } catch (error) {
        console.error(`[Gamma] Import failed for ${trimmedUrl}:`, error);
        results.errors.push(`Failed to import: ${trimmedUrl}`);
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: results.imported > 0
        ? `Imported ${results.imported} item${results.imported !== 1 ? "s" : ""}${results.skipped > 0 ? `, skipped ${results.skipped} duplicate${results.skipped !== 1 ? "s" : ""}` : ""}${results.invalid > 0 ? `, ${results.invalid} invalid URL${results.invalid !== 1 ? "s" : ""}` : ""}`
        : "No items were imported",
    });
  } catch (error) {
    console.error("[Gamma] Import URL error:", error);
    return NextResponse.json(
      { error: "Failed to import URLs" },
      { status: 500 }
    );
  }
}

