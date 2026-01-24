import { NextResponse } from "next/server";
import { getConnectionStatus, isConfigured } from "@/lib/social/meta";

/**
 * GET /api/meta/status
 *
 * Get detailed Meta (Facebook/Instagram) connection status
 */
export async function GET() {
  try {
    const configured = isConfigured();

    // If nothing is configured, return early
    if (!configured.facebook && !configured.instagram) {
      return NextResponse.json({
        configured: false,
        message: "Meta credentials not configured. Visit /api/auth/meta to connect.",
        connectUrl: "/api/auth/meta",
      });
    }

    // Get detailed status
    const status = await getConnectionStatus();

    return NextResponse.json({
      configured: true,
      ...status,
      connectUrl: "/api/auth/meta",
    });
  } catch (error) {
    console.error("[Meta Status] Error:", error);
    return NextResponse.json(
      {
        configured: false,
        error: error instanceof Error ? error.message : "Failed to check Meta status",
        connectUrl: "/api/auth/meta",
      },
      { status: 500 }
    );
  }
}
