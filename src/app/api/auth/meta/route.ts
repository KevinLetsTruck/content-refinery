import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/config";

/**
 * GET /api/auth/meta
 * Initiates Meta (Facebook/Instagram) OAuth flow
 *
 * Required permissions for publishing:
 * - pages_manage_posts: Post to Facebook Pages
 * - pages_read_engagement: Read page engagement metrics
 * - instagram_basic: Access Instagram account info
 * - instagram_content_publish: Publish to Instagram
 * - business_management: Access Business accounts
 */
export async function GET(request: NextRequest) {
  const appId = process.env.META_APP_ID;
  const baseUrl = getBaseUrl();
  const redirectUri = `${baseUrl}/api/auth/meta/callback`;

  if (!appId) {
    return NextResponse.json(
      { error: "META_APP_ID not configured" },
      { status: 500 }
    );
  }

  // Facebook OAuth scopes needed for page publishing
  // Note: Instagram scopes require App Review approval, so we only request Facebook for now
  const scopes = [
    "pages_show_list",           // List pages the user manages
    "pages_read_engagement",     // Read page engagement metrics
    "pages_manage_posts",        // Create and manage posts on Pages
  ].join(",");

  // Generate state for CSRF protection
  const state = Math.random().toString(36).substring(7);

  const authUrl = new URL("https://www.facebook.com/v18.0/dialog/oauth");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
