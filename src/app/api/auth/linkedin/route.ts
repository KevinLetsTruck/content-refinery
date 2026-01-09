import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/config";

/**
 * GET /api/auth/linkedin
 * Initiates LinkedIn OAuth flow - redirects user to LinkedIn authorization page
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const baseUrl = getBaseUrl();
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${baseUrl}/api/auth/linkedin/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: "LINKEDIN_CLIENT_ID not configured" },
      { status: 500 }
    );
  }

  // Scopes needed for posting (w_member_social comes with "Share on LinkedIn" product)
  const scopes = "w_member_social";

  // Generate state for CSRF protection
  const state = Math.random().toString(36).substring(7);

  const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
