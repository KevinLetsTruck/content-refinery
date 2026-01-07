import { NextRequest, NextResponse } from "next/server";
import { getConstantContactClient } from "@/lib/constant-contact/client";

/**
 * GET /api/auth/constantcontact
 * Initiates the OAuth flow by redirecting to Constant Contact
 */
export async function GET(request: NextRequest) {
  try {
    const client = getConstantContactClient();
    const authUrl = client.getAuthorizationUrl();
    
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("[CC OAuth] Error initiating flow:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth flow" },
      { status: 500 }
    );
  }
}
