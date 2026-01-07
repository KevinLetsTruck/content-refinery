import { NextRequest, NextResponse } from "next/server";
import { getConstantContactClient } from "@/lib/constant-contact/client";

/**
 * GET /api/constantcontact
 * Get Constant Contact connection status and info
 */
export async function GET() {
  try {
    const client = getConstantContactClient();
    
    if (!client.isAuthenticated()) {
      return NextResponse.json({
        connected: false,
        message: "Not connected to Constant Contact",
        authUrl: "/api/auth/constantcontact",
      });
    }

    // Test the connection by fetching lists
    const lists = await client.getLists();

    return NextResponse.json({
      connected: true,
      listsCount: lists.length,
      lists: lists.map(l => ({
        id: l.list_id,
        name: l.name,
        memberCount: l.membership_count,
      })),
    });
  } catch (error) {
    console.error("[CC API] Status check error:", error);
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
      authUrl: "/api/auth/constantcontact",
    });
  }
}
