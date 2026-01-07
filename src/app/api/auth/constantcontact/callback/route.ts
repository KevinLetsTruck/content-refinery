import { NextRequest, NextResponse } from "next/server";
import { getConstantContactClient } from "@/lib/constant-contact/client";

/**
 * GET /api/auth/constantcontact/callback
 * Handles the OAuth callback from Constant Contact
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth errors
  if (error) {
    console.error("[CC OAuth] Error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(`/admin/settings?cc_error=${encodeURIComponent(errorDescription || error)}`, request.url)
    );
  }

  // Validate code
  if (!code) {
    return NextResponse.redirect(
      new URL("/admin/settings?cc_error=No+authorization+code+received", request.url)
    );
  }

  try {
    const client = getConstantContactClient();
    const tokens = await client.exchangeCodeForTokens(code);

    console.log("[CC OAuth] Successfully authenticated!");
    console.log("[CC OAuth] Token expires at:", new Date(tokens.expiresAt).toISOString());

    // Redirect to success page
    return NextResponse.redirect(
      new URL("/admin/settings?cc_success=true", request.url)
    );
  } catch (error) {
    console.error("[CC OAuth] Token exchange error:", error);
    return NextResponse.redirect(
      new URL(`/admin/settings?cc_error=${encodeURIComponent("Failed to complete authentication")}`, request.url)
    );
  }
}
