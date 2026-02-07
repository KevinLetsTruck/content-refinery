import { NextResponse } from "next/server";
import {
  getSpaces,
  isConfigured,
  hasToken,
} from "@/lib/social/mighty-networks";

/**
 * GET /api/mighty-networks/spaces
 *
 * List all spaces in the Mighty Networks community.
 * Used during setup to discover the space ID for the "News" space
 * (or any other target space).
 *
 * Only requires MIGHTY_NETWORKS_API_TOKEN — does NOT require SPACE_ID
 * since the whole point is to discover available space IDs.
 *
 * Returns:
 *   - spaces: Array of { id, name, slug, ... }
 *   - configured: Whether API token AND space ID are both set
 *   - tokenValid: Whether the token is actually working
 */
export async function GET() {
  try {
    // Only need the API token to list spaces — space ID is what we're discovering
    if (!hasToken()) {
      return NextResponse.json(
        {
          configured: false,
          tokenValid: false,
          spaces: [],
          message:
            "Mighty Networks API token not set. Set MIGHTY_NETWORKS_API_TOKEN environment variable.",
        },
        { status: 200 }
      );
    }

    // Fetch spaces (this also validates the token)
    const spaces = await getSpaces();

    return NextResponse.json({
      configured: isConfigured(), // true only if BOTH token and space ID are set
      tokenValid: true,
      spaces,
      currentSpaceId: process.env.MIGHTY_NETWORKS_SPACE_ID || null,
    });
  } catch (error) {
    console.error("[MightyNetworks] Spaces endpoint error:", error);

    return NextResponse.json(
      {
        configured: isConfigured(),
        tokenValid: false,
        spaces: [],
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch spaces from Mighty Networks",
      },
      { status: 200 }
    );
  }
}
