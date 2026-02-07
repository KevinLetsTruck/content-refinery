import { NextResponse } from "next/server";
import {
  getSpaces,
  isConfigured,
} from "@/lib/social/mighty-networks";

/**
 * GET /api/mighty-networks/spaces
 *
 * List all spaces in the Mighty Networks community.
 * Used during setup to discover the space ID for the "News" space
 * (or any other target space).
 *
 * Returns:
 *   - spaces: Array of { id, name, slug, ... }
 *   - configured: Whether API token and space ID are set
 *   - tokenValid: Whether the token is actually working
 */
export async function GET() {
  try {
    if (!isConfigured()) {
      return NextResponse.json(
        {
          configured: false,
          tokenValid: false,
          spaces: [],
          message:
            "Mighty Networks not configured. Set MIGHTY_NETWORKS_API_TOKEN and MIGHTY_NETWORKS_SPACE_ID environment variables.",
        },
        { status: 200 }
      );
    }

    // Fetch spaces (this also validates the token)
    const spaces = await getSpaces();

    return NextResponse.json({
      configured: true,
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
