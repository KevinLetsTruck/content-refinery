import { NextRequest, NextResponse } from "next/server";
import { getConstantContactClient } from "@/lib/constant-contact/client";
import { getBaseUrl } from "@/lib/config";

/**
 * GET /api/auth/constantcontact/callback
 * Handles the OAuth callback from Constant Contact
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const baseUrl = getBaseUrl();

  // Handle OAuth errors
  if (error) {
    console.error("[CC OAuth] Error:", error, errorDescription);
    return NextResponse.redirect(
      `${baseUrl}/admin/settings?cc_error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  // Validate code
  if (!code) {
    return NextResponse.redirect(
      `${baseUrl}/admin/settings?cc_error=No+authorization+code+received`
    );
  }

  try {
    const client = getConstantContactClient();
    const tokens = await client.exchangeCodeForTokens(code);

    console.log("[CC OAuth] Successfully authenticated!");
    console.log("[CC OAuth] Token expires at:", new Date(tokens.expiresAt).toISOString());

    // Redirect to success page
    return NextResponse.redirect(
      `${baseUrl}/admin/settings?cc_success=true`
    );
  } catch (error) {
    console.error("[CC OAuth] Token exchange error:", error);
    return NextResponse.redirect(
      `${baseUrl}/admin/settings?cc_error=${encodeURIComponent("Failed to complete authentication")}`
    );
  }
}
